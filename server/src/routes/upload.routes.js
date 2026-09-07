import { Router } from "express";
import path from "path";
import { uploadMedia } from "../controllers/upload.controller.js";
import { upload } from "../middleware/upload.js";
import { protect } from "../middleware/auth.js";
import { uploadDirAbsolute } from "../middleware/upload.js";

const router = Router();
router.use(protect);

router.post("/", upload.single("file"), uploadMedia);

export default router;

export const serveUploads = (req, res, next) => {
  res.sendFile(path.join(uploadDirAbsolute, req.params.name), (err) => {
    if (err) res.status(404).json({ success: false, message: "File not found" });
  });
};