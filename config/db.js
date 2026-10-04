import mongoose from "mongoose";
import dns from "node:dns";

const connectDB = async () => {
  try {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);

    const conn = await mongoose.connect(
      process.env.MONGODB_URI,
      {
        serverSelectionTimeoutMS: 15000,
      }
    );

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("MongoDB Error:", error);
    throw error;
  }
};

export default connectDB;