
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

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: "Appointment ID is required",
      });
    }

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

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (String(appointment.doctorId) !== String(doctor._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized for this appointment",
      });
    }

    const existingConsultation = await Consultation.findOne({
      appointmentId: appointment._id,
    });

    if (existingConsultation) {
      return res.status(409).json({
        success: false,
        message: "Consultation already exists for this appointment",
        consultation: existingConsultation,
      });
    }

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

    appointment.status = "IN_CONSULTATION";
    await appointment.save();

    const populatedConsultation = await Consultation.findById(
      consultation._id
    )
      .populate("patientId", "name phone dateOfBirth gender address")
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
    console.error("Create consultation error:", error);

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
      .populate("patientId", "name phone dateOfBirth gender address")
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

// PATCH /api/doctor/consultations/:consultationId
// Update a draft or correct an already finalized consultation.
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

    const wasFinalized = consultation.status === "FINALIZED";

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
      message: wasFinalized
        ? "Finalized consultation corrections saved successfully"
        : "Consultation draft updated successfully",
      consultation: updatedConsultation,
    });
  } catch (error) {
    console.error("Update consultation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update consultation",
    });
  }
};

// PATCH /api/doctor/consultations/:consultationId/finalize
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

// GET /api/doctor/consultations/appointment/:appointmentId
export const getConsultationByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

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

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (String(appointment.doctorId) !== String(doctor._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized for this appointment",
      });
    }

    const consultation = await Consultation.findOne({
      appointmentId: appointment._id,
      doctorId: doctor._id,
    })
      .populate("patientId", "name phone dateOfBirth gender address")
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
        message: "No consultation exists for this appointment yet",
      });
    }

    return res.status(200).json({
      success: true,
      consultation,
    });
  } catch (error) {
    console.error("Get consultation by appointment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch consultation",
    });
  }
};

// GET /api/doctor/consultations/patient/:patientId
export const getPatientConsultations = async (req, res) => {
  try {
    const { patientId } = req.params;

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

    const consultations = await Consultation.find({
      patientId,
      doctorId: doctor._id,
    })
      .sort({ createdAt: -1 })
      .populate(
        "appointmentId",
        "appointmentId appointmentDate appointmentTime status reason"
      )
      .select(
        "symptoms vitals examination diagnosis tests medicines advice followUpDate status createdAt updatedAt appointmentId"
      );

    return res.status(200).json({
      success: true,
      consultations,
    });
  } catch (error) {
    console.error("Get patient consultations error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch patient consultations",
    });
  }
};
