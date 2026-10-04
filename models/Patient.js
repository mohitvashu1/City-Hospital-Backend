
import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^[6-9]\d{9}$/,
    },

    // Never store the plain Aadhaar number
    aadhaarHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },

    dateOfBirth: {
      type: Date,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },

    address: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    role: {
      type: String,
      enum: ["patient"],
      default: "patient",
      immutable: true,
    },
  },
  {
    timestamps: true,
  }
);

const Patient = mongoose.model("Patient", patientSchema);

export default Patient;