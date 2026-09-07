import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Group from "../models/Group.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";

export const findOrCreateDirectConversation = async (userId, otherUserId) => {
  const a = new mongoose.Types.ObjectId(userId);
  const b = new mongoose.Types.ObjectId(otherUserId);
  if (a.equals(b)) throw ApiError.badRequest("Cannot start a chat with yourself");

  const existing = await Conversation.findOne({
    type: "direct",
    participants: { $size: 2, $all: [a, b] },
  });

  if (existing) return existing;

  const conversation = await Conversation.create({
    type: "direct",
    participants: [a, b],
    createdBy: a,
  });
  return conversation;
};

export const assertMember = async (conversationId, userId) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });
  if (!conversation) {
    throw ApiError.forbidden("You are not a participant of this conversation");
  }
  return conversation;
};

export const assertNotBlocked = async (me, otherId) => {
  const other = await User.findById(otherId);
  if (!other) throw ApiError.notFound("User not found");
  const blockedByOther = (other.blockedUsers || []).some(
    (id) => id.toString() === me._id.toString()
  );
  const blockedByMe = (me.blockedUsers || []).some((id) => id.toString() === otherId);
  if (blockedByOther) {
    throw ApiError.forbidden("You cannot message this user", "BLOCKED");
  }
  if (blockedByMe) {
    throw ApiError.forbidden("Unblock this user before messaging", "BLOCKED");
  }
  return other;
};

export const createSystemMessage = async (conversationId, senderId, text) => {
  const message = await Message.create({
    conversationId,
    senderId,
    type: "system",
    text,
  });
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessageId: message._id,
    lastMessageAt: new Date(),
  });
  return message;
};

export const listConversationsForUser = async (userId, limit = 50, cursor) => {
  const filter = { participants: userId };
  if (cursor) filter.lastMessageAt = { $lt: new Date(cursor) };
  const conversations = await Conversation.find(filter)
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .populate("participants", "name username avatarUrl isOnline lastSeenAt about")
    .populate({
      path: "lastMessageId",
      select: "type text senderId attachments createdAt status readBy deliveredTo",
    })
    .populate({ path: "groupId", select: "name avatarUrl description" })
    .lean();

  const groupIds = conversations
    .map((c) => c.groupId?._id?.toString())
    .filter(Boolean);

  const groups = groupIds.length
    ? await Group.find({ _id: { $in: groupIds } }).lean()
    : [];
  const groupMap = new Map(groups.map((g) => [g._id.toString(), g]));

  return conversations.map((c) => {
    const group = c.groupId ? groupMap.get(c.groupId._id.toString()) || null : null;
    const other = c.type === "direct" ? c.participants.find((p) => p._id.toString() !== userId) : null;
    return {
      id: c._id.toString(),
      type: c.type,
      participants: c.participants.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        username: p.username,
        avatarUrl: p.avatarUrl,
        isOnline: p.isOnline,
        lastSeenAt: p.lastSeenAt,
        about: p.about,
      })),
      group: group
        ? {
            id: group._id.toString(),
            name: group.name,
            avatarUrl: group.avatarUrl,
            description: group.description,
          }
        : null,
      peer: other
        ? {
            id: other._id.toString(),
            name: other.name,
            username: other.username,
            avatarUrl: other.avatarUrl,
            isOnline: other.isOnline,
            lastSeenAt: other.lastSeenAt,
            about: other.about,
          }
        : null,
      lastMessage: c.lastMessageId
        ? {
            id: c.lastMessageId._id.toString(),
            type: c.lastMessageId.type,
            text: c.lastMessageId.text,
            senderId: c.lastMessageId.senderId?.toString(),
            createdAt: c.lastMessageId.createdAt,
            status: c.lastMessageId.status,
          }
        : null,
      lastMessageAt: c.lastMessageAt,
      createdAt: c.createdAt,
    };
  });
};

export const getConversationById = async (conversationId, userId) => {
  const conversation = await assertMember(conversationId, userId);
  return conversation;
};

export const getPeerId = (conversation, userId) => {
  if (conversation.type === "direct") {
    const other = conversation.participants.find((p) => p.toString() !== userId);
    return other ? other.toString() : null;
  }
  return null;
};