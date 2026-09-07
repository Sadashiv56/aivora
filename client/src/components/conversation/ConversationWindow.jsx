import { useState } from "react";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { useChat } from "../../context/ChatContext";

export const ConversationWindow = ({ conversationId }) => {
  const { deleteMessage, toggleReaction } = useChat();
  const [replyTo, setReplyTo] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleAction = ({ message, action, extra }) => {
    if (action === "reply") {
      setReplyTo(message);
      setEditTarget(null);
    } else if (action === "edit") {
      setEditTarget(message);
      setReplyTo(null);
    } else if (action === "delete") {
      setConfirmDelete(message);
    } else if (action === "reaction") {
      toggleReaction(conversationId, message.id, extra);
    }
  };

  return (
    <section className="conversation">
      <ChatHeader />
      <MessageList conversationId={conversationId} onAction={handleAction} />
      <MessageInput
        conversationId={conversationId}
        replyTo={replyTo}
        editTarget={editTarget}
        onCancelReply={() => setReplyTo(null)}
        onCancelEdit={() => setEditTarget(null)}
      />

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal confirm-delete" onClick={(e) => e.stopPropagation()}>
            <h3>Delete message?</h3>
            <p>This message will be deleted for everyone.</p>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="btn danger"
                onClick={() => {
                  deleteMessage(conversationId, confirmDelete.id);
                  setConfirmDelete(null);
                }}
              >
                Delete for everyone
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
