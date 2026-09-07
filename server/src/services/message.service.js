import mongoose from "mongoose";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import Group from "../models/Group.js";
import { ApiError } from "../utils/ApiError.js";
import { assertMember } from "./conversation.service.js";

const PAGE_SIZE = 40;

const serializeMessage = (m) => ({
  id: m._id.toString(),
  conversationId: m.conversationId?.toString(),
  senderId: m.senderId?.toString(),
  type: m.type,
  text: m.text || "",
  attachments: (m.attachments || []).map((a) => ({
    url: a.url,
    publicId: a.publicId,
    name: a.name,
    mimeType: a.mimeType,
    size: a.size,
    width: a.width,
    height: a.height,
    duration: a.duration,
  })),
  replyToMessageId: m.replyToMessageId?.toString() || null,
  reactions: (m.reactions || []).map((r) => ({
    userId: r.userId.toString(),
    emoji: r.emoji,
  })),
  deliveredTo: (m.deliveredTo || []).map((id) => id.toString()),
  readBy: (m.readBy || []).map((id) => id.toString()),
  status: m.status || "sent",
  editedAt: m.editedAt || null,
  deletedAt: m.deletedAt || null,
  tempId: m.tempId || "",
  createdAt: m.createdAt,
  updatedAt: m.updatedAt,
});

export const createMessage = async ({ userId, conversationId, type, text, replyToMessageId, tempId, attachments }) => {
  const conversation = await assertMember(conversationId, userId);

  if (conversation.type === "group" && conversation.groupId) {
    const group = await Group.findById(conversation.groupId);
    if (group?.settings?.onlyAdminsCanSend) {
      const member = group.members.find((m) => m.userId.toString() === userId);
      const isAdmin = member && (member.role === "admin" || member.role === "owner");
      const isOwner = group.ownerId?.toString() === userId;
      if (!isAdmin && !isOwner) {
        throw ApiError.forbidden("Only admins can send messages in this group");
      }
    }
  }

  if (replyToMessageId) {
    const reply = await Message.findById(replyToMessageId);
    if (!reply || reply.conversationId.toString() !== conversationId) {
      throw ApiError.badRequest("Reply message not found in this conversation");
    }
  }

  if (tempId) {
    const existing = await Message.findOne({ conversationId, senderId: userId, tempId });
    if (existing) return existing;
  }

  const payload = {
    conversationId,
    senderId: userId,
    type: type || (attachments?.length ? "document" : "text"),
    text: text || "",
    replyToMessageId: replyToMessageId || null,
    tempId: tempId || "",
    attachments: attachments || [],
  };

  const message = await Message.create(payload);
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessageId: message._id,
    lastMessageAt: new Date(),
  });
  return message;
};

export const editMessage = async (messageId, userId, text) => {
  const message = await Message.findOne({ _id: messageId, senderId: userId });
  if (!message) throw ApiError.notFound("Message not found");
  if (message.deletedAt) throw ApiError.badRequest("Cannot edit a deleted message");
  if (message.type === "system") throw ApiError.badRequest("Cannot edit a system message");
  message.text = text;
  message.editedAt = new Date();
  await message.save();
  return message;
};

export const deleteMessage = async (messageId, userId, conversationId) => {
  if (conversationId) await assertMember(conversationId, userId);
  const message = await Message.findById(messageId);
  if (!message) throw ApiError.notFound("Message not found");
  const conversation = await Conversation.findById(message.conversationId);

  let groupAdminDelete = false;
  if (conversation.type === "group") {
    const group = await Group.findById(conversation.groupId);
    if (group && (group.ownerId?.toString() === userId || group.admins.includes(userId))) {
      groupAdminDelete = true;
    }
  }

  const selfDelete = message.senderId.toString() === userId;
  if (!selfDelete && !groupAdminDelete) {
    throw ApiError.forbidden("You cannot delete this message");
  }

  message.deletedAt = new Date();
  message.text = "";
  message.attachments = [];
  await message.save();
  return message;
};

