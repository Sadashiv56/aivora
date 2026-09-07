import { ChatSidebar } from "../components/chat/ChatSidebar";
import { ConversationWindow } from "../components/conversation/ConversationWindow";
import { useChat } from "../context/ChatContext";
import { MessageSquare } from "lucide-react";

export const ChatLayout = () => {
  const { activeId, conversations, loadingChats, connected, reconnecting } = useChat();

  const active = conversations.find((c) => c.id === activeId);

  return (
    <div className={`app-shell${active ? " has-active" : ""}`}>
      <ChatSidebar />
      {active ? (
        <ConversationWindow key={active.id} conversationId={active.id} />
      ) : (
        <section className="empty-state">
          {reconnecting || !connected ? (
            <div className="reconnect-banner">Reconnecting…</div>
          ) : null}
          <MessageSquare size={64} className="empty-icon" />
          <h2>{loadingChats ? "Loading…" : "Select a chat to start messaging"}</h2>
          <p>
            Aivora — real-time messaging built with the MERN stack via Socket.IO.
          </p>
        </section>
      )}
    </div>
  );
};