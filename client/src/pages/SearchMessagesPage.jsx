import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, MessageSquare } from "lucide-react";
import { Avatar } from "../components/common/Avatar";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";
import { useDebouncedValue } from "../hooks";
import { api } from "../services/api";
import { groupLabel, formatTime } from "../utils/format";

export const SearchMessagesPage = () => {
  const navigate = useNavigate();
  const { conversations, openConversation } = useChat();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query, 350);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [done, setDone] = useState(false);

  const doSearch = async (term) => {
    if (!term.trim()) {
      setResults([]);
      setDone(false);
      return;
    }
    setSearching(true);
    setDone(false);
    try {
      const res = await api.get("/search/messages", { params: { q: term.trim(), limit: 30 } });
      setResults(res.data.data.results || []);
    } finally {
      setSearching(false);
      setDone(true);
    }
  };

  const openResult = async (r) => {
    await openConversation(r.conversationId);
    navigate("/");
  };

  const convoName = (cid) => {
    const c = conversations.find((x) => x.id === cid);
    return c ? groupLabel(c, user?.id) : "Conversation";
  };

  return (
    <div className="page-wrap">
      <header className="page-header">
        <button className="icon-btn" onClick={() => navigate("/")}>
          <ArrowLeft size={20} />
        </button>
        <h2>Search messages</h2>
      </header>

      <div className="page-search">
        <div className="search-box big">
          <Search size={18} />
          <input
            autoFocus
            placeholder="Search your messages"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              doSearch(e.target.value);
            }}
          />
        </div>
      </div>

      <div className="page-list">
        {searching ? (
          <div className="empty-state small">Searching…</div>
        ) : done && results.length === 0 ? (
          <div className="empty-state small">No messages found</div>
        ) : (
          results.map((r) => (
            <button className="user-row" key={r.id} onClick={() => openResult(r)}>
              <Avatar name={r.sender?.name} src={r.sender?.avatarUrl} size={42} />
              <div className="user-row-info">
                <span className="user-row-name">
                  {r.sender?.name} → {convoName(r.conversationId)}
                </span>
                <span className="user-row-sub msg-snippet">
                  <MessageSquare size={12} /> {r.text} · {formatTime(r.createdAt)}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};