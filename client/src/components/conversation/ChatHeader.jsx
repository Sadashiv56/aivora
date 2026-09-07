import { useNavigate } from "react-router-dom";
import { MoreVertical, Info, Search, ArrowLeft } from "lucide-react";
import { Avatar } from "../common/Avatar";
import { Dropdown, MenuItem } from "../common/Dropdown";
import { useChat } from "../../context/ChatContext";
import { groupLabel, lastSeenLabel } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";

export const ChatHeader = () => {
  const { conversations, activeId, connected, closeConversation } = useChat();
  const { user } = useAuth();
  const navigate = useNavigate();

  const conversation = conversations.find((c) => c.id === activeId);
  if (!conversation) return null;

  const isGroup = conversation.type === "group";
  const name = isGroup ? groupLabel(conversation, user?.id) : conversation.peer?.name || "Conversation";
  const avatarSrc = isGroup ? conversation.group?.avatarUrl : conversation.peer?.avatarUrl;
  const isOnline = !isGroup && conversation.peer?.isOnline;
  const subtitle = isGroup
    ? `${conversation.participants?.length || 0} members`
    : lastSeenLabel(conversation.peer, user?.id);

  return (
    <header className="chat-header">
      <div className="chat-header-left">
        <button className="icon-btn mobile-back" title="Back to chats" onClick={closeConversation}>
          <ArrowLeft size={22} />
        </button>
        <div className="avatar-wrap">
          <Avatar
            name={name}
            src={avatarSrc}
            size={40}
            style={{ cursor: "pointer" }}
          />
          {!isGroup && <span className={`presence-dot ${isOnline ? "online" : ""}`} />}
        </div>
        <div
          className="chat-header-info"
          onClick={() =>
            isGroup
              ? navigate(`/group/${conversation.group?.id}`)
              : navigate(`/user/${conversation.peer?.id}`)
          }
        >
          <div className="chat-header-name">{name}</div>
          <div className={`chat-header-sub ${isOnline ? "online" : ""}`}>
            {!connected ? "Reconnecting…" : subtitle}
          </div>
        </div>
      </div>

      <div className="chat-header-actions">
        <button className="icon-btn" title="Search">
          <Search size={20} />
        </button>
        <Dropdown
          trigger={
            <button className="icon-btn" title="More">
              <MoreVertical size={22} />
            </button>
          }
        >
          <MenuItem
            onClick={() =>
              isGroup
                ? navigate(`/group/${conversation.group?.id}`)
                : navigate(`/user/${conversation.peer?.id}`)
            }
          >
            <Info size={16} />
            {isGroup ? "Group info" : "View contact"}
          </MenuItem>
        </Dropdown>
      </div>
    </header>
  );
};
