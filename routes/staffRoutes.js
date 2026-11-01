import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Admission from "../models/Admission.js";
import crypto from "crypto";
import generateAppointmentId from "../utils/generateAppointmentId.js";

const router = express.Router();

router.use(authenticateToken, allowRoles("RECEPTIONIST"));

const hashAadhaar = (aadhaar) =>
  crypto.createHmac("sha256", process.env.AADHAAR_HASH_SECRET)
    .update(aadhaar)
    .digest("hex");

// Appointment search/filter endpoint. Existing /appointments/today remains compatible.
router.get("/appointments", async (req, res) => {
  try {
    const filter = {};
    if (req.query.date) {
      const date = new Date(`${req.query.date}T00:00:00`);
      if (Number.isNaN(date.getTime())) return res.status(400).json({ success: false, message: "Invalid date" });
      const end = new Date(date); end.setDate(end.getDate() + 1);
      filter.appointmentDate = { $gte: date, $lt: end };
    }
    if (req.query.status && req.query.status !== "ALL") filter.status = String(req.query.status).toUpperCase();
    if (req.query.feeStatus && req.query.feeStatus !== "ALL") filter["feePayment.status"] = String(req.query.feeStatus).toUpperCase();
    const appointments = await Appointment.find(filter)
      .populate("patientId", "name phone gender dateOfBirth address")
      .populate("doctorId", "name specialization department")
      .sort({ appointmentDate: -1, appointmentTime: 1 }).limit(500).lean();
    return res.json({ success: true, appointments });
  } catch (error) {
    console.error("Staff filtered appointments error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to filter appointments" });
  }
});

// Register a patient from reception. Aadhaar is HMAC-hashed and never persisted in plain text.
router.post("/patients", async (req, res) => {
  try {
    const { name, phone, aadhaar, dateOfBirth, gender, address } = req.body || {};
    const cleanName = String(name || "").trim();
    const cleanPhone = String(phone || "").trim();
    const cleanAadhaar = String(aadhaar || "").replace(/\s/g, "");
    if (!cleanName || cleanName.length > 100) return res.status(400).json({ success: false, message: "Enter a valid patient name" });
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) return res.status(400).json({ success: false, message: "Enter a valid 10-digit phone number" });
    if (!/^\d{12}$/.test(cleanAadhaar)) return res.status(400).json({ success: false, message: "Aadhaar must contain 12 digits" });
    if (!process.env.AADHAAR_HASH_SECRET) return res.status(500).json({ success: false, message: "Patient registration is not configured" });
    const aadhaarHash = hashAadhaar(cleanAadhaar);
    const duplicate = await Patient.findOne({ $or: [{ phone: cleanPhone }, { aadhaarHash }] });
    if (duplicate) return res.status(409).json({ success: false, message: "Patient already exists. Search by phone to select the existing record." });
    const patient = await Patient.create({ name: cleanName, phone: cleanPhone, aadhaarHash, dateOfBirth: dateOfBirth || undefined, gender: gender || undefined, address: address || undefined });
    return res.status(201).json({ success: true, message: "Patient registered", patient: { _id: patient._id, name: patient.name, phone: patient.phone, gender: patient.gender, dateOfBirth: patient.dateOfBirth, address: patient.address } });
  } catch (error) {
    console.error("Staff patient registration error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to register patient" });
  }
});

// Patient details page/view endpoint.
router.get("/patients/:id", async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({ success: false, message: "Invalid patient ID" });
    const patient = await Patient.findById(req.params.id).select("name phone gender dateOfBirth address createdAt").lean();
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
    const appointments = await Appointment.find({ patientId: patient._id })
      .populate("doctorId", "name specialization").sort({ appointmentDate: -1 }).limit(100).lean();
    const admissions = await Admission.find({ patientId: patient._id }).sort({ admissionDate: -1 }).lean();
    return res.json({ success: true, patient, appointments, admissions });
  } catch (error) {
    console.error("Staff patient detail error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load patient details" });
  }
});

