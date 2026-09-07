import { success } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createGroup,
  getGroup,
  updateGroup,
  addMembers,
  removeMember,
  leaveGroup,
  setMemberRole,
  deleteGroup,
  toGroupView,
} from "../services/group.service.js";

export const create = asyncHandler(async (req, res) => {
  const { group, conversation } = await createGroup({
    userId: req.userId,
    name: req.body.name,
    description: req.body.description,
    memberIds: req.body.memberIds,
  });
  return success(
    res,
    { group: toGroupView(await getGroup(group._id.toString())), conversationId: conversation._id.toString() },
    "Group created",
    201
  );
});

export const get = asyncHandler(async (req, res) => {
  const group = await getGroup(req.params.id);
  if (!group.members.some((m) => m.userId._id.toString() === req.userId)) {
    return success(res, {
      id: group._id.toString(),
      name: group.name,
      avatarUrl: group.avatarUrl,
      description: group.description,
      memberCount: group.members.length,
      joined: false,
    });
  }
  return success(res, toGroupView(group));
});

export const update = asyncHandler(async (req, res) => {
  const group = await updateGroup({
    groupId: req.params.id,
    userId: req.userId,
    updates: req.body,
  });
  return success(res, toGroupView(await getGroup(group._id.toString())), "Group updated");
});

export const add = asyncHandler(async (req, res) => {
  const group = await addMembers({
    groupId: req.params.id,
    userId: req.userId,
    memberIds: req.body.memberIds,
  });
  return success(res, toGroupView(await getGroup(group._id.toString())), "Members added");
});

export const remove = asyncHandler(async (req, res) => {
  const group = await removeMember({
    groupId: req.params.id,
    userId: req.userId,
    targetId: req.params.userId,
  });
  return success(res, toGroupView(await getGroup(group._id.toString())), "Member removed");
});

export const leave = asyncHandler(async (req, res) => {
  const group = await leaveGroup({ groupId: req.params.id, userId: req.userId });
  return success(res, toGroupView(await getGroup(group._id.toString())), "Left group");
});

export const role = asyncHandler(async (req, res) => {
  const group = await setMemberRole({
    groupId: req.params.id,
    userId: req.userId,
    targetId: req.params.userId,
    role: req.body.role,
  });
  return success(res, toGroupView(await getGroup(group._id.toString())), "Role updated");
});

export const destroy = asyncHandler(async (req, res) => {
  await deleteGroup({ groupId: req.params.id, userId: req.userId });
  return success(res, { id: req.params.id }, "Group deleted");
});