import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { success } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { serializeUser, serializeUserLight } from "../utils/serialize.js";
import mongoose from "mongoose";

const PUBLIC_FIELDS = "name username email phone avatarUrl about isOnline lastSeenAt privacy createdAt updatedAt";

export const me = asyncHandler(async (req, res) => {
  return success(res, serializeUser(req.user), "Current user");
});

export const updateMe = asyncHandler(async (req, res) => {
  const updates = {};
  const body = req.body;

  if (body.name !== undefined) updates.name = body.name;
  if (body.username !== undefined) updates.username = body.username;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.about !== undefined) updates.about = body.about;
  if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl;
  if (body.privacy !== undefined) {
    const merged = { ...(req.user.privacy?.toObject?.() || {}), ...body.privacy };
    updates.privacy = merged;
  }

  const user = await User.findByIdAndUpdate(req.userId, updates, { new: true, runValidators: true });
  return success(res, serializeUser(user), "Profile updated");
});

export const searchUsers = asyncHandler(async (req, res) => {
  const { q, limit, cursor } = req.query;
  const textFilter = { $or: [{ name: { $regex: q, $options: "i" } }, { username: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }] };
  const filter = {
    $and: [
      textFilter,
      { _id: { $ne: new mongoose.Types.ObjectId(req.userId) } },
      { blockedUsers: { $ne: req.userId } },
    ],
  };
  if (cursor) filter.$and.push({ _id: { $gt: new mongoose.Types.ObjectId(cursor) } });

  const users = await User.find(filter).sort({ _id: 1 }).limit(parseInt(limit, 10) || 20);
  const nextCursor = users.length ? users[users.length - 1]._id.toString() : null;
  return success(res, {
    users: users.map(serializeUserLight),
    nextCursor,
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(PUBLIC_FIELDS);
  if (!user) throw ApiError.notFound("User not found");
  return success(res, serializeUser(user));
});

export const blockUser = asyncHandler(async (req, res) => {
  const targetId = req.body.userId;
  if (targetId === req.userId) throw ApiError.badRequest("Cannot block yourself");
  const target = await User.findById(targetId);
  if (!target) throw ApiError.notFound("User not found");
  if (!(req.user.blockedUsers || []).some((id) => id.toString() === targetId)) {
    req.user.blockedUsers.push(targetId);
    await req.user.save();
  }
  return success(res, { blocked: true }, "User blocked");
});

export const unblockUser = asyncHandler(async (req, res) => {
  const targetId = req.params.userId;
  req.user.blockedUsers = (req.user.blockedUsers || []).filter((id) => id.toString() !== targetId);
  await req.user.save();
  return success(res, { blocked: false }, "User unblocked");
});

export const blockedUsers = asyncHandler(async (req, res) => {
  await req.user.populate("blockedUsers", "name username avatarUrl");
  const users = (req.user.blockedUsers || []).map((u) => ({
    id: u._id.toString(),
    name: u.name,
    username: u.username,
    avatarUrl: u.avatarUrl,
  }));
  return success(res, { users });
});

export const reportUser = asyncHandler(async (req, res) => {
  const targetId = req.params.userId;
  const target = await User.findById(targetId);
  if (!target) throw ApiError.notFound("User not found");
  // MVP: log the report. A real deployment would persist to a reports collection.
  console.info(`[report] ${req.userId} reported ${targetId}`);
  return success(res, { reported: true }, "Report submitted");
});