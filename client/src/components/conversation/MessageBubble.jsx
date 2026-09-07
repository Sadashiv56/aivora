import { useState } from "react";
import { CornerUpLeft, Pencil, Trash2, SmilePlus, Copy } from "lucide-react";
import { Avatar } from "../common/Avatar";
import { StatusText } from "../common/StatusTicks";
import { cn, formatTime } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";
import { useClickOutside } from "../../hooks";

const EMOJI_REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🙏", "🔥"];

const AttachmentView = ({ m }) => {
  const att = m.attachments?.[0];
  if (!att) return null;
  if (m.type === "image" || att.mimeType?.startsWith("image/")) {
    return (
      <a href={att.url} target="_blank" rel="noreferrer" className="msg-image-link" onClick={(e) => e.stopPropagation()}>
        <img className="msg-image" src={att.url} alt={att.name} />
      </a>
    );
  }
  if (m.type === "video" || att.mimeType?.startsWith("video/")) {
    return <video className="msg-video" controls src={att.url}>{att.name}</video>;
  }
  if (m.type === "audio" || att.mimeType?.startsWith("audio/")) {
    return <audio className="msg-audio" controls src={att.url}></audio>;
  }
  return (
    <a className="msg-doc" href={att.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
      <span className="doc-icon">📄</span>
      <span className="doc-name">{att.name || "Document"}</span>
    </a>
  );
};

const ReplyChip = ({ replyTo }) => {
  if (!replyTo) return null;
  const label = replyTo.type === "image" ? "📷 Photo" : replyTo.type === "document" ? "📄 Document" : replyTo.text || "Message";
  return (
    <div className="reply-chip">
      <CornerUpLeft size={13} />
      <span className="reply-text">{label}</span>
    </div>
  );
};

export const MessageBubble = ({ m, showSender, isFirstInGroup, isLastInGroup, onReply, currentUser }) => {
  const { user } = useAuth();
  const mine = m.senderId === user?.id;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useClickOutside(() => setMenuOpen(false));
  const [reactionPicker, setReactionPicker] = useState(false);

  const myReaction = (m.reactions || []).find((r) => r.userId === user?.id);

  if (m.type === "system") {
    return (
      <div className="system-message">
        <span>{m.text}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "msg-row",
        mine ? "mine" : "theirs",
        isFirstInGroup && "group-first",
        isLastInGroup && "group-last",
        !isFirstInGroup && !isLastInGroup && "group-mid",
        !isFirstInGroup && "not-first"
      )}
      ref={menuRef}
    >
      {!mine && isFirstInGroup && (
        <Avatar name={m.sender?.name || ""} src={m.sender?.avatarUrl} size={32} />
      )}
      {!mine && !isFirstInGroup && <div className="avatar-spacer" />}

      <div
        className="bubble-wrap"
        onClick={(e) => {
          if (menuOpen) return;
          setMenuOpen(true);
          setTimeout(() => {
            const close = (ev) => {
              if (menuRef.current && !menuRef.current.contains(ev.target)) {
                document.removeEventListener("mousedown", close);
                setMenuOpen(false);
              }
            };
            document.addEventListener("mousedown", close);
          }, 0);
        }}
      >
        <div
          className={cn(
            "bubble",
            mine ? "mine" : "theirs",
            m._pending && "pending",
            m._error && "error",
            m.deletedAt && "deleted",
            isFirstInGroup && "radius-top",
            isLastInGroup && "radius-bottom"
          )}
        >
          {showSender && !mine && isFirstInGroup && (
            <div className="bubble-sender-name">{m.sender?.name || "Unknown"}</div>
          )}
          <ReplyChip replyTo={m.replyTo} />
          <AttachmentView m={m} />
          {m.deletedAt ? (
            <div className="bubble-text deleted-text">This message was deleted</div>
          ) : m.text ? (
            <div className="bubble-text">{m.text}</div>
          ) : null}
          <div className="bubble-meta">
            {m.editedAt && !m.deletedAt ? <span className="edited">edited</span> : null}
            {m._error ? <span className="send-error" title={m._error}>!</span> : null}
            {mine && !m._pending && <StatusText msg={m} currentUserId={user?.id} />}
            {m._pending && <span className="sending-dots">…</span>}
            <span className="bubble-time">{formatTime(m.createdAt)}</span>
          </div>
        </div>

        {(m.reactions || []).length > 0 && (
          <div className="reaction-row">
            {(m.reactions || []).map((r, i) => (
              <span key={i} className="reaction-pill">{r.emoji}</span>
            ))}
          </div>
        )}

        {menuOpen && (
          <div className="msg-menu">
            <button onClick={() => { setReactionPicker(true); }} title="React">
              <SmilePlus size={15} /> React
            </button>
            <button onClick={() => { onReply(m, "reply"); setMenuOpen(false); }} title="Reply">
              <CornerUpLeft size={15} /> Reply
            </button>
            <button onClick={() => {
              navigator.clipboard?.writeText(m.text || "");
              setMenuOpen(false);
            }} title="Copy">
              <Copy size={15} /> Copy
            </button>
            {mine && !m.deletedAt && (
              <button onClick={() => { setMenuOpen(false); onReply(m, "edit"); }} title="Edit">
                <Pencil size={15} /> Edit
              </button>
            )}
            {(mine || !mine) && (
              <button className="danger" onClick={() => { setMenuOpen(false); onReply(m, "delete"); }} title="Delete">
                <Trash2 size={15} /> Delete
              </button>
            )}
            {reactionPicker && (
              <div className="reaction-picker">
                {EMOJI_REACTIONS.map((e) => (
                  <button key={e} onClick={() => { onReply(m, "reaction", e); setReactionPicker(false); setMenuOpen(false); }}>
                    {e}
                  </button>
                ))}
                {myReaction && (
                  <button onClick={() => { onReply(m, "reaction", myReaction.emoji); setReactionPicker(false); setMenuOpen(false); }}>
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
