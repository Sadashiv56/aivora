import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api, setAccessToken, getAccessToken } from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleLogoutEvent = useCallback(() => {
    setUser(null);
    setAccessToken("");
    disconnectSocket();
  }, []);

  useEffect(() => {
    window.addEventListener("auth:logout", handleLogoutEvent);
    return () => window.removeEventListener("auth:logout", handleLogoutEvent);
  }, [handleLogoutEvent]);

  const init = useCallback(async () => {
    setLoading(true);
    try {
      if (!getAccessToken()) {
        const res = await api.post("/auth/refresh").catch(() => null);
        if (res?.data?.data) {
          setAccessToken(res.data.data.accessToken);
          setUser(res.data.data.user);
        }
      } else {
        const res = await api.get("/users/me");
        setUser(res.data.data);
      }
    } catch (err) {
      // Only treat an explicit auth rejection (401) as "logged out".
      // Network/server errors must not silently destroy the session.
      if (err?.response?.status === 401) {
        setUser(null);
        setAccessToken("");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setAccessToken(res.data.data.accessToken);
    setUser(res.data.data.user);
    connectSocket();
    return res.data.data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await api.post("/auth/register", payload);
    setAccessToken(res.data.data.accessToken);
    setUser(res.data.data.user);
    connectSocket();
    return res.data.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    handleLogoutEvent();
  }, [handleLogoutEvent]);

  const updateUser = useCallback((fields) => {
    setUser((prev) => (prev ? { ...prev, ...fields } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateUser, init }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};