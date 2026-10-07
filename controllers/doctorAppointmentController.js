import Appointment from "../models/Appointment.js";

export const getTodayAppointments = async (req, res) => {
  try {
    const doctorUserId = req.user.id;

    // Find doctor profile using logged-in User ID
    const Doctor = (await import("../models/Doctor.js")).default;

    const doctor = await Doctor.findOne({
      userId: doctorUserId,
      active: true,
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    // Start and end of today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      doctorId: doctor._id,
      appointmentDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: {
        $ne: "CANCELLED",
      },
    })
      .populate(
        "patientId",
        "name phone dateOfBirth gender address"
      )
      .populate(
        "doctorId",
        "name specialization qualification department"
      )
      .sort({
        appointmentTime: 1,
      });

    return res.status(200).json({
      success: true,
      date: startOfDay.toISOString().split("T")[0],
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    console.error("Get today's appointments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch today's appointments",
      error: error.message,
    });
  }
};