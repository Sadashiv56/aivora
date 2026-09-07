import { Avatar } from "../common/Avatar";
import { StatusTicks } from "../common/StatusTicks";
import { cn, groupLabel, conversationPreview, formatTime } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";

export const ConversationItem = ({ conversation, active, onClick, unread }) => {
  const { user } = useAuth();
  const peer = conversation.peer;
  const isGroup = conversation.type === "group";
  const name =
    isGroup ? groupLabel(conversation, user?.id)
    : peer?.name || "Unknown";
  const avatarSrc = isGroup ? conversation.group?.avatarUrl : peer?.avatarUrl;

  return (
    <div
      className={cn("conversation-item", active && "active")}
      onClick={onClick}
    >
      <Avatar
        name={name}
        src={avatarSrc}
        size={49}
        showOnline={!isGroup}
        online={peer?.isOnline}
      />
      <div className="conversation-content">
        <div className="conversation-topline">
          <span className="conversation-name">{name}</span>
          <span className="conversation-time">
            {conversation.lastMessageAt ? formatTime(conversation.lastMessageAt) : ""}
          </span>
        </div>
        <div className="conversation-bottomline">
          {conversation.lastMessage?.senderId === user?.id && conversation.type === "group" ? (
            <StatusTicks status={conversation.lastMessage.readBy?.length > 1 ? "read" : "sent"} />
          ) : null}
          <span className="conversation-preview">
            {conversationPreview(conversation, user?.id)}
          </span>
          {!!unread && <span className="unread-badge">{unread > 99 ? "99+" : unread}</span>}
        </div>
      </div>
    </div>
  );
};