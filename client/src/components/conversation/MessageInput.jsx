import { useEffect, useRef, useState } from "react";
import { Send, Paperclip, X, Mic } from "lucide-react";
import { EmojiPicker } from "../common/EmojiPicker";
import { useChat } from "../../context/ChatContext";
import { api } from "../../services/api";
import { usePresenceTimer } from "../../hooks";

const ACCEPT =
  "image/*,video/*,audio/*,application/pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.zip";

export const MessageInput = ({ conversationId, replyTo, editTarget, onCancelReply, onCancelEdit }) => {
  const { sendMessage, editMessage, startTyping, stopTyping } = useChat();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const typing = usePresenceTimer();
  const submittingRef = useRef(false);

  const sendTyping = () => startTyping(conversationId);

  const onChange = (e) => {
    setText(e.target.value);
    typing.debounce("typing", () => stopTyping(conversationId));
    sendTyping();
  };

  const uploadFile = async (file) => {
    let kind = "document";
    if (file.type.startsWith("image/")) kind = "image";
    else if (file.type.startsWith("video/")) kind = "video";
    else if (file.type.startsWith("audio/")) kind = "audio";
    return { file, kind };
  };

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file).then((f) => setAttachment(f));
    e.target.value = "";
  };

  const handleSend = async () => {
    if ((!text.trim() && !attachment) || sending || submittingRef.current) return;
    submittingRef.current = true;
    setSending(true);
    try {
      let attachments;
      if (attachment) {
        setUploading(true);
        const form = new FormData();
        form.append("file", attachment.file);
        const res = await api.post("/uploads", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        attachments = [res.data.data.attachment];
        setUploading(false);
      }
      if (editTarget) {
        if (text.trim()) {
          editMessage(conversationId, editTarget.id, text.trim());
        }
        onCancelEdit();
        setText("");
        return;
      }
      await sendMessage(conversationId, {
        type: attachment?.kind || "text",
        text: text.trim(),
        replyToMessageId: replyTo?.id || null,
        attachments,
      });
      stopTyping(conversationId);
      setText("");
      setAttachment(null);
      onCancelReply?.();
    } catch (err) {
      console.error("send failed", err);
    } finally {
      submittingRef.current = false;
      setSending(false);
      setUploading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeReply = editTarget || replyTo;
  const previewText = editTarget
    ? `Edit message`
    : replyTo
      ? `Reply to ${replyTo.sender?.name || "message"}`
      : null;

  useEffect(() => {
    if (editTarget) {
      setText(editTarget.text || "");
    } else if (replyTo) {
      // keep current text on reply
    }
  }, [editTarget]);

  return (
    <div className="message-input-wrap">
      {editTarget && (
        <div className="reply-preview editing">
          <span className="reply-preview-label">Editing message</span>
          <span className="reply-preview-text">{editTarget.text}</span>
          <button className="icon-btn" onClick={onCancelEdit}>
            <X size={16} />
          </button>
        </div>
      )}
      {replyTo && !editTarget && (
        <div className="reply-preview">
          <span className="reply-preview-label">{previewText}</span>
          <span className="reply-preview-text">
            {replyTo?.text || (replyTo?.type === "image" ? "📷" : "")}
          </span>
          <button className="icon-btn" onClick={onCancelReply}>
            <X size={16} />
          </button>
        </div>
      )}
      {attachment && (
        <div className="attachment-preview">
          <span>
            {attachment.kind === "image" ? "🖼️" : attachment.kind === "video" ? "🎥" : attachment.kind === "audio" ? "🎵" : "📄"}
            {" "}{attachment.file.name}
          </span>
          <button className="icon-btn" onClick={() => setAttachment(null)}>
            <X size={16} />
          </button>
        </div>
      )}
      <div className="input-bar">
        <input
          ref={fileRef}
          type="file"
          hidden
          accept={ACCEPT}
          onChange={pickFile}
        />
        <button className="icon-btn" title="Attachment" onClick={() => fileRef.current?.click()}>
          <Paperclip size={22} />
        </button>
        <EmojiPicker
          onSelect={(e) => {
            setText((t) => t + e);
            sendTyping();
          }}
        />
        <textarea
          className="message-field"
          placeholder="Type a message"
          value={text}
          onChange={onChange}
          onKeyDown={onKeyDown}
          rows={1}
        />
        {text.trim() || attachment || editTarget ? (
          <button className={`icon-btn send-btn${editTarget ? " edit" : ""}`} onClick={handleSend} disabled={sending || uploading || !text.trim()}>
            {uploading ? <span className="sending-dots">…</span> : editTarget ? "Update" : <Send size={20} />}
          </button>
        ) : (
          <button className="icon-btn" title="Voice (coming soon)">
            <Mic size={22} />
          </button>
        )}
      </div>
    </div>
  );
};