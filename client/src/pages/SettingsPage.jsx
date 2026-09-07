import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldX } from "lucide-react";
import { Avatar } from "../components/common/Avatar";
import { api, apiErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { lastSeenLabel } from "../utils/format";

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [privacy, setPrivacy] = useState({
    lastSeen: user?.privacy?.lastSeen || "everyone",
    profilePhoto: user?.privacy?.profilePhoto || "everyone",
    readReceipts: user?.privacy?.readReceipts ?? true,
  });
  const [blocked, setBlocked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const loadBlocked = async () => {
    const res = await api.get("/users/blocked");
    setBlocked(res.data.data.users || []);
  };

  useEffect(() => {
    loadBlocked();
  }, []);

  const savePrivacy = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await api.patch("/users/me", { privacy });
      updateUser(res.data.data);
      setMsg("Privacy settings saved");
    } catch (err) {
      setMsg(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const unblock = async (userId) => {
    await api.delete(`/users/block/${userId}`);
    loadBlocked();
  };

  const setField = (k) => (e) => setPrivacy((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="page-wrap">
      <header className="page-header">
        <button className="icon-btn" onClick={() => navigate("/")}>
          <ArrowLeft size={20} />
        </button>
        <h2>Settings</h2>
      </header>

      <div className="card">
        <h3 className="section-title">Privacy</h3>
        <label className="auth-field">
          <span>Who can see my last seen</span>
          <select value={privacy.lastSeen} onChange={setField("lastSeen")}>
            <option value="everyone">Everyone</option>
            <option value="contacts">My contacts</option>
            <option value="nobody">Nobody</option>
          </select>
        </label>
        <label className="auth-field">
          <span>Who can see my profile photo</span>
          <select value={privacy.profilePhoto} onChange={setField("profilePhoto")}>
            <option value="everyone">Everyone</option>
            <option value="contacts">My contacts</option>
            <option value="nobody">Nobody</option>
          </select>
        </label>
        <label className="auth-field check">
          <input
            type="checkbox"
            checked={privacy.readReceipts}
            onChange={(e) => setPrivacy((p) => ({ ...p, readReceipts: e.target.checked }))}
          />
          <span>Read receipts</span>
        </label>
        <button className="btn-primary" onClick={savePrivacy} disabled={busy}>
          {busy ? "Saving…" : "Save privacy settings"}
        </button>
        {msg && <div className="auth-error">{msg}</div>}
      </div>

      <div className="card">
        <h3 className="section-title">Blocked users</h3>
        {blocked.length === 0 ? (
          <div className="muted">You haven't blocked anyone.</div>
        ) : (
          blocked.map((u) => (
            <div className="user-row" key={u.id}>
              <Avatar name={u.name} src={u.avatarUrl} size={40} />
              <div className="user-row-info">
                <span className="user-row-name">{u.name}</span>
                <span className="user-row-sub">@{u.username}</span>
              </div>
              <button className="icon-btn danger" title="Unblock" onClick={() => unblock(u.id)}>
                <ShieldX size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};