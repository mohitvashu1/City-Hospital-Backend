import express from "express";

import { doctorProtect } from "../middleware/doctorMiddleware.js";

import {
  getPatientDetails,
} from "../controllers/doctorPatientController.js";

const router = express.Router();

// GET /api/doctor/patients/:patientId
router.get(
  "/:patientId",
  doctorProtect,
  getPatientDetails
);

export default router;