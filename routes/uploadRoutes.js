import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import uploadImage from "../middleware/uploadImage.js";
import { uploadProfileImage } from "../controllers/uploadController.js";
const router = express.Router();
router.post("/image", authenticateToken, allowRoles("SUPER_ADMIN"), uploadImage.single("image"), uploadProfileImage);
export default router;
