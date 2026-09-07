import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { ApiError } from "../utils/ApiError.js";

export const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const requireObjectId = (param = "id") => (req, res, next) => {
  if (!isObjectId(req.params[param])) {
    return next(ApiError.badRequest(`Invalid ${param}`, "INVALID_ID"));
  }
  next();
};

export const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      return next(ApiError.badRequest("Validation failed", "VALIDATION_ERROR", errors));
    }
    if (source === "query") {
      Object.keys(result.data).forEach((k) => {
        req.query[k] = result.data[k];
      });
    } else {
      req[source] = result.data;
    }
    next();
  };

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests", code: "RATE_LIMITED" },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many auth attempts, please try again later", code: "RATE_LIMITED" },
});

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many searches", code: "RATE_LIMITED" },
});