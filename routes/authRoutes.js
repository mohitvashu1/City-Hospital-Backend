
import express from "express";
import rateLimit from "express-rate-limit";

import {
  registerPatient,
  loginPatient,
  getPatientProfile,
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again later.",
  },
});

router.post("/register", authLimiter, registerPatient);

router.post("/login", authLimiter, loginPatient);

router.get("/profile", protect, getPatientProfile);

export default router;