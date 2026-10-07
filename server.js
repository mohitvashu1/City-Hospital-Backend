import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import doctorAuthRoutes from "./routes/doctorAuthRoutes.js";
import doctorAppointmentRoutes from "./routes/doctorAppointmentRoutes.js";
import doctorPatientRoutes from "./routes/doctorPatientRoutes.js";

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
// Routes
// ================================

// Patient authentication
app.use("/api/auth", authRoutes);

// Doctor authentication
app.use("/api/doctor/auth", doctorAuthRoutes);

app.use(
  "/api/doctor/appointments",
  doctorAppointmentRoutes
);

app.use(
  "/api/doctor/patients",
  doctorPatientRoutes
);

// Appointments
app.use("/api/appointments", appointmentRoutes);

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
// Start Server
// ================================

const startServer = async () => {
  if (
    !process.env.MONGODB_URI ||
    !process.env.JWT_SECRET ||
    !process.env.AADHAAR_HASH_SECRET
  ) {
    throw new Error(
      "Required environment variables are missing"
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