import mongoose from "mongoose";
import Admission from "../models/Admission.js";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";

const getActiveDoctor = async (userId) =>
  Doctor.findOne({ userId, active: true });

export const listDoctorAdmissions = async (req, res) => {
  try {
    const doctor = await getActiveDoctor(req.user.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor profile not found" });
    }

    const admissions = await Admission.find({ admittedByDoctorId: doctor._id })
      .populate("patientId", "name phone gender dateOfBirth address")
      .sort({ admissionDate: -1 })
      .limit(300)
      .lean();

    return res.json({ success: true, admissions });
  } catch (error) {
    console.error("Doctor admissions list error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load admissions" });
  }
};

export const createDoctorAdmission = async (req, res) => {
  try {
    const doctor = await getActiveDoctor(req.user.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor profile not found" });
    }

    const { patientId, ward, bedNumber, reason, admissionDate } = req.body || {};
    if (!mongoose.isValidObjectId(patientId)) {
      return res.status(400).json({ success: false, message: "Select a valid patient" });
    }

    const cleanWard = String(ward || "").trim();
    const cleanBed = String(bedNumber || "").trim();
    const cleanReason = String(reason || "").trim();
    if (!cleanWard || cleanWard.length > 80 || !cleanBed || cleanBed.length > 30 || cleanReason.length > 500) {
      return res.status(400).json({ success: false, message: "Enter a valid ward, bed number and reason" });
    }

    const patient = await Patient.findById(patientId).select("_id");
    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    // A doctor may admit only a patient who has an appointment assigned to them.
    const hasDoctorVisit = await Appointment.exists({
      patientId: patient._id,
      doctorId: doctor._id,
      status: { $ne: "CANCELLED" },
    });
    if (!hasDoctorVisit) {
      return res.status(403).json({ success: false, message: "You can admit only patients assigned to your care" });
    }

    const occupied = await Admission.exists({
      ward: cleanWard,
      bedNumber: cleanBed,
      status: "ADMITTED",
    });
    if (occupied) {
      return res.status(409).json({ success: false, message: "This bed is already occupied" });
    }

    const parsedDate = admissionDate ? new Date(admissionDate) : new Date();
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid admission date" });
    }

    const admission = await Admission.create({
      patientId: patient._id,
      admittedByDoctorId: doctor._id,
      ward: cleanWard,
      bedNumber: cleanBed,
      reason: cleanReason,
      admissionDate: parsedDate,
      status: "ADMITTED",
    });

    const populated = await Admission.findById(admission._id)
      .populate("patientId", "name phone gender")
      .lean();

    return res.status(201).json({ success: true, message: "Patient admitted successfully", admission: populated });
  } catch (error) {
    console.error("Doctor admission create error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to admit patient" });
  }
};

export const dischargeDoctorAdmission = async (req, res) => {
  try {
    const doctor = await getActiveDoctor(req.user.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor profile not found" });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid admission ID" });
    }

    const admission = await Admission.findOne({
      _id: req.params.id,
      admittedByDoctorId: doctor._id,
    });

    if (!admission) {
      return res.status(404).json({ success: false, message: "Admission not found for this doctor" });
    }
    if (admission.status === "DISCHARGED") {
      return res.status(409).json({ success: false, message: "Patient is already discharged" });
    }

    admission.status = "DISCHARGED";
    admission.dischargeDate = new Date();
    await admission.save();

    return res.json({ success: true, message: "Patient discharged successfully", admission });
  } catch (error) {
    console.error("Doctor discharge error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to discharge patient" });
  }
};
