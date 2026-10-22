
import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import {
  createStaffAccount,
  getAdminOverview,
  listManagedUsers,
} from "../controllers/adminController.js";

const router = express.Router();

// Authenticate first, then authorize the Super Admin role
router.use(authenticateToken, allowRoles("SUPER_ADMIN"));

router.get("/overview", getAdminOverview);
router.get("/users", listManagedUsers);
router.post("/staff", createStaffAccount);

export default router;
