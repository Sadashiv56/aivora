import { Router } from "express";
import {
  me,
  updateMe,
  searchUsers,
  getUserById,
  blockUser,
  unblockUser,
  blockedUsers,
  reportUser,
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.js";
import {
  validate,
  requireObjectId,
  searchLimiter,
  isObjectId,
} from "../middleware/validation.js";
import {
  updateProfileSchema,
  userSearchSchema,
  blockSchema,
} from "../utils/schemas.js";
import { ApiError } from "../utils/ApiError.js";

const router = Router();
router.use(protect);

router.get("/me", me);
router.patch("/me", validate(updateProfileSchema), updateMe);

router.get("/search", searchLimiter, validate(userSearchSchema, "query"), searchUsers);

router.get("/blocked", blockedUsers);
router.post("/block", validate(blockSchema), blockUser);
router.delete("/block/:userId", requireObjectId("userId"), unblockUser);

router.get("/:id", async (req, res, next) => {
  if (!isObjectId(req.params.id)) return next(ApiError.badRequest("Invalid id", "INVALID_ID"));
  next();
}, getUserById);

router.post("/:id/report", requireObjectId("id"), reportUser);

export default router;