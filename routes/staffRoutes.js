import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";

const router = express.Router();
router.use(authenticateToken, allowRoles("RECEPTIONIST"));

// Reception staff can see only the basic patient fields needed at the desk.
router.get("/patients", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().slice(0, 80);
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter = q ? { $or: [{ name: { $regex: escaped, $options: "i" } }, { phone: { $regex: escaped } }] } : {};
    const patients = await Patient.find(filter).select("name phone gender dateOfBirth createdAt").sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ success: true, patients });
  } catch (error) {
    console.error("Staff patient search error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to search patient records" });
  }
});

router.get("/appointments/today", async (_req, res) => {
  try {
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    const appointments = await Appointment.find({ appointmentDate: { $gte: start, $lte: end } })
      .populate("patientId", "name phone")
      .populate("doctorId", "name specialization")
      .sort({ appointmentTime: 1 }).limit(500).lean();
    return res.json({ success: true, date: start.toISOString().slice(0, 10), appointments });
  } catch (error) {
    console.error("Staff appointments error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load today's appointments" });
  }
});

router.patch("/appointments/:id/status", async (req, res) => {
  try {
    const status = String(req.body?.status || "").toUpperCase();
    // Reception may place a booked patient in the waiting queue. Clinical statuses are controlled by doctors.
    if (status !== "WAITING") return res.status(400).json({ success: false, message: "Reception staff may only mark booked appointments as waiting" });
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, status: "BOOKED" },
      { $set: { status: "WAITING" } },
      { new: true, runValidators: true }
    );
    if (!appointment) return res.status(404).json({ success: false, message: "Booked appointment not found or it has already changed status" });
    return res.json({ success: true, message: "Appointment marked as waiting", appointment: { id: appointment._id, status: appointment.status } });
  } catch (error) {
    console.error("Staff appointment status error:", error.message);
    return res.status(400).json({ success: false, message: "Unable to update appointment status" });
  }
});

export default router;
