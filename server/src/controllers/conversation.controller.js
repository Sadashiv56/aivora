import { success } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  findOrCreateDirectConversation,
  listConversationsForUser,
  getConversationById,
} from "../services/conversation.service.js";
import { assertNotBlocked } from "../services/conversation.service.js";

export const createOrFindDirect = asyncHandler(async (req, res) => {
  const other = await assertNotBlocked(req.user, req.body.userId);
  const conversation = await findOrCreateDirectConversation(req.userId, other._id.toString());
  return success(res, { id: conversation._id.toString(), type: "direct" }, "Conversation ready");
});

export const listConversations = asyncHandler(async (req, res) => {
  const cursor = req.query.cursor || null;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const conversations = await listConversationsForUser(req.userId, limit, cursor);
  const nextCursor = conversations.length ? conversations[conversations.length - 1].lastMessageAt.toISOString() : null;
  return success(res, { conversations, nextCursor });
});

export const getConversation = asyncHandler(async (req, res) => {
  const conversation = await getConversationById(req.params.id, req.userId);
  return success(res, { id: conversation._id.toString(), type: conversation.type });
});

export const markRead = asyncHandler(async (req, res) => {
  const { markRead } = await import("../services/message.service.js");
  const ids = await markRead(req.params.id, req.userId);
  return success(res, { read: ids }, "Marked as read");
});