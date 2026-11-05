import cloudinary from "../config/cloudinary.js";

export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Choose an image first" });
    const folder = req.body?.folder === "staff" ? "city-hospital/staff" : "city-hospital/doctors";
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder, resource_type: "image", transformation: [{ width: 900, height: 900, crop: "limit" }, { quality: "auto", fetch_format: "auto" }] }, (error, uploaded) => error ? reject(error) : resolve(uploaded));
      stream.end(req.file.buffer);
    });
    return res.status(201).json({ success: true, image: result.secure_url, publicId: result.public_id });
  } catch (error) {
    console.error("Cloudinary upload error:", error.message);
    return res.status(500).json({ success: false, message: "Image upload failed. Check Cloudinary configuration." });
  }
};
