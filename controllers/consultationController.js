import Consultation from "../models/Consultation.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";

export const createConsultation = async (req, res) => {
  try {
    const {
      appointmentId,
      symptoms,
      vitals,
      examination,
      diagnosis,
      tests,
      medicines,
      advice,
      followUpDate,
    } = req.body;

    // ==========================================
    // Validate appointment ID
    // ==========================================

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: "Appointment ID is required",
      });
    }

    // ==========================================
    // Find logged-in doctor
    // ==========================================

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

    // ==========================================
    // Find appointment
    // ==========================================

    const appointment = await Appointment.findById(
      appointmentId
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // ==========================================
    // Make sure appointment belongs to doctor
    // ==========================================

    if (
      appointment.doctorId.toString() !==
      doctor._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized for this appointment",
      });
    }

    // ==========================================
    // Prevent duplicate consultation
    // ==========================================

    const existingConsultation =
      await Consultation.findOne({
        appointmentId: appointment._id,
      });

    if (existingConsultation) {
      return res.status(409).json({
        success: false,
        message: "Consultation already exists for this appointment",
        consultation: existingConsultation,
      });
    }

    // ==========================================
    // Create consultation
    // ==========================================

    const consultation = await Consultation.create({
      patientId: appointment.patientId,
      doctorId: doctor._id,
      appointmentId: appointment._id,

      symptoms: symptoms || [],

      vitals: {
        temperature: vitals?.temperature,
        bloodPressure: vitals?.bloodPressure,
        pulse: vitals?.pulse,
        spo2: vitals?.spo2,
        weight: vitals?.weight,
      },

      examination: examination || "",

      diagnosis: diagnosis || [],

      tests: tests || [],

      medicines: medicines || [],

      advice: advice || "",

      followUpDate: followUpDate || null,

      status: "DRAFT",
    });

    // ==========================================
    // Update appointment status
    // ==========================================

    appointment.status = "IN_CONSULTATION";
    await appointment.save();

    // ==========================================
    // Populate response
    // ==========================================

    const populatedConsultation =
      await Consultation.findById(consultation._id)
        .populate(
          "patientId",
          "name phone dateOfBirth gender address"
        )
        .populate(
          "doctorId",
          "name specialization qualification registrationNumber department"
        )
        .populate(
          "appointmentId",
          "appointmentId appointmentDate appointmentTime status reason"
        );

    return res.status(201).json({
      success: true,
      message: "Consultation created successfully",
      consultation: populatedConsultation,
    });
  } catch (error) {
    console.error(
      "Create consultation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create consultation",
      error: error.message,
    });
  }
};  

// GET /api/doctor/consultations/:consultationId
export const getConsultationById = async (req, res) => {
  try {
    const { consultationId } = req.params;

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

    const consultation = await Consultation.findOne({
      _id: consultationId,
      doctorId: doctor._id,
    })
      .populate(
        "patientId",
        "name phone dateOfBirth gender address"
      )
      .populate(
        "doctorId",
        "name specialization qualification department"
      )
      .populate(
        "appointmentId",
        "appointmentId appointmentDate appointmentTime status reason"
      );

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: "Consultation not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Consultation fetched successfully",
      consultation,
    });
  } catch (error) {
    console.error("Get consultation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch consultation",
    });
  }
};


export const updateConsultationDraft = async (req, res) => {
  try {
    const { consultationId } = req.params;

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

    const consultation = await Consultation.findOne({
      _id: consultationId,
      doctorId: doctor._id,
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: "Consultation not found",
      });
    }

    if (consultation.status !== "DRAFT") {
      return res.status(409).json({
        success: false,
        message: "Only draft consultations can be updated",
      });
    }

    const allowedFields = [
      "symptoms",
      "vitals",
      "examination",
      "diagnosis",
      "tests",
      "medicines",
      "advice",
      "followUpDate",
    ];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        consultation.set(field, req.body[field]);
      }
    }

    await consultation.save();

    const updatedConsultation = await Consultation.findById(
      consultation._id
    )
      .populate("patientId", "name phone dateOfBirth gender address")
      .populate(
        "doctorId",
        "name specialization qualification department"
      )
      .populate(
        "appointmentId",
        "appointmentId appointmentDate appointmentTime status reason"
      );

    return res.status(200).json({
      success: true,
      message: "Consultation draft updated successfully",
      consultation: updatedConsultation,
    });
  } catch (error) {
    console.error("Update consultation draft error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update consultation draft",
    });
  }
};

export const finalizeConsultation = async (req, res) => {
  try {
    const { consultationId } = req.params;

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

    const consultation = await Consultation.findOne({
      _id: consultationId,
      doctorId: doctor._id,
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: "Consultation not found",
      });
    }

    if (consultation.status === "FINALIZED") {
      return res.status(409).json({
        success: false,
        message: "Consultation is already finalized",
      });
    }

    consultation.status = "FINALIZED";
    await consultation.save();

    const appointment = await Appointment.findById(
      consultation.appointmentId
    );

    if (appointment) {
      appointment.status = "COMPLETED";
      await appointment.save();
    }

    return res.status(200).json({
      success: true,
      message: "Consultation finalized successfully",
      consultationId: consultation._id,
      status: consultation.status,
    });
  } catch (error) {
    console.error("Finalize consultation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to finalize consultation",
    });
  }
};

