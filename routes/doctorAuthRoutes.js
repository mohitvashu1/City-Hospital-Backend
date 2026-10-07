import express from "express";

import { loginDoctor } from "../controllers/doctorAuthController.js";
import { doctorProtect } from "../middleware/doctorMiddleware.js";

const router = express.Router();

// ==========================================
// Doctor Login
// POST /api/doctor/auth/login
// ==========================================
router.post("/login", loginDoctor);

// ==========================================
// Doctor Profile Test
// GET /api/doctor/auth/profile
// ==========================================
router.get("/profile", doctorProtect, async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Doctor authentication working",
    user: req.user,
  });
});

export default router;