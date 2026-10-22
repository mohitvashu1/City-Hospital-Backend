import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import {
  createAdmission, createDoctorAccount, createStaffAccount, dischargeAdmission,
  getAdminOverview, getPatientDetails, listAdmissions, listDoctors,
  listManagedUsers, listPatients, listTodayAppointments,
  resetManagedUserPassword, updateManagedUserStatus,
} from "../controllers/adminController.js";

const router = express.Router();
router.use(authenticateToken, allowRoles("SUPER_ADMIN"));
router.get("/overview", getAdminOverview);
router.get("/users", listManagedUsers);
router.post("/staff", createStaffAccount);
router.get("/patients", listPatients);
router.get("/patients/:id", getPatientDetails);
router.get("/doctors", listDoctors);
router.post("/doctors", createDoctorAccount);
router.get("/appointments/today", listTodayAppointments);
router.get("/admissions", listAdmissions);
router.post("/admissions", createAdmission);
router.patch("/admissions/:id/discharge", dischargeAdmission);
router.patch("/users/:id/password", resetManagedUserPassword);
router.patch("/users/:id/status", updateManagedUserStatus);
export default router;