export const toggleReaction = async (messageId, userId, emoji) => {
  const message = await Message.findById(messageId);
  if (!message) throw ApiError.notFound("Message not found");
  await assertMember(message.conversationId.toString(), userId);

  const existing = message.reactions.find((r) => r.userId.toString() === userId);
  if (existing) {
    if (existing.emoji === emoji) {
      message.reactions = message.reactions.filter((r) => r.userId.toString() !== userId);
    } else {
      existing.emoji = emoji;
    }
  } else {
    message.reactions.push({ userId, emoji });
  }
  await message.save();
  return message;
};

export const markDelivered = async (conversationId, userId) => {
  const messages = await Message.find({
    conversationId,
    senderId: { $ne: userId },
    deliveredTo: { $ne: userId },
  }).limit(200);
  const ids = messages.map((m) => m._id);
  await Message.updateMany(
    { _id: { $in: ids } },
    { $addToSet: { deliveredTo: userId }, $set: { status: "delivered" } }
  );
  return ids.map((id) => id.toString());
};

export const markRead = async (conversationId, userId) => {
  const messages = await Message.find({
    conversationId,
    senderId: { $ne: userId },
    readBy: { $ne: userId },
  }).limit(200);
  const ids = messages.map((m) => m._id);
  await Message.updateMany(
    { _id: { $in: ids } },
    { $addToSet: { readBy: userId, deliveredTo: userId }, $set: { status: "read" } }
  );
  return ids.map((id) => id.toString());
};

export const getMessages = async ({ conversationId, userId, before, limit = PAGE_SIZE }) => {
  await assertMember(conversationId, userId);

  const filter = { conversationId };
  if (before) {
    filter.createdAt = { $lt: new Date(before) };
  }

  const docs = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate("senderId", "name username avatarUrl")
    .populate("replyToMessageId", "type text attachments senderId createdAt")
    .lean();

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;
  const nextCursor =
    page.length > 0 ? page[page.length - 1].createdAt.toISOString() : null;

  return {
    messages: page.reverse().map((m) => ({
      ...serializeMessage(m),
      senderId: m.senderId?._id?.toString() || m.senderId?.toString(),
      deliveredTo: (m.deliveredTo || []).map((x) => x._id?.toString?.() || x.toString()),
      readBy: (m.readBy || []).map((x) => x._id?.toString?.() || x.toString()),
      reactions: (m.reactions || []).map((r) => ({
        userId: r.userId?._id?.toString?.() || r.userId?.toString(),
        emoji: r.emoji,
      })),
      sender: m.senderId
        ? {
            id: m.senderId._id.toString(),
            name: m.senderId.name,
            username: m.senderId.username,
            avatarUrl: m.senderId.avatarUrl,
          }
        : null,
      replyTo: m.replyToMessageId
        ? {
            id: m.replyToMessageId._id.toString(),
            type: m.replyToMessageId.type,
            text: m.replyToMessageId.text,
            senderId: m.replyToMessageId.senderId?.toString(),
            attachments: m.replyToMessageId.attachments || [],
            createdAt: m.replyToMessageId.createdAt,
          }
        : null,
    })),
    nextCursor,
    hasMore,
  };
};

export const serializeMessageForSocket = async (message) => {
  const doc = message.toObject ? message.toObject() : message;
  return {
    ...serializeMessage(doc),
    sender: null,
    replyTo: null,
  };
};

export const searchMessagesForUser = async ({ userId, q, conversationId, limit }) => {
  const base = { deletedAt: null };
  if (conversationId) {
    await assertMember(conversationId, userId);
    base.conversationId = conversationId;
  } else {
    const conversations = await Conversation.find({ participants: userId }).select("_id");
    base.conversationId = { $in: conversations.map((c) => c._id) };
  }

  const docs = await Message.find({ ...base, $text: { $search: q } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("senderId", "name username avatarUrl")
    .lean();

  return docs.map((m) => ({
    ...serializeMessage(m),
    sender: m.senderId
      ? {
          id: m.senderId._id.toString(),
          name: m.senderId.name,
          username: m.senderId.username,
          avatarUrl: m.senderId.avatarUrl,
        }
      : null,
  }));
};

export const paginationMeta = () => ({ pageSize: PAGE_SIZE });