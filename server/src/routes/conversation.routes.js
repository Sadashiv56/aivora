import { Router } from "express";
import {
  createOrFindDirect,
  listConversations,
  getConversation,
} from "../controllers/conversation.controller.js";
import { protect } from "../middleware/auth.js";
import { validate, requireObjectId } from "../middleware/validation.js";
import { createConversationSchema } from "../utils/schemas.js";

const router = Router();
router.use(protect);

router.post("/", validate(createConversationSchema), createOrFindDirect);
router.get("/", listConversations);
router.get("/:id", requireObjectId("id"), getConversation);

export default router;