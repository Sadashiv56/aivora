import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, UserPlus, Trash2, Shield, ShieldOff, LogOut, Save } from "lucide-react";
import { Avatar } from "../components/common/Avatar";
import { Modal } from "../components/common/Modal";
import { api, apiErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { lastSeenLabel } from "../utils/format";
import { useDebouncedValue } from "../hooks";

export const GroupInfo = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadConversations, openConversation } = useChat();

  const [group, setGroup] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query, 300);
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get(`/groups/${id}`).then((res) => {
      setGroup(res.data.data);
      setName(res.data.data.name);
      setDescription(res.data.data.description || "");
    }).catch(() => navigate("/"));
  };

  useEffect(load, [id]);

  useEffect(() => {
    if (!q.trim()) return;
    api
      .get("/users/search", { params: { q: q.trim(), limit: 20 } })
      .then((res) => setSearchResults(res.data.data.users))
      .catch(() => setSearchResults([]));
  }, [q]);

  if (!group) return <div className="page-wrap"><div className="empty-state small">Loading group…</div></div>;

  const membership = group.members?.find((m) => m.user?.id === user?.id);
  const isAdmin = group.ownerId === user?.id || membership?.role === "admin" || membership?.role === "owner";

  const saveInfo = async () => {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/groups/${id}`, { name: name.trim(), description: description.trim() });
      setEditing(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const addMembers = async (memberIds) => {
    setBusy(true);
    setError("");
    try {
      await api.post(`/groups/${id}/members`, { memberIds });
      setAddOpen(false);
      setQuery("");
      setSearchResults([]);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (userId) => {
    if (!window.confirm("Remove this member?")) return;
    await api.delete(`/groups/${id}/members/${userId}`).catch((err) => setError(apiErrorMessage(err)));
    load();
  };

  const toggleRole = async (userId) => {
    const target = group.members.find((m) => m.user?.id === userId);
    const newRole = target?.role === "admin" ? "member" : "admin";
    await api.patch(`/groups/${id}/members/${userId}`, { role: newRole }).catch((err) => setError(apiErrorMessage(err)));
    load();
  };

  const leave = async () => {
    if (group.ownerId === user?.id) {
      if (!window.confirm("You are the owner. Delete this group?")) return;
      await api.delete(`/groups/${id}`);
    } else {
      if (!window.confirm("Leave this group?")) return;
      await api.post(`/groups/${id}/leave`);
    }
    await loadConversations();
    navigate("/");
  };

  const openChat = async () => {
    await loadConversations();
    openConversation(group.conversationId);
    navigate("/");
  };

  const addableUsers = searchResults.filter((u) => !group.members?.some((m) => m.user?.id === u.id));

  return (
    <div className="page-wrap">
      <header className="page-header">
        <button className="icon-btn" onClick={openChat}>
          <ArrowLeft size={20} />
        </button>
        <h2>Group info</h2>
      </header>

      <div className="profile-hero">
        <Avatar name={group.name} src={group.avatarUrl} size={96} />
        <h2>{group.name}</h2>
        <p className="muted">{group.members?.length || 0} members</p>
      </div>

      <div className="card">
        <div className="card-row">
          <span className="muted">Description</span>
          {editing ? (
            <>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" />
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
              {error && <div className="auth-error">{error}</div>}
              <button className="btn-primary small" onClick={saveInfo} disabled={busy}>
                <Save size={14} /> Save
              </button>
            </>
          ) : (
            <span>{group.description || "—"}</span>
          )}
        </div>
        {isAdmin && !group.joined === false && (
          <button className="btn-secondary" onClick={() => { setEditing(!editing); setError(""); }}>
            {editing ? "Cancel" : "Edit group info"}
          </button>
        )}
      </div>

      <div className="page-list">
        <div className="list-title">
          Members
          {isAdmin && (
            <button className="icon-btn" title="Add members" onClick={() => setAddOpen(true)}>
              <UserPlus size={18} />
            </button>
          )}
        </div>
        {group.members?.map((m) => {
          const u = m.user;
          const isOwner = group.ownerId === u?.id;
          return (
            <div className="user-row" key={u?.id}>
              <Avatar name={u?.name} src={u?.avatarUrl} size={42} showOnline online={u?.isOnline} />
              <div className="user-row-info">
                <span className="user-row-name">
                  {u?.name}
                  {isOwner ? " 👑" : ""}
                </span>
                <span className="user-row-sub">
                  {m.role} · {lastSeenLabel(u, user?.id)}
                </span>
              </div>
              {isAdmin && u?.id !== user?.id && (
                <button className="icon-btn" title={m.role === "admin" ? "Remove admin" : "Make admin"} onClick={() => toggleRole(u.id)}>
                  {m.role === "admin" ? <ShieldOff size={16} /> : <Shield size={16} />}
                </button>
              )}
              {isAdmin && u?.id !== user?.id && !isOwner && (
                <button className="icon-btn danger" title="Remove" onClick={() => removeMember(u.id)}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="page-actions">
        <button className="btn-danger" onClick={leave}>
          {group.ownerId === user?.id ? <Trash2 size={16} /> : <LogOut size={16} />}
          {group.ownerId === user?.id ? "Delete group" : "Leave group"}
        </button>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add members">
        <div className="search-box big">
          <input
            autoFocus
            placeholder="Search users"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="page-list">
          {addableUsers.length === 0 ? (
            <div className="empty-state small">No users to add</div>
          ) : (
            addableUsers.map((u) => (
              <button className="user-row" key={u.id} onClick={() => addMembers([u.id])}>
                <Avatar name={u.name} src={u.avatarUrl} size={40} />
                <div className="user-row-info">
                  <span className="user-row-name">{u.name}</span>
                  <span className="user-row-sub">@{u.username}</span>
                </div>
              </button>
            ))
          )}
        </div>
        {busy && <div className="muted center">Adding…</div>}
      </Modal>
    </div>
  );
};