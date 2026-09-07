import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { error } from "../utils/ApiResponse.js";

export const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

export const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) return error(res, err);

  if (err instanceof mongoose.Error.ValidationError) {
    const mapped = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return error(res, ApiError.badRequest("Validation failed", "VALIDATION_ERROR", mapped));
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return error(
      res,
      ApiError.conflict(`${field} already in use`, "DUPLICATE_VALUE", [
        { field, message: `${field} already exists` },
      ])
    );
  }

  if (err.name === "CastError") {
    return error(res, ApiError.badRequest(`Invalid ${err.path}: "${err.value}"`, "INVALID_ID"));
  }

  if (err.name === "MulterError") {
    return error(res, ApiError.badRequest(`Upload error: ${err.message}`, "UPLOAD_ERROR"));
  }

  console.error("[error]", err);
  return error(res, new ApiError(500, "Internal server error"));
};