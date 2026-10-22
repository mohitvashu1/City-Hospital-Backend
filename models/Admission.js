import mongoose from "mongoose";

const admissionSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
  admissionDate: { type: Date, required: true, default: Date.now, index: true },
  dischargeDate: { type: Date, default: null },
  ward: { type: String, trim: true, maxlength: 80, required: true },
  bedNumber: { type: String, trim: true, maxlength: 30, required: true },
  reason: { type: String, trim: true, maxlength: 500 },
  status: { type: String, enum: ["ADMITTED", "DISCHARGED"], default: "ADMITTED", index: true },
}, { timestamps: true });

export default mongoose.models.Admission || mongoose.model("Admission", admissionSchema);
