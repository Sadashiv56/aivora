import { success } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { storeCloudinaryFile } from "../services/upload.service.js";

export const uploadMedia = asyncHandler(async (req, res) => {
  const file = req.file;
  const meta = await storeCloudinaryFile(file);
  return success(res, { attachment: meta }, "Upload complete", 201);
});