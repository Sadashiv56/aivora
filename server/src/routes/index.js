import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import conversationRoutes from "./conversation.routes.js";
import messageRoutes, { conversationMessagesRouter, markRoutes } from "./message.routes.js";
import groupRoutes from "./group.routes.js";
import uploadRoutes from "./upload.routes.js";
import searchRoutes from "./search.routes.js";
import { success } from "../utils/ApiResponse.js";

const router = Router();

router.get("/health", (req, res) => success(res, { status: "ok", uptime: process.uptime() }));

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/conversations", conversationRoutes);
router.use("/messages", messageRoutes);
router.use("/conversations/:id/messages", conversationMessagesRouter);
router.use("/conversations/:id", markRoutes);
router.use("/groups", groupRoutes);
router.use("/uploads", uploadRoutes);
router.use("/search/messages", searchRoutes);

export default router;