import mongoose from "mongoose";

const privacySchema = new mongoose.Schema(
  {
    lastSeen: { type: String, enum: ["everyone", "contacts", "nobody"], default: "everyone" },
    profilePhoto: { type: String, enum: ["everyone", "contacts", "nobody"], default: "everyone" },
    readReceipts: { type: Boolean, default: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_.-]+$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phone: { type: String, trim: true, default: "" },
    passwordHash: { type: String, required: true, select: false },
    avatarUrl: { type: String, default: "" },
    about: { type: String, default: "", maxlength: 200 },
    isOnline: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: Date.now },
    privacy: { type: privacySchema, default: () => ({}) },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    mutedConversations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Conversation" }],
  },
  { timestamps: true }
);

userSchema.index({ name: "text", username: "text", email: "text" });

const User = mongoose.model("User", userSchema);

export default User;