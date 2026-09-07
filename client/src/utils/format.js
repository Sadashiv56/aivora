export const cn = (...args) => args.filter(Boolean).join(" ");

export const formatTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const formatDateLabel = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday - startOfDay) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: now.getFullYear() !== d.getFullYear() ? "numeric" : undefined });
};

export const lastSeenLabel = (user, currentUserId) => {
  if (!user) return "";
  if (user.id === currentUserId) return "";
  if (user.isOnline) return "online";
  if (!user.lastSeenAt) return "";
  const seen = formatDateTime(user.lastSeenAt);
  return `last seen ${seen}`;
};

export const formatDateTime = (iso) => {
  const d = new Date(iso);
  return `${formatDateLabel(iso)}, ${formatTime(iso)}`;
};

export const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

export const avatarColor = (seed = "") => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "#e57373", "#f06292", "#ba68c8", "#9575cd", "#7986cb",
    "#64b5f6", "#4fc3f7", "#4dd0e1", "#4db6ac", "#81c784",
    "#aed581", "#dce775", "#ffd54f", "#ffb74d", "#ff8a65",
  ];
  return colors[Math.abs(hash) % colors.length];
};

export const messageStatus = (msg, currentUserId) => {
  if (!msg || msg.senderId !== currentUserId) return null;
  if (msg.readBy?.some((id) => id !== currentUserId)) return "read";
  if (msg.deliveredTo?.some((id) => id !== currentUserId)) return "delivered";
  return "sent";
};

export const truncate = (text = "", max = 60) =>
  text.length > max ? `${text.slice(0, max)}…` : text;

export const groupLabel = (conversation, currentUserId) => {
  if (conversation.type === "group") {
    return conversation.group?.name || "Group";
  }
  return conversation.peer?.name || "Unknown";
};

export const conversationPreview = (conversation, currentUserId) => {
  if (!conversation.lastMessage) return "No messages yet";
  if (conversation.lastMessage.type === "image") return "📷 Photo";
  if (conversation.lastMessage.type === "video") return "🎥 Video";
  if (conversation.lastMessage.type === "audio") return "🎵 Audio";
  if (conversation.lastMessage.type === "document") return "📄 Document";
  if (conversation.lastMessage.type === "system") return conversation.lastMessage.text;
  return conversation.lastMessage.text || " ";
};

export const isSameDay = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

export const isSameMessageGroup = (current, previous) => {
  if (!previous) return false;
  if (current.senderId !== previous.senderId) return false;
  if (!isSameDay(current.createdAt, previous.createdAt)) return false;
  if (current.type === "system" || previous.type === "system") return false;
  const diff = Math.abs(new Date(current.createdAt) - new Date(previous.createdAt));
  return diff < 60000;
};