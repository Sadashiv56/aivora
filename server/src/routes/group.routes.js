import { Router } from "express";
import {
  create,
  get,
  update,
  add,
  remove,
  leave,
  role,
  destroy,
} from "../controllers/group.controller.js";
import { protect } from "../middleware/auth.js";
import { validate, requireObjectId } from "../middleware/validation.js";
import {
  createGroupSchema,
  updateGroupSchema,
  addGroupMembersSchema,
  promoteGroupMemberSchema,
} from "../utils/schemas.js";

const router = Router();
router.use(protect);

router.post("/", validate(createGroupSchema), create);
router.get("/:id", requireObjectId("id"), get);
router.patch("/:id", requireObjectId("id"), validate(updateGroupSchema), update);
router.delete("/:id", requireObjectId("id"), destroy);
router.post("/:id/members", requireObjectId("id"), validate(addGroupMembersSchema), add);
router.post("/:id/leave", requireObjectId("id"), leave);
router.delete("/:id/members/:userId", requireObjectId("id"), requireObjectId("userId"), remove);
router.patch(
  "/:id/members/:userId",
  requireObjectId("id"),
  requireObjectId("userId"),
  validate(promoteGroupMemberSchema),
  role
);

export default router;