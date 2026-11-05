import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import Appointment from "../models/Appointment.js";
import Admission from "../models/Admission.js";
import Consultation from "../models/Consultation.js";

const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const safeUserFields = "name email role active profileImage createdAt";

const dateRange = (query, field = "createdAt") => {
  const range = {};
  if (query.from && !Number.isNaN(Date.parse(query.from))) range.$gte = new Date(`${query.from}T00:00:00.000`);
  if (query.to && !Number.isNaN(Date.parse(query.to))) range.$lte = new Date(`${query.to}T23:59:59.999`);
  return Object.keys(range).length ? { [field]: range } : {};
};

export const getAdminOverview = async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    const [patients, doctors, staff, appointments, todayAppointments, admittedPatients] = await Promise.all([
      Patient.countDocuments(), Doctor.countDocuments(), User.countDocuments({ role: "RECEPTIONIST" }),
      Appointment.countDocuments(), Appointment.countDocuments({ appointmentDate: { $gte: start, $lte: end } }),
      Admission.countDocuments({ status: "ADMITTED" }),
    ]);
    return res.json({ success: true, overview: { patients, doctors, staff, appointments, todayAppointments, admittedPatients } });
  } catch (error) {
    console.error("Admin overview error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load dashboard overview" });
  }
};

export const listManagedUsers = async (req, res) => {
  try {
    const role = String(req.query.role || "").toUpperCase();
    const allowedRoles = ["DOCTOR", "RECEPTIONIST"];
    const filter = { role: role && allowedRoles.includes(role) ? role : { $in: allowedRoles }, ...dateRange(req.query) };
    const users = await User.find(filter).select(safeUserFields).sort({ createdAt: -1 }).limit(500).lean();
    return res.json({ success: true, users });
  } catch (error) {
    console.error("Admin users error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load users" });
  }
};

export const listPatients = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const filter = { ...dateRange(req.query), ...(q ? { $or: [{ name: { $regex: q.slice(0, 80), $options: "i" } }, { phone: { $regex: q.slice(0, 30) } }] } : {}) };
    const patients = await Patient.find(filter).select("name phone dateOfBirth gender address createdAt").sort({ createdAt: -1 }).limit(500).lean();
    return res.json({ success: true, patients });
  } catch (error) {
    console.error("Admin patients error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load patients" });
  }
};

export const getPatientDetails = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).select("name phone dateOfBirth gender address createdAt").lean();
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
    const appointments = await Appointment.find({ patientId: patient._id }).populate("doctorId", "name specialization").sort({ appointmentDate: -1 }).limit(100).lean();
    const consultations = await Consultation.find({ patientId: patient._id }).populate("doctorId", "name specialization").populate("appointmentId", "appointmentId appointmentDate appointmentTime status reason").sort({ createdAt: -1 }).limit(100).lean();
    const admissions = await Admission.find({ patientId: patient._id }).sort({ admissionDate: -1 }).lean();
    const consultationByAppointment = new Map(consultations.map((item) => [String(item.appointmentId?._id || item.appointmentId), item]));
    const appointmentHistory = appointments.map((item) => ({ ...item, consultation: consultationByAppointment.get(String(item._id)) || null }));
    return res.json({ success: true, patient, appointments: appointmentHistory, consultations, admissions });
  } catch (error) {
    console.error("Patient details error:", error.message);
    return res.status(400).json({ success: false, message: "Invalid patient ID or unable to load details" });
  }
};

export const listDoctors = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().slice(0, 80);
    const doctorFilter = { ...dateRange(req.query), ...(q ? { $or: [{ name: { $regex: q, $options: "i" } }, { specialization: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }] } : {}) };
    const doctors = await Doctor.find(doctorFilter).sort({ name: 1 }).limit(500).lean();
    const users = await User.find({ role: "DOCTOR" }).select(safeUserFields).lean();
    const byId = new Map(users.map(u => [String(u._id), u]));
    const result = doctors.map(d => ({ ...d, account: byId.get(String(d.userId)) || null }));
    return res.json({ success: true, doctors: result });
  } catch (error) {
    console.error("Admin doctors error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load doctors" });
  }
};

