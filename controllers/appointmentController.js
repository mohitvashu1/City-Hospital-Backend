import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import generateAppointmentId from "../utils/generateAppointmentId.js";

// Create Appointment
export const createAppointment = async (req, res) => {
  try {
    const {
      doctorId,
      appointmentDate,
      appointmentTime,
      reason,
    } = req.body;

    // Patient comes from JWT
    const patientId = req.user.id;

    if (
      !doctorId ||
      !appointmentDate ||
      !appointmentTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Doctor, appointment date and appointment time are required",
      });
    }

    // Check doctor
    const doctor = await Doctor.findOne({
      _id: doctorId,
      active: true,
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Prevent same doctor/time double booking
    const existingAppointment =
      await Appointment.findOne({
        doctorId,
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        status: {
          $nin: ["CANCELLED"],
        },
      });

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        message:
          "This appointment slot is already booked",
      });
    }

    const appointment =
      await Appointment.create({
        appointmentId:
          generateAppointmentId(),

        patientId,

        doctorId,

        appointmentDate:
          new Date(appointmentDate),

        appointmentTime,

        reason,

        status: "BOOKED",
      });

    const populatedAppointment =
      await Appointment.findById(
        appointment._id
      )
        .populate(
          "doctorId",
          "name specialization qualification department"
        )
        .populate(
          "patientId",
          "name phone"
        );

    return res.status(201).json({
      success: true,
      message:
        "Appointment booked successfully",

      appointment:
        populatedAppointment,
    });
  } catch (error) {
    console.error(
      "Create appointment error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getMyAppointments = async (
  req,
  res
) => {
  try {
    const patientId = req.user.id;

    const appointments =
      await Appointment.find({
        patientId,
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
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    console.error(
      "Get appointments error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};