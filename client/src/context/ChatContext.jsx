import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { api } from "../services/api";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";

const ChatContext = createContext(null);

const upsertMessages = (list, incoming) => {
  let next = list;
  for (const msg of incoming) {
    const byId = next.findIndex((m) => m.id && m.id === msg.id);
    if (byId !== -1) {
      const copy = [...next];
      copy[byId] = { ...copy[byId], ...msg };
      next = copy;
      continue;
    }
    if (msg.tempId) {
      const byTemp = next.findIndex((m) => m.tempId && m.tempId === msg.tempId);
      if (byTemp !== -1) {
        const copy = [...next];
        copy[byTemp] = { ...copy[byTemp], ...msg };
        next = copy;
        continue;
      }
    }
    next = [...next, msg];
  }
  return next;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { on, emit, connected } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState({});
  const [hasMore, setHasMore] = useState({});
  const [nextCursor, setNextCursor] = useState({});
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typing, setTyping] = useState({});
  const [unread, setUnread] = useState({});
  const [reconnecting, setReconnecting] = useState(false);

  const activeIdRef = useRef(null);
  activeIdRef.current = activeId;

  const lastMsgAtRef = useRef({});

  const loadConversations = useCallback(async () => {
    setLoadingChats(true);
    try {
      const res = await api.get("/conversations");
      setConversations(res.data.data.conversations);
      if (!activeIdRef.current && res.data.data.conversations.length) {
        setActiveId(res.data.data.conversations[0].id);
      }
    } finally {
      setLoadingChats(false);
    }
  }, [activeIdRef]);

  const openConversation = useCallback(
    async (convId) => {
      setActiveId(convId);
      emit("conversation:join", { conversationId: convId });
      setUnread((prev) => ({ ...prev, [convId]: 0 }));
      if (!messages[convId] || messages[convId].length === 0) {
        await loadMessages(convId);
      } else {
        emit("message:read", { conversationId: convId });
        const res = await api.post(`/conversations/${convId}/read`).catch(() => null);
        if (res?.data?.data?.read?.length) {
          applyRead(convId, res.data.data.read);
        }
      }
    },
    [emit, messages]
  );

  const closeConversation = useCallback(() => {
    setActiveId(null);
  }, []);

  const loadMessages = useCallback(
    async (convId, { before } = {}) => {
      setLoadingMessages(true);
      try {
        const res = await api.get(`/conversations/${convId}/messages`, {
          params: before ? { before } : { limit: 40 },
        });
        const data = res.data.data;
        setMessages((prev) => {
          const existing = prev[convId] || [];
          if (!before) {
            return { ...prev, [convId]: upsertMessages([], [...data.messages, ...existing]) };
          }
          const merged = upsertMessages([], [...data.messages, ...existing]);
          return { ...prev, [convId]: merged };
        });
        setHasMore((prev) => ({ ...prev, [convId]: data.hasMore }));
        setNextCursor((prev) => ({ ...prev, [convId]: data.nextCursor }));
        if (data.messages.length) {
          lastMsgAtRef.current[convId] = data.messages[data.messages.length - 1].createdAt;
        }
        return data;
      } finally {
        setLoadingMessages(false);
      }
    },
    []
  );

  const applyRead = useCallback((convId, messageIds) => {
    const ids = new Set(messageIds);
    setMessages((prev) => ({
      ...prev,
      [convId]: (prev[convId] || []).map((m) =>
        ids.has(m.id) ? { ...m, readBy: [...new Set([...(m.readBy || []), user?.id])] } : m
      ),
    }));
  }, [user]);

  const sendMessage = useCallback(
    async (convId, { type = "text", text = "", replyToMessageId = null, attachments, file }) => {
      if (!text && !attachments?.length && !file) return;
      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const optimistic = {
        id: tempId,
        conversationId: convId,
        senderId: user?.id,
        type: file ? file.kind || "document" : type,
        text,
        attachments: attachments || [],
        replyToMessageId,
        reactions: [],
        deliveredTo: [],
        readBy: [user?.id],
        editedAt: null,
        deletedAt: null,
        tempId,
        _pending: true,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => ({
        ...prev,
        [convId]: [...(prev[convId] || []), optimistic],
      }));
      updateConversationPreview(convId, optimistic, user);

      emit(
        "message:send",
        { conversationId: convId, type, text, replyToMessageId, attachments, tempId, filePayload: file?.payload },
        (ack) => {
          if (ack?.success) {
            setMessages((prev) => ({
              ...prev,
              [convId]: upsertMessages(prev[convId] || [], [{ ...ack.message, _pending: false }]),
            }));
          } else if (ack?.message) {
            setMessages((prev) => ({
              ...prev,
              [convId]: (prev[convId] || []).map((m) =>
                m.id === tempId ? { ...m, _error: ack.message } : m
              ),
            }));
          }
        }
      );
      return tempId;
    },
    [emit, user]
  );

  const updateConversationPreview = (convId, message, me) => {
    setConversations((prev) =>
      prev
        .map((c) =>
          c.id === convId
            ? {
                ...c,
                lastMessage: {
                  id: message.id,
                  type: message.type,
                  text: message.text,
                  senderId: message.senderId,
                  createdAt: message.createdAt,
                },
                lastMessageAt: message.createdAt,
              }
            : c
        )
        .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
    );
  };

  const editMessage = useCallback((convId, messageId, text) => {
    emit("message:edit", { messageId, text }, () => {});
    setMessages((prev) => ({
      ...prev,
      [convId]: (prev[convId] || []).map((m) =>
        m.id === messageId ? { ...m, text, editedAt: new Date().toISOString() } : m
      ),
    }));
  }, [emit]);

  const deleteMessage = useCallback((convId, messageId) => {
    emit("message:delete", { messageId, conversationId: convId }, () => {});
    setMessages((prev) => ({
      ...prev,
      [convId]: (prev[convId] || []).map((m) =>
        m.id === messageId ? { ...m, deletedAt: new Date().toISOString(), text: "" } : m
      ),
    }));
  }, [emit]);

  const toggleReaction = useCallback(
    (convId, messageId, emoji) => {
      emit(
        "reaction:add",
        { messageId, emoji },
        (ack) => {
          if (ack?.success) {
            setMessages((prev) => ({
              ...prev,
              [convId]: (prev[convId] || []).map((m) => {
                if (m.id !== messageId) return m;
                const mine = (m.reactions || []).filter((r) => r.userId === user?.id);
                const others = (m.reactions || []).filter((r) => r.userId !== user?.id);
                if (mine.length) {
                  if (mine[0].emoji === emoji) return { ...m, reactions: others };
                  return { ...m, reactions: [...others, { userId: user?.id, emoji }] };
                }
                return { ...m, reactions: [...others, { userId: user?.id, emoji }] };
              }),
            }));
          }
        }
      );
    },
    [emit, user]
  );

  const startTyping = useCallback((convId) => {
    emit("typing:start", { conversationId: convId }, () => {});
  }, [emit]);

  const stopTyping = useCallback((convId) => {
    emit("typing:stop", { conversationId: convId }, () => {});
  }, [emit]);

  // ---- socket event wiring ----
  useEffect(() => {
    if (!connected || !user) return;

    const offs = [
      on("message:new", (msg) => {
        setMessages((prev) => ({
          ...prev,
          [msg.conversationId]: upsertMessages(prev[msg.conversationId] || [], [msg]),
        }));
        updateConversationPreview(msg.conversationId, msg, user);
        const isSender = msg.senderId === user.id;
        const isActive = activeIdRef.current === msg.conversationId;
        if (!isSender && !isActive) {
          setUnread((prev) => ({ ...prev, [msg.conversationId]: (prev[msg.conversationId] || 0) + 1 }));
        }
        if (!isSender) {
          emit("message:delivered", { conversationId: msg.conversationId }, () => {});
          if (isActive) {
            emit("message:read", { conversationId: msg.conversationId }, () => {});
          }
        }
      }),
      on("message:updated", ({ conversationId, messageId, text, editedAt }) => {
        setMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).map((m) =>
            m.id === messageId ? { ...m, text, editedAt } : m
          ),
        }));
      }),
      on("message:deleted", ({ conversationId, messageId }) => {
        setMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).map((m) =>
            m.id === messageId ? { ...m, deletedAt: new Date().toISOString(), text: "" } : m
          ),
        }));
      }),
      on("reaction:updated", ({ conversationId, messageId, reactions }) => {
        setMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).map((m) =>
            m.id === messageId ? { ...m, reactions } : m
          ),
        }));
      }),
      on("message:status", ({ conversationId, messageIds, status, userId }) => {
        if (!userId) return;
        const ids = new Set(messageIds);
        setMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).map((m) => {
            if (!ids.has(m.id)) return m;
            if (status === "read") {
              return { ...m, readBy: [...new Set([...(m.readBy || []), userId])], deliveredTo: [...new Set([...(m.deliveredTo || []), userId])] };
            }
            return { ...m, deliveredTo: [...new Set([...(m.deliveredTo || []), userId])] };
          }),
        }));
      }),
      on("typing:update", ({ conversationId, userId, name, typing }) => {
        setTyping((prev) => {
          const next = { ...prev };
          if (!next[conversationId]) next[conversationId] = {};
          if (typing) next[conversationId][userId] = name;
          else delete next[conversationId][userId];
          return next;
        });
      }),
      on("user:online", ({ user: p }) => patchPeer(p)),
      on("user:offline", ({ user: p }) => patchPeer(p)),
      on("user:updated", ({ user: p }) => {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.type === "direct" && c.peer?.id === p.id) return { ...c, peer: { ...c.peer, ...p } };
            if (c.type === "group") {
              const members = c.group?.members?.map?.((m) => (m.id === p.id ? { ...m, ...p } : m));
              return members ? { ...c, group: { ...c.group, members } } : c;
            }
            return c;
          })
        );
      }),
      on("group:updated", (group) => {
        setConversations((prev) =>
          prev.map((c) => (c.group?.id === group.id ? { ...c, group: { ...c.group, ...group } } : c))
        );
      }),
    ];

    const patchPeer = (p) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.type === "direct" && c.peer?.id === p.id
            ? { ...c, peer: { ...c.peer, isOnline: p.isOnline, lastSeenAt: p.lastSeenAt } }
            : c
        )
      );
    };

    return () => offs.forEach((off) => off());
  }, [connected, user]);

  const wasConnectedRef = useRef(false);
  useEffect(() => {
    if (connected) {
      if (wasConnectedRef.current) setReconnecting(false);
      wasConnectedRef.current = true;
    } else if (wasConnectedRef.current) {
      setReconnecting(true);
    }
  }, [connected]);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeId,
        messages,
        hasMore,
        nextCursor,
        unread,
        typing,
        loadingChats,
        loadingMessages,
        connected,
        reconnecting,
        setReconnecting,
        loadConversations,
        openConversation,
        closeConversation,
        loadMessages,
        sendMessage,
        editMessage,
        deleteMessage,
        toggleReaction,
        startTyping,
        stopTyping,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};