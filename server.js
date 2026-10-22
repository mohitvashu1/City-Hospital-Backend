import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import doctorAuthRoutes from "./routes/doctorAuthRoutes.js";
import doctorAppointmentRoutes from "./routes/doctorAppointmentRoutes.js";
import doctorPatientRoutes from "./routes/doctorPatientRoutes.js";
import consultationRoutes from "./routes/consultationRoutes.js";

// Super Admin and Staff Routes
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import staffAuthRoutes from "./routes/staffAuthRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

import Doctor from "./models/Doctor.js";

dotenv.config();

const app = express();

// ================================
// Middleware
// ================================

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// ================================
// Health Check
// ================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "City Hospital API is running",
  });
});

// ================================
// Patient Authentication
// ================================

app.use("/api/auth", authRoutes);

// ================================
// Super Admin Authentication
// ================================

app.use("/api/admin/auth", adminAuthRoutes);

// ================================
// Staff Authentication
// ================================

app.use("/api/staff/auth", staffAuthRoutes);

// ================================
// Super Admin Management APIs
// ================================

app.use("/api/admin", adminRoutes);

// ================================
// Doctor Routes
// ================================

app.use("/api/doctor/auth", doctorAuthRoutes);

app.use(
  "/api/doctor/appointments",
  doctorAppointmentRoutes
);

app.use(
  "/api/doctor/patients",
  doctorPatientRoutes
);

app.use(
  "/api/doctor/consultations",
  consultationRoutes
);

// ================================
// Patient Appointments
// ================================

app.use("/api/appointments", appointmentRoutes);

// ================================
// Public Active Doctors List
// Used by Book Appointment Modal
// ================================

app.get("/api/doctors", async (req, res) => {
  try {
    const doctors = await Doctor.find({ active: true })
      .select("name specialization qualification department")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    console.error(
      "Get public doctors error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load doctors",
    });
  }
});

// ================================
// 404 Handler
// ================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// ================================
// Global Error Handler
// ================================

app.use((error, req, res, next) => {
  console.error("API error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request body is too large",
    });
  }

  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body",
    });
  }

  return res.status(error.status || 500).json({
    success: false,
    message:
      error.status && error.status < 500
        ? error.message
        : "Internal server error",
  });
});

// ================================
// Start Server
// ================================

const startServer = async () => {
  const requiredVariables = [
    "MONGODB_URI",
    "JWT_SECRET",
    "AADHAAR_HASH_SECRET",
    "CLIENT_URL",
  ];

  const missingVariables = requiredVariables.filter(
    (key) => !process.env[key]?.trim()
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing environment variables: ${missingVariables.join(", ")}`
    );
  }

  await connectDB();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error(
    "Server startup failed:",
    error.message
  );

  process.exit(1);
});