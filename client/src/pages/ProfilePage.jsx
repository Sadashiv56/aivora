import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Save } from "lucide-react";
import { Avatar } from "../components/common/Avatar";
import { api, apiErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { loadConversations } = useChat();

  const [form, setForm] = useState({
    name: user?.name || "",
    username: user?.username || "",
    phone: user?.phone || "",
    about: user?.about || "",
  });
  const [avatar, setAvatar] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const pickAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/uploads", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAvatar(res.data.data.attachment.url);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api.patch("/users/me", {
        ...form,
        name: form.name.trim(),
        username: form.username.trim(),
        avatarUrl: avatar || undefined,
      });
      updateUser(res.data.data);
      await loadConversations();
      navigate("/");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-wrap">
      <header className="page-header">
        <button className="icon-btn" onClick={() => navigate("/")}>
          <ArrowLeft size={20} />
        </button>
        <h2>My profile</h2>
      </header>

      <div className="profile-hero">
        <div className="avatar-edit" onClick={() => document.getElementById("avatar-input")?.click()}>
          <Avatar name={user?.name} src={avatar || user?.avatarUrl} size={96} />
          <span className="avatar-camera"><Camera size={18} /></span>
        </div>
        <input id="avatar-input" type="file" accept="image/*" hidden onChange={pickAvatar} />
        <h2>{user?.name}</h2>
        <p className="muted">@{user?.username}</p>
      </div>

      <div className="card profile-form">
        {error && <div className="auth-error">{error}</div>}
        <label className="auth-field">
          <span>Name</span>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </label>
        <label className="auth-field">
          <span>Username</span>
          <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
        </label>
        <label className="auth-field">
          <span>Phone</span>
          <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </label>
        <label className="auth-field">
          <span>About</span>
          <textarea
            rows={2}
            value={form.about}
            onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))}
            placeholder="Tell people what you're up to"
          />
        </label>
        <button className="btn-primary" onClick={save} disabled={busy}>
          <Save size={16} /> {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
};