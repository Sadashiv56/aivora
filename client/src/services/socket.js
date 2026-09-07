import { io } from "socket.io-client";
import { getAccessToken } from "./api";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

let socket = null;

export const connectSocket = () => {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    auth: { token: getAccessToken() },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });
  // Refresh the auth token on every (re)connect so an expired access token
  // that was emailed at connect time doesn't cause repeated failed handshakes.
  socket.on("reconnect_attempt", () => {
    socket.auth = { ...(socket.auth || {}), token: getAccessToken() };
  });
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const socketEmit = (event, payload, ack) => {
  if (!socket) return;
  if (ack) socket.emit(event, payload, ack);
  else socket.emit(event, payload);
};