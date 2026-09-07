import fs from "fs";
import path from "path";
import config from "../config/index.js";
import { uploadDirAbsolute } from "../middleware/upload.js";
import { ApiError } from "../utils/ApiError.js";

export const storeLocalFile = async (file) => {
  if (!file) throw ApiError.badRequest("No file uploaded", "NO_FILE");
  const relative = `/${file.filename}`;
  return {
    url: `/uploads${relative}`,
    publicId: file.filename,
    name: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
};

export const storeCloudinaryFile = async (file) => {
  if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
    return storeLocalFile(file);
  }
  try {
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
    });
    const result = await cloudinary.uploader.upload(file.path, {
      resource_type: "auto",
      folder: "whatsapp-clone",
    });
    await fs.promises.unlink(file.path).catch(() => {});
    return {
      url: result.secure_url,
      publicId: result.public_id,
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      width: result.width,
      height: result.height,
      duration: result.duration,
    };
  } catch (err) {
    console.error("[upload] cloudinary failed, using local fallback", err.message);
    return storeLocalFile(file);
  }
};

export const deleteLocalFile = async (publicId) => {
  const safe = path.basename(publicId);
  await fs.promises.unlink(path.join(uploadDirAbsolute, safe)).catch(() => {});
};