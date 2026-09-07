import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Users } from "lucide-react";
import { Avatar } from "../components/common/Avatar";
import { useDebouncedValue } from "../hooks";
import { api } from "../services/api";
import { useChat } from "../context/ChatContext";
import { lastSeenLabel } from "../utils/format";
import { useAuth } from "../context/AuthContext";

export const NewChat = () => {
  const navigate = useNavigate();
  const { loadConversations, openConversation } = useChat();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query, 300);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const doSearch = async (term) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get("/users/search", { params: { q: term.trim(), limit: 20 } });
      setResults(res.data.data.users || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const startChat = async (userId) => {
    const res = await api.post("/conversations", { userId });
    const convId = res.data.data.id;
    await loadConversations();
    openConversation(convId);
    navigate("/");
  };

  return (
    <div className="new-chat-page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => navigate("/")}>
          <ArrowLeft size={20} />
        </button>
        <h2>New chat</h2>
      </header>
      <div className="page-search">
        <div className="search-box big">
          <Search size={18} />
          <input
            autoFocus
            placeholder="Search people by name, username or email"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              doSearch(e.target.value);
            }}
          />
        </div>
      </div>
      <div className="page-list">
        {query.trim() === "" ? (
          <div className="empty-state small">
            <Users size={40} />
            <p>Search for users to start a new conversation.</p>
          </div>
        ) : searching ? (
          <div className="empty-state small">Searching…</div>
        ) : results.length === 0 ? (
          <div className="empty-state small">No users found</div>
        ) : (
          results.map((u) => (
            <button className="user-row" key={u.id} onClick={() => startChat(u.id)}>
              <Avatar
                name={u.name}
                src={u.avatarUrl}
                size={46}
                showOnline
                online={u.isOnline}
              />
              <div className="user-row-info">
                <span className="user-row-name">{u.name}</span>
                <span className="user-row-sub">
                  {u.username} · {lastSeenLabel(u, user?.id)}
                </span>
              </div>
            </button>
          ))
        )}
        <div className="page-actions">
          <button className="btn-primary" onClick={() => navigate("/create-group")}>
            Create a group
          </button>
        </div>
      </div>
    </div>
  );
};