import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const createToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

const safeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export const loginManagementUser = (expectedRole) => async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email,
      role: expectedRole,
      active: true,
    }).select("+passwordHash");

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: createToken(user),
      user: safeUser(user),
    });
  } catch (error) {
    console.error("Management login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to sign in right now",
    });
  }
};

// One-time bootstrap: works only while there is no SUPER_ADMIN account.
// Protect with a long random BOOTSTRAP_ADMIN_KEY in backend .env.
// Remove/rotate the key after creating the first admin.
export const bootstrapSuperAdmin = async (req, res) => {
  try {
    const configuredKey = process.env.BOOTSTRAP_ADMIN_KEY;
    const suppliedKey = String(req.headers["x-bootstrap-key"] || "");

    if (!configuredKey || suppliedKey.length < 20 || suppliedKey !== configuredKey) {
      return res.status(403).json({
        success: false,
        message: "Bootstrap authorization failed",
      });
    }

    const existingAdmin = await User.exists({ role: "SUPER_ADMIN" });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "A Super Admin already exists. Bootstrap is closed.",
      });
    }

    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid name and email",
      });
    }

    if (password.length < 12 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must be 12–128 characters",
      });
    }

    const duplicate = await User.exists({ email });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "SUPER_ADMIN",
      active: true,
    });

    return res.status(201).json({
      success: true,
      message: "First Super Admin created. Remove or rotate BOOTSTRAP_ADMIN_KEY now.",
      user: safeUser(user),
    });
  } catch (error) {
    console.error("Super Admin bootstrap error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to create Super Admin",
    });
  }
};
