import { Router } from "express";
import { searchMessages } from "../controllers/message.controller.js";
import { protect } from "../middleware/auth.js";
import { validate, searchLimiter } from "../middleware/validation.js";
import { searchMessagesSchema } from "../utils/schemas.js";

const router = Router();
router.use(protect);
router.get("/", searchLimiter, validate(searchMessagesSchema, "query"), searchMessages);

export default router;