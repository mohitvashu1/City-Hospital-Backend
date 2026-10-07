import express from "express";

import { doctorProtect } from "../middleware/doctorMiddleware.js";

import {
  getTodayAppointments,
} from "../controllers/doctorAppointmentController.js";

const router = express.Router();

// GET /api/doctor/appointments/today
router.get(
  "/today",
  doctorProtect,
  getTodayAppointments
);

export default router;