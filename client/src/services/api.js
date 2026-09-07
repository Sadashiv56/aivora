import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let accessToken = localStorage.getItem("chat_access_token") || "";

export const setAccessToken = (token) => {
  accessToken = token;
  if (token) localStorage.setItem("chat_access_token", token);
  else localStorage.removeItem("chat_access_token");
};

export const getAccessToken = () => accessToken;

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise = null;
let loggedOutFlag = false;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && original && !original._retried && !original.url.includes("/auth/")) {
      original._retried = true;
      if (!refreshPromise) {
        refreshPromise = api
          .post("/auth/refresh")
          .then((res) => {
            setAccessToken(res.data.data.accessToken);
            loggedOutFlag = false;
            return res.data.data.accessToken;
          })
          .catch((err) => {
            // A 401 from /auth/refresh means the refresh token is really
            // gone/expired. Anything else (network down, 5xx) is transient and
            // must NOT log the user out.
            if (err?.response?.status === 401) {
              setAccessToken("");
              if (!loggedOutFlag) {
                loggedOutFlag = true;
                window.dispatchEvent(new CustomEvent("auth:logout"));
              }
            }
            throw err;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }
      try {
        await refreshPromise;
        return api(original);
      } catch {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export const apiErrorMessage = (err) =>
  err?.response?.data?.message || err?.message || "Something went wrong";