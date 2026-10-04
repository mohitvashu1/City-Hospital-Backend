
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Patient from "../models/Patient.js";

const hashAadhaar = (aadhaar) => {
  return crypto
    .createHmac("sha256", process.env.AADHAAR_HASH_SECRET)
    .update(aadhaar)
    .digest("hex");
};

// Generate JWT
const generateToken = (patientId) => {
  return jwt.sign(
    { id: patientId, role: "patient" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
};

// Register Patient
export const registerPatient = async (req, res) => {
  try {
    const {
      name,
      phone,
      aadhaar,
      password,
      dateOfBirth,
      gender,
      address,
    } = req.body;

    if (!name || !phone || !aadhaar || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, Aadhaar and password are required",
      });
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 10-digit mobile number",
      });
    }

    if (!/^\d{12}$/.test(aadhaar)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 12-digit Aadhaar number",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const existingPatient = await Patient.findOne({ phone });

    if (existingPatient) {
      return res.status(409).json({
        success: false,
        message: "This mobile number is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const aadhaarHash = hashAadhaar(aadhaar);

    const patient = await Patient.create({
      name,
      phone,
      aadhaarHash,
      password: hashedPassword,
      dateOfBirth,
      gender,
      address,
    });

    const token = generateToken(patient._id);

    return res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      token,
      patient: {
        id: patient._id,
        name: patient.name,
        phone: patient.phone,
        role: patient.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Patient already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Login Patient
export const loginPatient = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone and password are required",
      });
    }

    const patient = await Patient.findOne({ phone })
      .select("+password");

    if (!patient) {
      return res.status(401).json({
        success: false,
        message: "Invalid phone number or password",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      patient.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid phone number or password",
      });
    }

    const token = generateToken(patient._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      patient: {
        id: patient._id,
        name: patient.name,
        phone: patient.phone,
        role: patient.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get logged-in patient profile
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
      patient: {
        id: patient._id,
        name: patient.name,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        address: patient.address,
        role: patient.role,
      },
    });
  } catch (error) {
    console.error("Profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
