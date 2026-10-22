import express from "express";
import rateLimit from "express-rate-limit";
import { loginManagementUser } from "../controllers/managementAuthController.js";

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Try again later." },
});

router.post("/login", loginLimiter, loginManagementUser("RECEPTIONIST"));

export default router;