// Book an appointment for an existing patient or register a new patient first.
router.post("/appointments", async (req, res) => {
  try {
    const { patientId, newPatient, doctorId, appointmentDate, appointmentTime, reason } = req.body || {};
    let patient;
    if (patientId) {
      if (!/^[a-f\d]{24}$/i.test(String(patientId))) return res.status(400).json({ success: false, message: "Select a valid patient" });
      patient = await Patient.findById(patientId);
      if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
    } else if (newPatient) {
      const { name, phone, aadhaar, dateOfBirth, gender, address } = newPatient;
      const cleanAadhaar = String(aadhaar || "").replace(/\s/g, "");
      const cleanPhone = String(phone || "").trim();
      if (!String(name || "").trim() || !/^[6-9]\d{9}$/.test(cleanPhone) || !/^\d{12}$/.test(cleanAadhaar)) {
        return res.status(400).json({ success: false, message: "New patient requires name, valid phone and 12-digit Aadhaar" });
      }
      const aadhaarHash = hashAadhaar(cleanAadhaar);
      const duplicate = await Patient.findOne({ $or: [{ phone: cleanPhone }, { aadhaarHash }] });
      if (duplicate) return res.status(409).json({ success: false, message: "Patient already exists. Search and select the existing patient instead." });
      patient = await Patient.create({ name: String(name).trim(), phone: cleanPhone, aadhaarHash, dateOfBirth: dateOfBirth || undefined, gender: gender || undefined, address: address || undefined });
    } else {
      return res.status(400).json({ success: false, message: "Select an existing patient or enter new patient details" });
    }
    if (!/^[a-f\d]{24}$/i.test(String(doctorId || ""))) return res.status(400).json({ success: false, message: "Select a doctor" });
    const doctor = await Doctor.findOne({ _id: doctorId, active: true });
    if (!doctor) return res.status(404).json({ success: false, message: "Active doctor not found" });
    const date = new Date(appointmentDate);
    if (!appointmentDate || Number.isNaN(date.getTime()) || !appointmentTime) return res.status(400).json({ success: false, message: "Appointment date and time are required" });
    const appointment = await Appointment.create({
      appointmentId: generateAppointmentId(),
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentDate: date,
      appointmentTime: String(appointmentTime).trim(),
      reason: String(reason || "").trim(),
      status: "BOOKED",
      feePayment: { status: "NOT_PAID", amount: 0 },
    });
    return res.status(201).json({ success: true, message: "Appointment booked", appointment });
  } catch (error) {
    console.error("Staff appointment booking error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to book appointment" });
  }
});

// Admissions list and create. Reception can admit an existing patient or register a new one inline.
router.get("/admissions", async (_req, res) => {
  try {
    const admissions = await Admission.find().populate("patientId", "name phone gender").sort({ admissionDate: -1 }).limit(300).lean();
    return res.json({ success: true, admissions });
  } catch (error) {
    console.error("Staff admissions error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load admissions" });
  }
});

router.post("/admissions", async (req, res) => {
  try {
    const { patientId, newPatient, ward, bedNumber, reason, admissionDate } = req.body || {};
    let patient;
    if (patientId) {
      if (!/^[a-f\d]{24}$/i.test(String(patientId))) return res.status(400).json({ success: false, message: "Select a valid patient" });
      patient = await Patient.findById(patientId);
      if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
    } else if (newPatient) {
      const { name, phone, aadhaar, dateOfBirth, gender, address } = newPatient;
      const cleanPhone = String(phone || "").trim();
      const cleanAadhaar = String(aadhaar || "").replace(/\s/g, "");
      if (!String(name || "").trim() || !/^[6-9]\d{9}$/.test(cleanPhone) || !/^\d{12}$/.test(cleanAadhaar)) return res.status(400).json({ success: false, message: "New patient requires name, valid phone and 12-digit Aadhaar" });
      const aadhaarHash = hashAadhaar(cleanAadhaar);
      const duplicate = await Patient.findOne({ $or: [{ phone: cleanPhone }, { aadhaarHash }] });
      if (duplicate) return res.status(409).json({ success: false, message: "Patient already exists. Search and select the existing patient instead." });
      patient = await Patient.create({ name: String(name).trim(), phone: cleanPhone, aadhaarHash, dateOfBirth: dateOfBirth || undefined, gender: gender || undefined, address: address || undefined });
    } else return res.status(400).json({ success: false, message: "Select an existing patient or enter new patient details" });
    if (!String(ward || "").trim() || !String(bedNumber || "").trim()) return res.status(400).json({ success: false, message: "Ward and bed number are required" });
    const admission = await Admission.create({ patientId: patient._id, ward, bedNumber, reason, admissionDate: admissionDate || new Date(), status: "ADMITTED" });
    return res.status(201).json({ success: true, message: "Patient admitted", admission });
  } catch (error) {
    console.error("Staff admission create error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to admit patient" });
  }
});


