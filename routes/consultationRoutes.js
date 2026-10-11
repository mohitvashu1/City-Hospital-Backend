import express from "express";

import { doctorProtect } from "../middleware/doctorMiddleware.js";

import {
  createConsultation,
   finalizeConsultation,
   getConsultationById,
   updateConsultationDraft,
} from "../controllers/consultationController.js";

const router = express.Router();

// ==========================================
// Create Consultation
// POST /api/doctor/consultations
// ==========================================

router.post(
  "/",
  doctorProtect,
  createConsultation
);

router.get(
  "/:consultationId",
  doctorProtect,
  getConsultationById
);

router.patch(
  "/:consultationId",
  doctorProtect,
  updateConsultationDraft
);

router.patch(
  "/:consultationId/finalize",
  doctorProtect,
  finalizeConsultation
);

export default router;