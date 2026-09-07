import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Ban, ShieldAlert } from "lucide-react";
import { Avatar } from "../components/common/Avatar";
import { api, apiErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { lastSeenLabel } from "../utils/format";

export const UserProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadConversations, openConversation } = useChat();

  const [profile, setProfile] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    api.get(`/users/${id}`).then((res) => {
      setProfile(res.data.data);
      setBlocked(res.data.data.blocked || false);
    }).catch(() => navigate("/"));
  };

  useEffect(load, [id]);

  if (!profile) return <div className="page-wrap"><div className="empty-state small">Loading…</div></div>;

  const startChat = async () => {
    const res = await api.post("/conversations", { userId: id });
    await loadConversations();
    openConversation(res.data.data.id);
    navigate("/");
  };

  const toggleBlock = async () => {
    try {
      if (blocked) {
        await api.delete(`/users/block/${id}`);
        setBlocked(false);
      } else {
        await api.post("/users/block", { userId: id });
        setBlocked(true);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const report = async () => {
    await api.post(`/users/${id}/report`);
    alert("Report submitted. Thank you.");
  };

  return (
    <div className="page-wrap">
      <header className="page-header">
        <button className="icon-btn" onClick={() => navigate("/")}>
          <ArrowLeft size={20} />
        </button>
        <h2>Contact info</h2>
      </header>

      <div className="profile-hero">
        <Avatar
          name={profile.name}
          src={profile.avatarUrl}
          size={96}
          showOnline
          online={profile.isOnline}
        />
        <h2>{profile.name}</h2>
        <p className="muted">@{profile.username} · {lastSeenLabel(profile, user?.id)}</p>
        {profile.about && <p className="profile-about">“{profile.about}”</p>}
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="card actions-card">
        <button className="btn-primary" onClick={startChat}>
          <MessageCircle size={16} /> Message
        </button>
        <button className={`btn-secondary ${blocked ? "danger" : ""}`} onClick={toggleBlock}>
          <Ban size={16} /> {blocked ? "Unblock" : "Block"}
        </button>
        <button className="btn-secondary" onClick={report}>
          <ShieldAlert size={16} /> Report
        </button>
      </div>
    </div>
  );
};