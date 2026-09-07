import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MessageSquarePlus,
  MoreVertical,
  Settings,
  LogOut,
  User,
  Loader2,
  Moon,
  Sun,
} from "lucide-react";
import { Avatar } from "../common/Avatar";
import { Spinner } from "../common/Spinner";
import { Dropdown, MenuItem } from "../common/Dropdown";
import { ConversationItem } from "./ConversationItem";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { useTheme } from "../../context/ThemeContext";
import { useDebouncedValue } from "../../hooks";

export const ChatSidebar = () => {
  const { user, logout } = useAuth();
  const { conversations, activeId, openConversation, unread, loadConversations, loadingChats } = useChat();
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 250);
  const navigate = useNavigate();

  const q = debounced.toLowerCase().trim();
  const filtered = q
    ? conversations.filter((c) => {
        const name = (c.type === "group" ? c.group?.name : c.peer?.name || "").toLowerCase();
        const preview = (c.lastMessage?.text || "").toLowerCase();
        return name.includes(q) || preview.includes(q);
      })
    : conversations;

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <Avatar name={user?.name} src={user?.avatarUrl} size={40} onClick={() => navigate("/profile")} />
        <div className="sidebar-header-actions">
          <button className="icon-btn" title="New chat" onClick={() => navigate("/new-chat")}>
            <MessageSquarePlus size={20} />
          </button>
          <button className="icon-btn" title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <Dropdown
            trigger={
              <button className="icon-btn" title="Menu">
                <MoreVertical size={20} />
              </button>
            }
          >
            <MenuItem onClick={() => navigate("/profile")}>
              <User size={16} /> My Profile
            </MenuItem>
            <MenuItem onClick={() => navigate("/settings")}>
              <Settings size={16} /> Settings
            </MenuItem>
            <MenuItem onClick={logout} danger>
              <LogOut size={16} /> Logout
            </MenuItem>
          </Dropdown>
        </div>
      </header>

      <div className="sidebar-search">
        <div className="search-box">
          <Search size={17} />
          <input
            placeholder="Search chat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="sidebar-list">
        {loadingChats && !conversations.length ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <div className="empty-list">No conversations yet</div>
        ) : (
          filtered.map((c) => (
            <ConversationItem
              key={c.id}
              conversation={c}
              active={c.id === activeId}
              onClick={() => openConversation(c.id)}
              unread={unread[c.id] || 0}
            />
          ))
        )}
      </div>
    </aside>
  );
};