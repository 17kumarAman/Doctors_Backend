
import express from "express";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const router = express.Router();

// POST /api/upload
router.post("/upload", async (req, res) => {
  try {
    // Check if express-fileupload middleware is working
    if (!req.files) {
      return res.status(400).json({ success: false, message: "express-fileupload middleware not working or no files sent" });
    }

    // Check if image file is present
    const imageFile = req.files.image;
    if (!imageFile) {
      return res.status(400).json({ success: false, message: "No file uploaded. Please use 'image' as the key in form-data." });
    }

    // Check if tempFilePath exists
    if (!imageFile.tempFilePath) {
      return res.status(500).json({ success: false, message: "tempFilePath not found. Make sure 'useTempFiles: true' is set in express-fileupload." });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(imageFile.tempFilePath, "uploads");

    res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      data: result
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
