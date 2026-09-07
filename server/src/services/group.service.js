import mongoose from "mongoose";
import Group from "../models/Group.js";
import Conversation from "../models/Conversation.js";
import { ApiError } from "../utils/ApiError.js";

export const createGroup = async ({ userId, name, description, memberIds }) => {
  const uniqueIds = [...new Set(memberIds.filter((id) => id !== userId))];

  const group = await Group.create({
    name,
    description: description || "",
    ownerId: userId,
    admins: [userId],
    members: [
      { userId, role: "owner", joinedAt: new Date() },
      ...uniqueIds.map((id) => ({ userId: id, role: "member", joinedAt: new Date() })),
    ],
  });

  const conversation = await Conversation.create({
    type: "group",
    participants: [userId, ...uniqueIds],
    groupId: group._id,
    createdBy: userId,
  });

  group.conversationId = conversation._id;
  await group.save();
  return { group, conversation };
};

export const getGroup = async (groupId) => {
  const group = await Group.findById(groupId).populate(
    "members.userId",
    "name username avatarUrl about isOnline lastSeenAt"
  );
  if (!group) throw ApiError.notFound("Group not found");
  return group;
};

const assertMember = async (groupId, userId) => {
  const group = await getGroup(groupId);
  const member = group.members.find((m) => m.userId._id.toString() === userId);
  if (!member) throw ApiError.forbidden("You are not a member of this group");
  return { group, member };
};

const isAdmin = (group, member) =>
  member.role === "admin" || member.role === "owner" || group.ownerId?.toString() === member.userId?._id?.toString();

export const updateGroup = async ({ groupId, userId, updates }) => {
  const { group, member } = await assertMember(groupId, userId);
  const requiresAdmin =
    updates.name !== undefined || updates.description !== undefined || updates.avatarUrl !== undefined;

  if (requiresAdmin && group.settings.onlyAdminsCanEditInfo && !isAdmin(group, member)) {
    throw ApiError.forbidden("Only admins can edit group info");
  }
  if (updates.settings && !isAdmin(group, member)) {
    throw ApiError.forbidden("Only admins can change group settings");
  }
  if (updates.name !== undefined) group.name = updates.name;
  if (updates.description !== undefined) group.description = updates.description;
  if (updates.avatarUrl !== undefined) group.avatarUrl = updates.avatarUrl;
  if (updates.settings) {
    group.settings = { ...group.settings.toObject?.() || group.settings, ...updates.settings };
  }
  await group.save();
  return group;
};

export const addMembers = async ({ groupId, userId, memberIds }) => {
  const { group, member } = await assertMember(groupId, userId);
  if (!isAdmin(group, member)) {
    throw ApiError.forbidden("Only admins can add members");
  }
  const existing = new Set(group.members.map((m) => m.userId._id.toString()));
  const newMembers = [...new Set(memberIds)].filter((id) => !existing.has(id));
  group.members.push(
    ...newMembers.map((id) => ({ userId: id, role: "member", joinedAt: new Date() }))
  );
  await group.save();
  await Conversation.findByIdAndUpdate(group.conversationId, {
    $addToSet: { participants: { $each: newMembers } },
  });
  return group;
};

export const removeMember = async ({ groupId, userId, targetId }) => {
  const { group, member } = await assertMember(groupId, userId);
  if (!isAdmin(group, member) && userId !== targetId) {
    throw ApiError.forbidden("Only admins can remove members");
  }
  if (group.ownerId?.toString() === targetId) {
    throw ApiError.badRequest("Cannot remove the group owner");
  }
  group.members = group.members.filter((m) => m.userId._id.toString() !== targetId);
  group.admins = group.admins.filter((id) => id.toString() !== targetId);
  await group.save();
  await Conversation.findByIdAndUpdate(group.conversationId, {
    $pull: { participants: targetId },
  });
  return group;
};

export const leaveGroup = async ({ groupId, userId }) => {
  const { group, member } = await assertMember(groupId, userId);
  if (group.ownerId?.toString() === userId) {
    throw ApiError.badRequest("Owner cannot leave; transfer ownership or delete the group");
  }
  group.members = group.members.filter((m) => m.userId._id.toString() !== userId);
  group.admins = group.admins.filter((id) => id.toString() !== userId);
  await group.save();
  await Conversation.findByIdAndUpdate(group.conversationId, {
    $pull: { participants: userId },
  });
  return group;
};

export const setMemberRole = async ({ groupId, userId, targetId, role }) => {
  const { group, member } = await assertMember(groupId, userId);
  if (!isAdmin(group, member)) {
    throw ApiError.forbidden("Only admins can change roles");
  }
  if (group.ownerId?.toString() === targetId) {
    throw ApiError.badRequest("Cannot change the owner's role");
  }
  const target = group.members.find((m) => m.userId._id.toString() === targetId);
  if (!target) throw ApiError.notFound("Member not found");
  target.role = role;
  if (role === "admin") {
    group.admins.push(targetId);
  } else {
    group.admins = group.admins.filter((id) => id.toString() !== targetId);
  }
  await group.save();
  return group;
};

export const deleteGroup = async ({ groupId, userId }) => {
  const group = await Group.findById(groupId);
  if (!group) throw ApiError.notFound("Group not found");
  if (group.ownerId?.toString() !== userId) {
    throw ApiError.forbidden("Only the owner can delete this group");
  }
  await Group.findByIdAndDelete(groupId);
  await Conversation.findByIdAndUpdate(group.conversationId, {
    lastMessageId: null,
  });
  return group;
};

export const toGroupView = (group) => {
  const doc = group.toObject ? group.toObject() : group;
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    avatarUrl: doc.avatarUrl,
    ownerId: doc.ownerId?.toString(),
    admins: (doc.admins || []).map((id) => id.toString()),
    settings: doc.settings || {},
    conversationId: doc.conversationId?.toString(),
    members: (doc.members || []).map((m) => ({
      user: m.userId && typeof m.userId === "object" && m.userId._id
        ? {
            id: m.userId._id.toString(),
            name: m.userId.name,
            username: m.userId.username,
            avatarUrl: m.userId.avatarUrl,
            about: m.userId.about,
            isOnline: m.userId.isOnline,
            lastSeenAt: m.userId.lastSeenAt,
          }
        : { id: String(m.userId) },
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    createdAt: doc.createdAt,
  };
};