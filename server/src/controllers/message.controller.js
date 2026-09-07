import { success } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
  getMessages,
  markDelivered,
  markRead,
  searchMessagesForUser,
} from "../services/message.service.js";

export const sendMessage = asyncHandler(async (req, res) => {
  const message = await createMessage({ ...req.body, userId: req.userId });
  return success(res, { id: message._id.toString() }, "Message sent", 201);
});

export const fetchMessages = asyncHandler(async (req, res) => {
  const result = await getMessages({
    conversationId: req.params.id,
    userId: req.userId,
    before: req.query.before || undefined,
    limit: Math.min(parseInt(req.query.limit, 10) || 40, 100),
  });
  return success(res, result);
});

export const edit = asyncHandler(async (req, res) => {
  const message = await editMessage(req.params.id, req.userId, req.body.text);
  return success(res, { id: message._id.toString(), editedAt: message.editedAt }, "Message edited");
});

export const deleteMsg = asyncHandler(async (req, res) => {
  const message = await deleteMessage(req.params.id, req.userId, req.body.conversationId);
  return success(res, { id: message._id.toString() }, "Message deleted");
});

export const react = asyncHandler(async (req, res) => {
  const message = await toggleReaction(req.params.id, req.userId, req.body.emoji);
  return success(res, { id: message._id.toString(), reactions: message.reactions }, "Reaction updated");
});

export const delivery = asyncHandler(async (req, res) => {
  const ids = await markDelivered(req.params.id, req.userId);
  return success(res, { delivered: ids });
});

export const read = asyncHandler(async (req, res) => {
  const ids = await markRead(req.params.id, req.userId);
  return success(res, { read: ids });
});

export const searchMessages = asyncHandler(async (req, res) => {
  const results = await searchMessagesForUser({
    userId: req.userId,
    q: req.query.q,
    conversationId: req.query.conversationId,
    limit: Math.min(parseInt(req.query.limit, 10) || 30, 50),
  });
  return success(res, { results });
});