import express from "express";
import { doctorProtect } from "../middleware/doctorMiddleware.js";
import {
  listDoctorAdmissions,
  createDoctorAdmission,
  dischargeDoctorAdmission,
} from "../controllers/doctorAdmissionController.js";

const router = express.Router();

router.use(doctorProtect);
router.get("/", listDoctorAdmissions);
router.post("/", createDoctorAdmission);
router.patch("/:id/discharge", dischargeDoctorAdmission);

export default router;
