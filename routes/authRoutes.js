
import express from "express";

import {
  registerPatient,
  loginPatient,
  getPatientProfile,
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerPatient);
router.post("/login", loginPatient);
router.get("/profile", protect, getPatientProfile);

export default router;
