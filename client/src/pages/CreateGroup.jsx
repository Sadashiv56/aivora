import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { Avatar } from "../components/common/Avatar";
import { useAuth } from "../context/AuthContext";
import { api, apiErrorMessage } from "../services/api";
import { useChat } from "../context/ChatContext";

export const CreateGroup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadConversations } = useChat();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get("/users/search", { params: { q: "a", limit: 50 } })
      .then((res) => setUsers(res.data.data.users))
      .catch(() => {});
  }, []);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (!name.trim() || selected.size === 0) {
      setError("Group name and at least one member are required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/groups", {
        name: name.trim(),
        description: description.trim(),
        memberIds: [...selected],
      });
      await loadConversations();
      navigate("/");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="new-chat-page">
      <header className="page-header">
        <button className="icon-btn" onClick={() => navigate("/new-chat")}>
          <ArrowLeft size={20} />
        </button>
        <h2>New group</h2>
      </header>

      <div className="group-form">
        <input
          className="group-name-input"
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="group-desc-input"
          placeholder="Group description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {error && <div className="auth-error">{error}</div>}
        <p className="group-hint">{selected.size} participants selected</p>
      </div>

      <div className="page-list">
        {users
          .filter((u) => u.id !== user?.id)
          .map((u) => {
            const isSel = selected.has(u.id);
            return (
              <button
                className={`user-row ${isSel ? "selected" : ""}`}
                key={u.id}
                onClick={() => toggle(u.id)}
              >
                <Avatar name={u.name} src={u.avatarUrl} size={46} />
                <div className="user-row-info">
                  <span className="user-row-name">{u.name}</span>
                  <span className="user-row-sub">@{u.username}</span>
                </div>
                {isSel && (
                  <span className="sel-check">
                    <Check size={16} />
                  </span>
                )}
              </button>
            );
          })}
      </div>

      <div className="page-actions">
        <button className="btn-primary" disabled={busy} onClick={submit}>
          {busy ? "Creating…" : `Create group`}
        </button>
      </div>
    </div>
  );
};