export const createDoctorAccount = async (req, res) => {
  let createdUser = null;
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const specialization = String(req.body?.specialization || "").trim();
    const qualification = String(req.body?.qualification || "").trim();
    const registrationNumber = String(req.body?.registrationNumber || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const department = String(req.body?.department || "").trim();
    const image = String(req.body?.image || "").trim();
    const description = String(req.body?.description || "").trim();
    const experience = String(req.body?.experience || "").trim();
    const rawTags = Array.isArray(req.body?.tags) ? req.body.tags : String(req.body?.tags || "").split(",");
    const tags = [...new Set(rawTags.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 12);
    if (!name || name.length > 100 || !validEmail(email) || !specialization || !qualification || !registrationNumber) {
      return res.status(400).json({ success: false, message: "Name, valid email, specialization, qualification and registration number are required" });
    }
    if (password.length < 12 || password.length > 128) return res.status(400).json({ success: false, message: "Password must be 12–128 characters" });
    if (phone && !/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ success: false, message: "Phone must be a valid 10-digit Indian mobile number" });
    if (image.length > 500 || description.length > 1200 || experience.length > 120 || tags.some((tag) => tag.length > 50)) {
      return res.status(400).json({ success: false, message: "Profile image, description, experience or tags exceed allowed length" });
    }
    if (await User.exists({ email })) return res.status(409).json({ success: false, message: "Email is already registered" });
    if (await Doctor.exists({ registrationNumber })) return res.status(409).json({ success: false, message: "Registration number is already registered" });
    createdUser = await User.create({ name, email, role: "DOCTOR", active: true, passwordHash: await bcrypt.hash(password, 12) });
    const doctor = await Doctor.create({
      userId: createdUser._id,
      name,
      specialization,
      qualification,
      registrationNumber,
      phone: phone || undefined,
      email,
      department: department || undefined,
      image,
      description,
      experience,
      tags,
      active: true,
    });
    return res.status(201).json({ success: true, message: "Doctor account created", doctor: { id: doctor._id, name, email, specialization, qualification, registrationNumber } });
  } catch (error) {
    if (createdUser?._id) await User.deleteOne({ _id: createdUser._id }).catch(() => {});
    console.error("Create doctor error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to create doctor account" });
  }
};

export const updateDoctorProfile = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor profile not found" });
    const fields = ["name", "specialization", "qualification", "registrationNumber", "phone", "department", "image", "description", "experience"];
    for (const key of fields) if (Object.prototype.hasOwnProperty.call(req.body, key)) doctor[key] = String(req.body[key] ?? "").trim();
    if (Object.prototype.hasOwnProperty.call(req.body, "tags")) doctor.tags = Array.isArray(req.body.tags) ? req.body.tags : String(req.body.tags).split(",").map(x => x.trim()).filter(Boolean);
    if (!doctor.name || !doctor.specialization || !doctor.qualification || !doctor.registrationNumber) return res.status(400).json({ success: false, message: "Name, specialty, qualification and registration number are required" });
    if (doctor.phone && !/^[6-9]\d{9}$/.test(doctor.phone)) return res.status(400).json({ success: false, message: "Enter a valid 10-digit mobile number" });
    const duplicate = await Doctor.findOne({ registrationNumber: doctor.registrationNumber, _id: { $ne: doctor._id } });
    if (duplicate) return res.status(409).json({ success: false, message: "Registration number is already in use" });
    await doctor.save();
    const user = await User.findById(doctor.userId);
    if (user && req.body.name) user.name = doctor.name;
    if (user && req.body.email) {
      const email = String(req.body.email).trim().toLowerCase();
      if (!validEmail(email)) return res.status(400).json({ success: false, message: "Enter a valid email" });
      const exists = await User.findOne({ email, _id: { $ne: user._id } });
      if (exists) return res.status(409).json({ success: false, message: "Email is already registered" });
      user.email = email; doctor.email = email; await doctor.save();
    }
    if (user) await user.save();
    return res.json({ success: true, message: "Doctor profile updated", doctor: { ...doctor.toObject(), account: user ? { _id: user._id, name: user.name, email: user.email, role: user.role, active: user.active, createdAt: user.createdAt } : null } });
  } catch (error) {
    console.error("Update doctor profile error:", error.message);
    return res.status(400).json({ success: false, message: "Unable to update doctor profile" });
  }
};

export const updateStaffProfile = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: "RECEPTIONIST" });
    if (!user) return res.status(404).json({ success: false, message: "Staff account not found" });
    const name = String(req.body?.name ?? user.name).trim();
    const profileImage = String(req.body?.profileImage ?? user.profileImage ?? "").trim();
    if (!name || name.length > 100 || profileImage.length > 500) return res.status(400).json({ success: false, message: "Enter a valid name and image URL" });
    user.name = name; user.profileImage = profileImage; await user.save();
    return res.json({ success: true, message: "Staff profile updated", user: { _id: user._id, name: user.name, email: user.email, role: user.role, active: user.active, profileImage: user.profileImage, createdAt: user.createdAt } });
  } catch (error) {
    console.error("Update staff profile error:", error.message);
    return res.status(400).json({ success: false, message: "Unable to update staff profile" });
  }
};

export const createStaffAccount = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const role = String(req.body?.role || "RECEPTIONIST").toUpperCase();
    const profileImage = String(req.body?.profileImage || "").trim();
    if (!name || name.length > 100 || !validEmail(email)) return res.status(400).json({ success: false, message: "Enter a valid name and email" });
    if (role !== "RECEPTIONIST") return res.status(400).json({ success: false, message: "Only Receptionist accounts can be created in this phase" });
    if (password.length < 12 || password.length > 128) return res.status(400).json({ success: false, message: "Password must be 12–128 characters" });
    if (await User.exists({ email })) return res.status(409).json({ success: false, message: "Email is already registered" });
    const user = await User.create({ name, email, role, active: true, profileImage, passwordHash: await bcrypt.hash(password, 12) });
    return res.status(201).json({ success: true, message: "Receptionist account created", user: { id: user._id, name: user.name, email: user.email, role: user.role, active: user.active, profileImage: user.profileImage } });
  } catch (error) {
    console.error("Create staff error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to create staff account" });
  }
};