// Reception staff can see only the basic patient fields needed at the desk.
router.get("/patients", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().slice(0, 80);
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter = q ? { $or: [{ name: { $regex: escaped, $options: "i" } }, { phone: { $regex: escaped } }] } : {};
    const patients = await Patient.find(filter).select("name phone gender dateOfBirth createdAt").sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ success: true, patients });
  } catch (error) {
    console.error("Staff patient search error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to search patient records" });
  }
});

router.get("/appointments/today", async (_req, res) => {
  try {
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    const appointments = await Appointment.find({ appointmentDate: { $gte: start, $lte: end } })
      .populate("patientId", "name phone")
      .populate("doctorId", "name specialization")
      .sort({ appointmentTime: 1 }).limit(500).lean();
    return res.json({ success: true, date: start.toISOString().slice(0, 10), appointments });
  } catch (error) {
    console.error("Staff appointments error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load today's appointments" });
  }
});

router.patch("/appointments/:id/status", async (req, res) => {
  try {
    const status = String(req.body?.status || "").toUpperCase();
    // Reception may place a booked patient in the waiting queue. Clinical statuses are controlled by doctors.
    if (status !== "WAITING") return res.status(400).json({ success: false, message: "Reception staff may only mark booked appointments as waiting" });
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, status: "BOOKED" },
      { $set: { status: "WAITING" } },
      { new: true, runValidators: true }
    );
    if (!appointment) return res.status(404).json({ success: false, message: "Booked appointment not found or it has already changed status" });
    return res.json({ success: true, message: "Appointment marked as waiting", appointment: { id: appointment._id, status: appointment.status } });
  } catch (error) {
    console.error("Staff appointment status error:", error.message);
    return res.status(400).json({ success: false, message: "Unable to update appointment status" });
  }
});


// Reception can record a fee payment, but cannot edit clinical visit status.
router.patch("/appointments/:id/fee", async (req, res) => {
  try {
    const requestedStatus = String(req.body?.status || "").toUpperCase();
    const amount = Number(req.body?.amount);
    const method = String(req.body?.method || "").toUpperCase();

    if (requestedStatus !== "PAID") {
      return res.status(400).json({ success: false, message: "Only marking a received fee as PAID is supported." });
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
      return res.status(400).json({ success: false, message: "Enter a valid payment amount greater than ₹0." });
    }
    if (!["CASH", "UPI", "CARD"].includes(method)) {
      return res.status(400).json({ success: false, message: "Payment method must be CASH, UPI, or CARD." });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }
    if (String(appointment.status).toUpperCase() === "CANCELLED") {
      return res.status(400).json({ success: false, message: "Cannot collect a fee for a cancelled appointment." });
    }
    if (String(appointment.feePayment?.status || "NOT_PAID").toUpperCase() === "PAID") {
      return res.status(409).json({ success: false, message: "This appointment's fee is already recorded as paid." });
    }

    appointment.feePayment = {
      status: "PAID",
      amount,
      method,
      paidAt: new Date(),
      receivedBy: req.user.id,
    };
    await appointment.save();

    return res.json({
      success: true,
      message: "Fee payment recorded successfully.",
      feePayment: appointment.feePayment,
    });
  } catch (error) {
    console.error("Staff fee payment error:", error.message);
    return res.status(400).json({ success: false, message: "Unable to record fee payment." });
  }
});


// Discharge an admitted patient. The URL parameter must be the Admission document _id.
router.patch("/admissions/:id/discharge", async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid admission ID" });
    }

    const admission = await Admission.findById(id);
    if (!admission) {
      return res.status(404).json({ success: false, message: "Admission record not found" });
    }
    if (admission.status === "DISCHARGED") {
      return res.status(409).json({ success: false, message: "This patient has already been discharged" });
    }

    admission.status = "DISCHARGED";
    admission.dischargeDate = new Date();
    await admission.save();

    return res.status(200).json({
      success: true,
      message: "Patient discharged successfully",
      admission,
    });
  } catch (error) {
    console.error("Staff discharge error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to discharge patient" });
  }
});

export default router;
