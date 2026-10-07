import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Doctor from "../models/Doctor.js";

// ==========================================
// Generate Doctor JWT
// ==========================================
const generateDoctorToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    }
  );
};

// ==========================================
// Doctor Login
// POST /api/doctor/auth/login
// ==========================================
export const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    // --------------------------------------
    // Validate input
    // --------------------------------------
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // --------------------------------------
    // Find User
    // --------------------------------------
    const user = await User.findOne({
      email: normalizedEmail,
      role: "DOCTOR",
      active: true,
    }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // --------------------------------------
    // Check Password
    // --------------------------------------
    const passwordMatch = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ======================================
    // Find Doctor Profile
    // ======================================

    let doctor = await Doctor.findOne({
      userId: user._id,
    });

    // --------------------------------------
    // Fallback: find by doctor email
    // This helps link an existing doctor
    // profile if userId was not saved correctly.
    // --------------------------------------
    if (!doctor) {
      doctor = await Doctor.findOne({
        email: normalizedEmail,
      });

      // Automatically link the profile
      if (doctor) {
        doctor.userId = user._id;
        await doctor.save();
      }
    }

    // --------------------------------------
    // Still no doctor profile
    // --------------------------------------
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    // --------------------------------------
    // Check doctor active status
    // --------------------------------------
    if (!doctor.active) {
      return res.status(403).json({
        success: false,
        message: "Doctor account is inactive",
      });
    }

    // --------------------------------------
    // Generate token
    // --------------------------------------
    const token = generateDoctorToken(user);

    // --------------------------------------
    // Success
    // --------------------------------------
    return res.status(200).json({
      success: true,
      message: "Doctor login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },

      doctor: {
        id: doctor._id,
        userId: doctor.userId,
        name: doctor.name,
        specialization: doctor.specialization,
        qualification: doctor.qualification,
        registrationNumber: doctor.registrationNumber,
        phone: doctor.phone,
        email: doctor.email,
        department: doctor.department,
        active: doctor.active,
      },
    });
  } catch (error) {
    console.error("Doctor Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};