import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },

    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },

    appointmentDate: {
      type: Date,
      required: true,
      index: true,
    },

    appointmentTime: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "BOOKED",
        "WAITING",
        "IN_CONSULTATION",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "BOOKED",
      index: true,
    },

    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // OPD fee belongs to an individual appointment/visit.
    feePayment: {
      status: {
        type: String,
        enum: ["NOT_PAID", "PAID"],
        default: "NOT_PAID",
        index: true,
      },
      amount: {
        type: Number,
        min: 0,
        default: 0,
      },
      method: {
        type: String,
        enum: ["CASH", "UPI", "CARD"],
      },
      paidAt: Date,
      receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
  },
  {
    timestamps: true,
  }
);

const Appointment = mongoose.model(
  "Appointment",
  appointmentSchema
);

export default Appointment;