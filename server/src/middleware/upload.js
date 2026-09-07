import multer from "multer";
import path from "path";
import fs from "fs";
import config from "../config/index.js";
import { ApiError } from "../utils/ApiError.js";

const uploadDir = path.resolve(config.uploadDir);
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "application/pdf",
  "application/zip",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const fileFilter = (req, file, cb) => {
  if (ALLOWED.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest(`File type ${file.mimetype} not allowed`, "INVALID_FILE_TYPE"));
  }
};

const limits = {
  fileSize: (() => {
    const raw = String(config.maxFileSize || "10mb");
    const match = /^(\d+)(mb|kb|b)$/i.exec(raw);
    if (!match) return 10 * 1024 * 1024;
    const n = parseInt(match[1], 10);
    switch (match[2].toLowerCase()) {
      case "mb":
        return n * 1024 * 1024;
      case "kb":
        return n * 1024;
      default:
        return n;
    }
  })(),
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(safe)}`);
  },
});

export const upload = multer({ storage, limits, fileFilter });

export const uploadDirAbsolute = uploadDir;