export const listTodayAppointments = async (req, res) => {
  try {
    const now = new Date(); const start = new Date(now); start.setHours(0, 0, 0, 0); const end = new Date(now); end.setHours(23, 59, 59, 999);
    const filter = req.query.from || req.query.to ? dateRange(req.query, "appointmentDate") : { appointmentDate: { $gte: start, $lte: end } };
    const appointments = await Appointment.find(filter)
      .populate("patientId", "name phone").populate("doctorId", "name specialization")
      .sort({ appointmentTime: 1 }).limit(1000).lean();
    return res.json({ success: true, date: start.toISOString().slice(0, 10), appointments });
  } catch (error) {
    console.error("Today appointments error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load today's appointments" });
  }
};

export const listAdmissions = async (req, res) => {
  try {
    const filter = req.query.status === "all" ? {} : { status: "ADMITTED" };
    const admissions = await Admission.find(filter).populate("patientId", "name phone gender").sort({ admissionDate: -1 }).limit(1000).lean();
    return res.json({ success: true, admissions });
  } catch (error) {
    console.error("Admissions list error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load admissions" });
  }
};

export const createAdmission = async (req, res) => {
  try {
    const { patientId, ward, bedNumber, reason, admissionDate } = req.body || {};
    if (!patientId || !ward?.trim() || !bedNumber?.trim()) return res.status(400).json({ success: false, message: "Patient, ward and bed number are required" });
    const patient = await Patient.findById(patientId).select("_id");
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
    const occupied = await Admission.exists({ ward: ward.trim(), bedNumber: bedNumber.trim(), status: "ADMITTED" });
    if (occupied) return res.status(409).json({ success: false, message: "This bed is already occupied" });
    const admission = await Admission.create({ patientId, ward: ward.trim(), bedNumber: bedNumber.trim(), reason: String(reason || "").trim(), admissionDate: admissionDate ? new Date(admissionDate) : new Date() });
    return res.status(201).json({ success: true, message: "Patient admitted", admission });
  } catch (error) {
    console.error("Create admission error:", error.message);
    return res.status(400).json({ success: false, message: "Unable to create admission" });
  }
};

export const dischargeAdmission = async (req, res) => {
  try {
    const admission = await Admission.findByIdAndUpdate(req.params.id, { status: "DISCHARGED", dischargeDate: new Date() }, { new: true });
    if (!admission) return res.status(404).json({ success: false, message: "Admission not found" });
    return res.json({ success: true, message: "Patient discharged", admission });
  } catch (error) { return res.status(400).json({ success: false, message: "Unable to discharge patient" }); }
};

export const resetManagedUserPassword = async (req, res) => {
  try {
    const password = String(req.body?.password || "");
    if (password.length < 12 || password.length > 128) return res.status(400).json({ success: false, message: "Temporary password must be 12–128 characters" });
    const user = await User.findOne({ _id: req.params.id, role: { $in: ["DOCTOR", "RECEPTIONIST"] } });
    if (!user) return res.status(404).json({ success: false, message: "Doctor or staff account not found" });
    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();
    return res.json({ success: true, message: "Password reset successfully. Share the temporary password securely." });
  } catch (error) {
    console.error("Password reset error:", error.message);
    return res.status(400).json({ success: false, message: "Unable to reset password" });
  }
};

export const updateManagedUserStatus = async (req, res) => {
  try {
    if (typeof req.body?.active !== "boolean") {
      return res.status(400).json({ success: false, message: "Account status must be true or false" });
    }

    const existingUser = await User.findOne({
      _id: req.params.id,
      role: { $in: ["DOCTOR", "RECEPTIONIST"] },
    });

    if (!existingUser) {
      return res.status(404).json({ success: false, message: "Doctor or staff account not found" });
    }

    if (String(existingUser._id) === String(req.user.id) && !req.body.active) {
      return res.status(400).json({ success: false, message: "You cannot deactivate your own account" });
    }

    existingUser.active = req.body.active;
    await existingUser.save();

    if (existingUser.role === "DOCTOR") {
      await Doctor.findOneAndUpdate(
        { userId: existingUser._id },
        { active: req.body.active },
        { new: true }
      );
    }

    const user = {
      _id: existingUser._id,
      name: existingUser.name,
      email: existingUser.email,
      role: existingUser.role,
      active: existingUser.active,
      createdAt: existingUser.createdAt,
    };

    return res.json({ success: true, user });
  } catch (error) {
    console.error("Update managed account status error:", error.message);
    return res.status(400).json({ success: false, message: "Unable to update account status" });
  }
};
