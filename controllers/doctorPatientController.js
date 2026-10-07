import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";

export const getPatientDetails = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Logged-in doctor
    const doctor = await Doctor.findOne({
      userId: req.user.id,
      active: true,
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    // Find patient
    const patient = await Patient.findById(patientId).select(
      "-aadhaarHash"
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Get this patient's appointments with this doctor
    const appointments = await Appointment.find({
      patientId: patient._id,
      doctorId: doctor._id,
    })
      .populate(
        "doctorId",
        "name specialization qualification department"
      )
      .sort({
        appointmentDate: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,

      patient: {
        id: patient._id,
        name: patient.name,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        address: patient.address,
        role: patient.role,
        createdAt: patient.createdAt,
      },

      appointments,
    });
  } catch (error) {
    console.error("Get patient details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch patient details",
      error: error.message,
    });
  }
};