import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
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

app.get("/", (req, res) => {
  res.json({ success: true, message: "WhatsApp Clone API", data: { docs: "/api/health" } });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;