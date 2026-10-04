
import crypto from "crypto";
import jwt from "jsonwebtoken";
import Patient from "../models/Patient.js";

// Create a keyed Aadhaar hash
const hashAadhaar = (aadhaar) => {
  return crypto
    .createHmac("sha256", process.env.AADHAAR_HASH_SECRET)
    .update(aadhaar)
    .digest("hex");
};

// Generate JWT
const generateToken = (patient) => {
  return jwt.sign(
    {
      id: patient._id.toString(),
      role: "patient",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    }
  );
};

// Safe patient response
const patientResponse = (patient) => ({
  id: patient._id,
  name: patient.name,
  phone: patient.phone,
  dateOfBirth: patient.dateOfBirth,
  gender: patient.gender,
  address: patient.address,
  role: patient.role,
});

// Register Patient
export const registerPatient = async (req, res) => {
  try {
    const {
      name,
      phone,
      aadhaar,
      dateOfBirth,
      gender,
      address,
    } = req.body || {};

    if (!name || !phone || !aadhaar) {
      return res.status(400).json({
        success: false,
        message: "Name, phone and Aadhaar are required",
      });
    }

    const cleanName = String(name).trim();
    const cleanPhone = String(phone).trim();
    const cleanAadhaar = String(aadhaar).trim();

    if (!cleanName || cleanName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid patient name",
      });
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 10-digit mobile number",
      });
    }

    if (!/^\d{12}$/.test(cleanAadhaar)) {
      return res.status(400).json({
        success: false,
        message: "Aadhaar must contain 12 digits",
      });
    }

    const existingPatient = await Patient.findOne({
      $or: [
        { phone: cleanPhone },
        { aadhaarHash: hashAadhaar(cleanAadhaar) },
      ],
    });

    if (existingPatient) {
      return res.status(409).json({
        success: false,
        message: "Patient already registered",
      });
    }

    const patient = await Patient.create({
      name: cleanName,
      phone: cleanPhone,
      aadhaarHash: hashAadhaar(cleanAadhaar),
      dateOfBirth,
      gender,
      address,
    });

    const token = generateToken(patient);

    return res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      token,
      patient: patientResponse(patient),
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Patient already registered",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid patient information",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Login using phone and Aadhaar
export const loginPatient = async (req, res) => {
  try {
    const { phone, aadhaar } = req.body || {};

    if (!phone || !aadhaar) {
      return res.status(400).json({
        success: false,
        message: "Phone and Aadhaar are required",
      });
    }

    const cleanPhone = String(phone).trim();
    const cleanAadhaar = String(aadhaar).trim();

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 10-digit mobile number",
      });
    }

    if (!/^\d{12}$/.test(cleanAadhaar)) {
      return res.status(400).json({
        success: false,
        message: "Aadhaar must contain 12 digits",
      });
    }

    const patient = await Patient.findOne({
      phone: cleanPhone,
      aadhaarHash: hashAadhaar(cleanAadhaar),
    });

    if (!patient) {
      return res.status(401).json({
        success: false,
        message: "Invalid phone number or Aadhaar",
      });
    }

    const token = generateToken(patient);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      patient: patientResponse(patient),
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get logged-in patient's profile
export const getPatientProfile = async (req, res) => {
  try {
    const patient = await Patient.findById(req.user.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    return res.status(200).json({
      success: true,
      patient: patientResponse(patient),
    });
  } catch (error) {
    console.error("Profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};