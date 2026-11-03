import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    specialization: {
      type: String,
      required: true,
      trim: true,
    },

    qualification: {
      type: String,
      required: true,
      trim: true,
    },

    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      match: /^[6-9]\d{9}$/,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    department: {
      type: String,
      trim: true,
    },

    // Public-facing profile fields managed by the Super Admin.
    image: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1200,
    },

    experience: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },

    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (items) => items.length <= 12 && items.every((item) => item.length <= 50),
        message: "A doctor can have up to 12 tags, each up to 50 characters",
      },
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Doctor = mongoose.model("Doctor", doctorSchema);

export default Doctor;