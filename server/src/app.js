import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import config from "./config/index.js";
import apiRoutes from "./routes/index.js";
import { notFoundHandler, errorHandler } from "./middleware/error.js";
import { apiLimiter } from "./middleware/validation.js";
import { serveUploads } from "./routes/upload.routes.js";

const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

const allowedOrigins = (config.clientUrl || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: config.env === "production" ? allowedOrigins : true,
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/uploads/:name", serveUploads);

app.use("/api", apiLimiter);
app.use("/api", apiRoutes);

// Serve the built frontend (single-service deployment) when it exists.
const distDir = path.resolve(config.clientDistDir);
const hasFrontend =
  config.env === "production" &&
  fs.existsSync(distDir) &&
  fs.existsSync(path.join(distDir, "index.html"));

if (hasFrontend) {
  app.use(express.static(distDir));
  // SPA fallback: send index.html for client-side routes
  // (skip /api, /uploads). Regex form is required for this Express version.
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return next();
    }
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.get("/", (req, res) => {
  res.json({ success: true, message: "WhatsApp Clone API", data: { docs: "/api/health" } });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;