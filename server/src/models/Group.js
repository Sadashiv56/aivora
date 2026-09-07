import mongoose from "mongoose";

const groupMemberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["member", "admin", "owner"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 60 },
    description: { type: String, default: "", maxlength: 400 },
    avatarUrl: { type: String, default: "" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    members: { type: [groupMemberSchema], default: [] },
    settings: {
      onlyAdminsCanEditInfo: { type: Boolean, default: false },
      onlyAdminsCanSend: { type: Boolean, default: false },
    },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
  },
  { timestamps: true }
);

groupSchema.index({ "members.userId": 1 });

const Group = mongoose.model("Group", groupSchema);

export default Group;