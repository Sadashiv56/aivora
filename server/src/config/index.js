import dotenv from "dotenv";
import path from "path";

dotenv.config();

const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  mongoUri:
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/whatsapp_clone",
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET || "dev_access_secret_change_me",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || "dev_refresh_secret_change_me",
    accessExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d",
    refreshCookieName:
      process.env.REFRESH_TOKEN_COOKIE_NAME || "chat_refresh_token",
  },
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  maxFileSize: process.env.MAX_FILE_SIZE || "15mb",
  // Absolute path to the built frontend (client/dist). On Render the build
  // runs from server/ so we resolve from the repo root by default.
  clientDistDir:
    process.env.CLIENT_DIST_DIR || path.resolve("..", "client", "dist"),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  redisUrl: process.env.REDIS_URL,
};

export default config;