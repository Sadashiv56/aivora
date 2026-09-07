import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(60),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_.-]+$/i, "Invalid username"),
  email: z.string().email("Invalid email"),
  phone: z.string().max(20).optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const refreshSchema = z.object({}).optional();

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_.-]+$/i, "Invalid username")
    .optional(),
  phone: z.string().max(20).optional().or(z.literal("")),
  about: z.string().max(200).optional().or(z.literal("")),
  avatarUrl: z.string().refine((v) => v === "" || /\.[a-z0-9]+(?:\?.*)?$/i.test(v)).optional().or(z.literal("")),
  privacy: z
    .object({
      lastSeen: z.enum(["everyone", "contacts", "nobody"]).optional(),
      profilePhoto: z.enum(["everyone", "contacts", "nobody"]).optional(),
      readReceipts: z.boolean().optional(),
    })
    .optional(),
});

export const userSearchSchema = z.object({
  q: z.string().min(1).max(60),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export const createConversationSchema = z.object({
  userId: z.string().min(1),
});

export const messageCreateSchema = z.object({
  conversationId: z.string().min(1),
  type: z.enum(["text", "image", "video", "audio", "document"]).default("text"),
  text: z.string().max(10000).optional().or(z.literal("")),
  replyToMessageId: z.string().optional().nullable(),
  tempId: z.string().max(64).optional(),
});

export const editMessageSchema = z.object({
  text: z.string().min(1).max(10000),
});

export const reactionSchema = z.object({
  emoji: z.string().min(1).max(16),
});

export const createGroupSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(400).optional().or(z.literal("")),
  memberIds: z.array(z.string().min(1)).max(200).default([]),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  description: z.string().max(400).optional(),
  avatarUrl: z.string().refine((v) => v === "" || v.startsWith("/uploads/") || /^https?:\/\//i.test(v)).optional().or(z.literal("")),
  settings: z
    .object({
      onlyAdminsCanEditInfo: z.boolean().optional(),
      onlyAdminsCanSend: z.boolean().optional(),
    })
    .optional(),
});

export const addGroupMembersSchema = z.object({
  memberIds: z.array(z.string().min(1)).max(200),
});

export const promoteGroupMemberSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export const blockSchema = z.object({
  userId: z.string().min(1),
});

export const searchMessagesSchema = z.object({
  q: z.string().min(1).max(100),
  conversationId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});