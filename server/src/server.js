import { Server } from "socket.io";
import { createServer } from "http";
import config from "./config/index.js";
import app from "./app.js";
import connectDB from "./config/db.js";
import { verifyAccessToken } from "./utils/token.js";
import User from "./models/User.js";
import Conversation from "./models/Conversation.js";
import { serializeUser } from "./utils/serialize.js";
import {
  createMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
  markDelivered,
  markRead,
  serializeMessageForSocket,
} from "./services/message.service.js";
import { assertMember } from "./services/conversation.service.js";
import { Redis } from "ioredis";

const httpServer = createServer(app);

// Same comma-separated origin allow-list used by the REST CORS middleware.
const socketAllowedOrigins = (config.clientUrl || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: config.env === "production" ? socketAllowedOrigins : true,
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

async function attachRedisAdapter() {
  if (!config.redisUrl) return;
  const redisClient = new Redis(config.redisUrl);
  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();
  io.adapter(require("@socket.io/redis-adapter").createAdapter(pubClient, subClient));
  console.log("[socket] connected to Redis adapter");
}

const getTokens = (socket) =>
  socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace("Bearer ", "") || null;

async function authenticateSocket(socket) {
  const token = getTokens(socket);
  if (!token) throw new Error("NO_TOKEN");
  const payload = verifyAccessToken(token);
  const user = await User.findById(payload.sub);
  if (!user) throw new Error("NO_USER");
  return user;
}

function sanitize(text = "") {
  return String(text).slice(0, 10000);
}

async function joinUserRooms(socket, userId) {
  socket.join(`user:${userId}`);
  const conversations = await Conversation.find({ participants: userId }).select("_id");
  conversations.forEach((c) => socket.join(`conversation:${c._id.toString()}`));
}

const onlineFlags = new Map();

function registerHandlers(socket, user) {
  const userId = user._id.toString();

  socket.on("conversation:join", async (data, ack) => {
    try {
      await assertMember(data.conversationId, userId);
      socket.join(`conversation:${data.conversationId}`);
      await deliverOnJoin(data.conversationId, userId);
      ack?.({ success: true });
    } catch (err) {
      ack?.({ success: false, message: err.message });
    }
  });

  socket.on("conversation:leave", (data, ack) => {
    socket.leave(`conversation:${data.conversationId}`);
    ack?.({ success: true });
  });

  socket.on("message:send", async (payload, ack) => {
    try {
      const message = await createMessage({
        userId,
        conversationId: payload.conversationId,
        type: payload.type,
        text: sanitize(payload.text),
        replyToMessageId: payload.replyToMessageId,
        tempId: payload.tempId,
        attachments:
          Array.isArray(payload.attachments) && payload.attachments.length
            ? payload.attachments.slice(0, 10)
            : undefined,
      });
      const full = await serializeMessageForSocket(message);
      full.sender = {
        id: userId,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
      };
      socket.broadcast.to(`conversation:${message.conversationId.toString()}`).emit("message:new", full);
      ack?.({ success: true, message: full });
    } catch (err) {
      ack?.({ success: false, message: err.message });
    }
  });

  socket.on("typing:start", async (data, ack) => {
    try {
      await assertMember(data.conversationId, userId);
      socket.to(`conversation:${data.conversationId}`).emit("typing:update", {
        conversationId: data.conversationId,
        userId,
        name: user.name,
        typing: true,
      });
      ack?.({ success: true });
    } catch (err) {
      ack?.({ success: false, message: err.message });
    }
  });

  socket.on("typing:stop", async (data, ack) => {
    try {
      await assertMember(data.conversationId, userId);
      socket.to(`conversation:${data.conversationId}`).emit("typing:update", {
        conversationId: data.conversationId,
        userId,
        name: user.name,
        typing: false,
      });
      ack?.({ success: true });
    } catch (err) {
      ack?.({ success: false, message: err.message });
    }
  });

  socket.on("message:delivered", async (data, ack) => {
    try {
      await assertMember(data.conversationId, userId);
      const messageIds = await markDelivered(data.conversationId, userId);
      if (messageIds.length) {
        io.to(`conversation:${data.conversationId}`).emit("message:status", {
          conversationId: data.conversationId,
          messageIds,
          userId,
          status: "delivered",
        });
      }
      ack?.({ success: true, messageIds });
    } catch (err) {
      ack?.({ success: false, message: err.message });
    }
  });

  socket.on("message:read", async (data, ack) => {
    try {
      await assertMember(data.conversationId, userId);
      const messageIds = await markRead(data.conversationId, userId);
      if (messageIds.length) {
        io.to(`conversation:${data.conversationId}`).emit("message:status", {
          conversationId: data.conversationId,
          messageIds,
          userId,
          status: "read",
        });
      }
      ack?.({ success: true, messageIds });
    } catch (err) {
      ack?.({ success: false, message: err.message });
    }
  });

  socket.on("message:edit", async (data, ack) => {
    try {
      const message = await editMessage(data.messageId, userId, sanitize(data.text));
      io.to(`conversation:${message.conversationId.toString()}`).emit("message:updated", {
        conversationId: message.conversationId.toString(),
        messageId: message._id.toString(),
        text: message.text,
        editedAt: message.editedAt,
      });
      ack?.({ success: true });
    } catch (err) {
      ack?.({ success: false, message: err.message });
    }
  });

  socket.on("message:delete", async (data, ack) => {
    try {
      const message = await deleteMessage(data.messageId, userId, data.conversationId);
      io.to(`conversation:${message.conversationId.toString()}`).emit("message:deleted", {
        conversationId: message.conversationId.toString(),
        messageId: message._id.toString(),
      });
      ack?.({ success: true });
    } catch (err) {
      ack?.({ success: false, message: err.message });
    }
  });

  socket.on("reaction:add", async (data, ack) => {
    try {
      const message = await toggleReaction(data.messageId, userId, String(data.emoji || "").slice(0, 16));
      io.to(`conversation:${message.conversationId.toString()}`).emit("reaction:updated", {
        conversationId: message.conversationId.toString(),
        messageId: message._id.toString(),
        reactions: (message.reactions || []).map((r) => ({
          userId: r.userId.toString(),
          emoji: r.emoji,
        })),
      });
      ack?.({ success: true });
    } catch (err) {
      ack?.({ success: false, message: err.message });
    }
  });

  socket.on("user:offlineManual", async (ack) => {
    user.isOnline = false;
    user.lastSeenAt = new Date();
    await user.save().catch(() => {});
    await broadcastPresence(user, false);
    ack?.({ success: true });
  });
}

async function deliverMissedOnConnect(userId) {
  const conversations = await Conversation.find({ participants: userId }).select("_id");
  for (const c of conversations) {
    await deliverOnJoin(c._id.toString(), userId);
  }
}

async function deliverOnJoin(conversationId, userId) {
  const messageIds = await markDelivered(conversationId, userId);
  if (messageIds.length) {
    io.to(`conversation:${conversationId}`).emit("message:status", {
      conversationId,
      messageIds,
      userId,
      status: "delivered",
    });
  }
}

async function broadcastPresence(user, online) {  const userId = user._id.toString();
  const conversations = await Conversation.find({ participants: userId }).select("_id");
  const payload = {
    user: { id: userId, isOnline: online, lastSeenAt: user.lastSeenAt || new Date() },
  };
  conversations.forEach((c) => {
    io.to(`conversation:${c._id.toString()}`).emit(online ? "user:online" : "user:offline", payload);
  });
}

io.use(async (socket, next) => {
  try {
    const user = await authenticateSocket(socket);
    socket.user = user;
    next();
  } catch (err) {
    next(new Error(err.message || "UNAUTHORIZED"));
  }
});

io.on("connection", async (socket) => {
  const user = socket.user;
  const userId = user._id.toString();

  registerHandlers(socket, user);

  await joinUserRooms(socket, userId);

  const alreadyOnline = onlineFlags.get(userId);
  onlineFlags.set(userId, true);
  user.isOnline = true;
  user.lastSeenAt = new Date();
  await user.save().catch(() => {});
  if (!alreadyOnline) {
    await broadcastPresence(user, true);
    await deliverMissedOnConnect(userId);
  }

  socket.emit("user:online", { user: { id: userId, isOnline: true } });

  socket.on("disconnect", async () => {
    if (socket.adapter?.rooms?.size === 0) {
      /* handled below by tracking sockets per user */
    }
  });
});

io.on("connection", (socket) => {
  const onDisc = async () => {
    const userId = socket.user?._id?.toString();
    if (!userId) return;
    const remaining = await io.in(`user:${userId}`).fetchSockets();
    if (remaining.length === 0) {
      onlineFlags.set(userId, false);
      const user = await User.findById(userId).catch(() => null);
      if (user) {
        user.isOnline = false;
        user.lastSeenAt = new Date();
        await user.save().catch(() => {});
        await broadcastPresence(user, false);
      }
    }
  };
  socket.on("disconnect", onDisc);
});

export const publishGroupUpdate = async (group) => {
  const conversationId = group.conversationId?.toString();
  if (!conversationId) return;
  const data = {
    id: group._id.toString(),
    name: group.name,
    avatarUrl: group.avatarUrl,
    description: group.description,
  };
  io.to(`conversation:${conversationId}`).emit("group:updated", data);
};

export const publishUserUpdate = async (user) => {
  const payload = { user: serializeUser(user) };
  const conversations = await Conversation.find({
    participants: user._id,
  }).select("_id");
  conversations.forEach((c) => {
    io.to(`conversation:${c._id.toString()}`).emit("user:updated", payload);
  });
};

export const getIO = () => io;

const bootstrap = async () => {
  await connectDB();
  await attachRedisAdapter();
  httpServer.listen(config.port, () => {
    console.log(`[server] API + Socket.IO running on http://localhost:${config.port}`);
  });
};

const gracefulShutdown = async () => {
  console.log("[server] shutting down...");
  io.close();
  httpServer.close();
  process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

bootstrap();