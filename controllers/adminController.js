import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import bcrypt from "bcryptjs";

export const getAdminOverview = async (req, res) => {
  try {
    const [patients, doctors, staff, appointments] = await Promise.all([
      Patient.countDocuments(),
      Doctor.countDocuments(),
      User.countDocuments({ role: { $in: ["RECEPTIONIST"] } }),
      Appointment.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      overview: { patients, doctors, staff, appointments },
    });
  } catch (error) {
    console.error("Admin overview error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to load dashboard overview",
    });
  }
};

export const listManagedUsers = async (req, res) => {
  try {
    const users = await User.find({
      role: { $in: ["DOCTOR", "RECEPTIONIST"] },
    })
      .select("name email role active createdAt")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Admin users error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load users" });
  }
};

export const createStaffAccount = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const role = String(req.body?.role || "RECEPTIONIST");

    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid name and email" });
    }
    if (role !== "RECEPTIONIST") {
      return res.status(400).json({
        success: false,
        message: "For this phase, only Receptionist accounts can be created here",
      });
    }
    if (password.length < 12 || password.length > 128) {
      return res.status(400).json({ success: false, message: "Password must be 12–128 characters" });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ success: false, message: "Email is already registered" });
    }

    const user = await User.create({
      name,
      email,
      role,
      active: true,
      passwordHash: await bcrypt.hash(password, 12),
    });

    return res.status(201).json({
      success: true,
      message: "Receptionist account created",
      user: { id: user._id, name: user.name, email: user.email, role: user.role, active: user.active },
    });
  } catch (error) {
    console.error("Create staff error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to create staff account" });
  }
};
