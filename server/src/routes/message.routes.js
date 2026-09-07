import { Router } from "express";
import {
  sendMessage,
  edit,
  deleteMsg,
  react,
  delivery,
  read,
} from "../controllers/message.controller.js";
import { protect } from "../middleware/auth.js";
import { validate, requireObjectId } from "../middleware/validation.js";
import { messageCreateSchema, editMessageSchema, reactionSchema } from "../utils/schemas.js";

const router = Router();
router.use(protect);

router.post("/", validate(messageCreateSchema), sendMessage);
router.get("/", async (req, res, next) => {
  const { fetchMessages } = await import("../controllers/message.controller.js");
  fetchMessages(req, res, next);
});
router.patch("/:id", requireObjectId("id"), validate(editMessageSchema), edit);
router.delete("/:id", requireObjectId("id"), deleteMsg);
router.post("/:id/reactions", requireObjectId("id"), validate(reactionSchema), react);

export default router;

export const conversationMessagesRouter = Router({ mergeParams: true });
conversationMessagesRouter.use(protect);
conversationMessagesRouter.get("/", async (req, res, next) => {
  req.query.before = req.query.before || undefined;
  const { fetchMessages } = await import("../controllers/message.controller.js");
  fetchMessages(req, res, next);
});
conversationMessagesRouter.post(
  "/",
  (req, res, next) => {
    req.body = { ...req.body, conversationId: req.params.id };
    next();
  },
  validate(messageCreateSchema),
  sendMessage
);

export const markRoutes = Router({ mergeParams: true });
markRoutes.post("/delivered", delivery);
markRoutes.post("/read", read);