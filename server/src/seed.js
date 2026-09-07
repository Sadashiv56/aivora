import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import config from "./config/index.js";
import User from "./models/User.js";
import Conversation from "./models/Conversation.js";
import Message from "./models/Message.js";
import Group from "./models/Group.js";

const users = [
  {
    name: "Alice Johnson",
    username: "alice",
    email: "alice@example.com",
    phone: "+1 555 0100",
    password: "password123",
    about: "Hey there! I am using WhatsApp Clone.",
  },
  {
    name: "Bob Smith",
    username: "bob",
    email: "bob@example.com",
    phone: "+1 555 0101",
    password: "password123",
    about: "Building great things.",
  },
  {
    name: "Carol Davis",
    username: "carol",
    email: "carol@example.com",
    phone: "+1 555 0102",
    password: "password123",
    about: "Coffee first, code second.",
  },
  {
    name: "Dave Wilson",
    username: "dave",
    email: "dave@example.com",
    phone: "+1 555 0103",
    password: "password123",
    about: "Available on weekends.",
  },
];

const seed = async () => {
  await mongoose.connect(config.mongoUri);
  console.log("Connected. Dropping existing collections...");
  await Promise.all([
    User.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
    Group.deleteMany({}),
  ]);

  const created = [];
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const doc = await User.create({ ...u, passwordHash });
    created.push(doc);
    console.log(`  created user: ${u.username} (${doc._id})`);
  }

  const [alice, bob, carol, dave] = created;

  // Direct + group conversations with sample messages
  const direct = await Conversation.create({
    type: "direct",
    participants: [alice._id, bob._id],
    createdBy: alice._id,
  });

  const groupDoc = await Group.create({
    name: "Night Owls",
    description: "Late night coding crew",
    ownerId: alice._id,
    admins: [alice._id, carol._id],
    members: [
      { userId: alice._id, role: "owner" },
      { userId: bob._id, role: "member" },
      { userId: carol._id, role: "admin" },
      { userId: dave._id, role: "member" },
    ],
  });

  const groupConvo = await Conversation.create({
    type: "group",
    participants: [alice._id, bob._id, carol._id, dave._id],
    groupId: groupDoc._id,
    createdBy: alice._id,
  });
  groupDoc.conversationId = groupConvo._id;
  await groupDoc.save();

  const sampleTexts = [
    ["Hey Bob! Welcome aboard 🎉", alice._id, direct._id],
    ["Thanks Alice! Great to be here.", bob._id, direct._id],
    ["Did you check the pull request?", bob._id, direct._id],
    ["Yes! Looks good, just fix the typo in the docs 😄", alice._id, direct._id],
    ["On it now.", bob._id, direct._id],
    ["Welcome to Night Owls everyone 🌙", alice._id, groupConvo._id],
    ["Who's up for a coding sprint tonight?", carol._id, groupConvo._id],
    ["Count me in!", dave._id, groupConvo._id],
    ["Let's go 🚀", bob._id, groupConvo._id],
  ];

  let lastMsg = null;
  let lastAt = new Date();

  for (const [text, sender, convoId] of sampleTexts) {
    lastAt = new Date(lastAt.getTime() + 1000 * 60 * 5);
    const msg = await Message.create({
      conversationId: convoId,
      senderId: sender,
      type: "text",
      text,
      createdAt: lastAt,
      deliveredTo: created.map((u) => u._id).filter((id) => !id.equals(sender)),
      readBy: [alice._id, bob._id],
    });
    lastMsg = msg;
  }

  await Conversation.findByIdAndUpdate(direct._id, { lastMessageId: lastMsg._id, lastMessageAt: lastAt });
  await Conversation.findByIdAndUpdate(groupConvo._id, {
    lastMessageId: lastMsg._id,
    lastMessageAt: lastAt,
  });

  console.log("\nSeed complete.");
  console.log("\nDemo accounts (all passwords: password123):");
  users.forEach((u) => console.log(`  ${u.email}  /  ${u.username}`));
  await mongoose.disconnect();
};

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });