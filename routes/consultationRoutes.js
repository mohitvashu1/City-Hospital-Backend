
import express from "express";
import { doctorProtect } from "../middleware/doctorMiddleware.js";

import {
  createConsultation,
  finalizeConsultation,
  getConsultationById,
  getConsultationByAppointment,
  getPatientConsultations,
  updateConsultationDraft,
} from "../controllers/consultationController.js";

const router = express.Router();

// Create consultation
// POST /api/doctor/consultations
router.post("/", doctorProtect, createConsultation);

// Keep named routes above /:consultationId
// GET /api/doctor/consultations/appointment/:appointmentId
router.get(
  "/appointment/:appointmentId",
  doctorProtect,
  getConsultationByAppointment
);

// GET /api/doctor/consultations/patient/:patientId
router.get(
  "/patient/:patientId",
  doctorProtect,
  getPatientConsultations
);

// GET /api/doctor/consultations/:consultationId
router.get(
  "/:consultationId",
  doctorProtect,
  getConsultationById
);

// Update draft or correct finalized consultation
// PATCH /api/doctor/consultations/:consultationId
router.patch(
  "/:consultationId",
  doctorProtect,
  updateConsultationDraft
);

// Finalize consultation
// PATCH /api/doctor/consultations/:consultationId/finalize
router.patch(
  "/:consultationId/finalize",
  doctorProtect,
  finalizeConsultation
);

export default router;
