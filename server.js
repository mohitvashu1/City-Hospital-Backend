
import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "City Hospital API is running",
  });
});

// Patient authentication routes
app.use("/api/auth", authRoutes);

// Not found handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// Start server only after DB connection
const startServer = async () => {
  if (
    !process.env.MONGODB_URI ||
    !process.env.JWT_SECRET ||
    !process.env.AADHAAR_HASH_SECRET
  ) {
    throw new Error("Required environment variables are missing");
  }

  await connectDB();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});