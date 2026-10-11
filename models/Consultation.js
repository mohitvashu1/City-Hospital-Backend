import mongoose from "mongoose";

const consultationSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },

    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },

    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true,
      index: true,
    },

    symptoms: {
      type: [String],
      default: [],
    },

    vitals: {
      temperature: {
        type: Number,
      },

      bloodPressure: {
        type: String,
        trim: true,
      },

      pulse: {
        type: Number,
      },

      spo2: {
        type: Number,
      },

      weight: {
        type: Number,
      },
    },

    examination: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    diagnosis: {
      type: [String],
      default: [],
    },

    tests: {
      type: [String],
      default: [],
    },

    medicines: {
      type: [
        {
          medicineName: {
            type: String,
            required: true,
            trim: true,
          },

          strength: {
            type: String,
            trim: true,
          },

          dose: {
            type: String,
            trim: true,
          },

          route: {
            type: String,
            trim: true,
          },

          frequency: {
            type: String,
            trim: true,
          },

          duration: {
            type: String,
            trim: true,
          },

          timing: {
            type: String,
            trim: true,
          },

          instructions: {
            type: String,
            trim: true,
          },
        },
      ],
      default: [],
    },

    advice: {
      type: String,
      trim: true,
      maxlength: 3000,
    },

    followUpDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["DRAFT", "FINALIZED"],
      default: "DRAFT",
      index: true,
    },
  },
  {
    timestamps: true,   
  }
);

const Consultation = mongoose.model(
  "Consultation",
  consultationSchema
);

export default Consultation;