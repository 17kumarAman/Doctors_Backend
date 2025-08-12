import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (filePath, folder, height, quality) => {
  try {
    const options = { folder };
    if (height) options.height = height;
    if (quality) options.quality = quality;
    options.resource_type = "auto";

    return await cloudinary.uploader.upload(filePath, options);
  } catch (error) {
    console.error("Error in Cloudinary:", error);
    throw error;
  }
};
