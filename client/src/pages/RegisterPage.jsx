import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../services/api";

const field = {
  name: "What's your name?",
  username: "Pick a username",
  email: "Email address",
  phone: "Phone (optional)",
  password: "Password (min 8 characters)",
};

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", username: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="wa-logo-dot lg">A</span>
          <h1>Aivora</h1>
        </div>
        <p className="auth-tagline">Create your account to start chatting</p>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={submit} className="auth-form">
          {Object.entries(field).map(([k, label]) => (
            <label key={k} className="auth-field">
              <span>{label}</span>
              <input
                type={k === "password" ? "password" : k === "email" ? "email" : "text"}
                value={form[k]}
                onChange={set(k)}
                required={k !== "phone"}
                placeholder={label}
              />
            </label>
          ))}
          <button className="btn-primary" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;