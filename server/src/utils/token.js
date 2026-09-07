import jwt from "jsonwebtoken";
import config from "../config/index.js";

export const signAccessToken = (payload) =>
  jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });

export const signRefreshToken = (payload) =>
  jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

export const verifyAccessToken = (token) => jwt.verify(token, config.jwt.accessSecret);

export const verifyRefreshToken = (token) => jwt.verify(token, config.jwt.refreshSecret);

const cookieOptions = (maxAgeSeconds) => ({
  httpOnly: true,
  secure: config.env === "production",
  // Cross-origin (Vercel -> Render/Railway) requires SameSite=None in prod;
  // in dev we stay same-origin through the Vite proxy so Lax is fine.
  sameSite: config.env === "production" ? "none" : "lax",
  path: "/api/auth",
  maxAge: maxAgeSeconds * 1000,
});

export const setRefreshCookie = (res, token) => {
  res.cookie(
    config.jwt.refreshCookieName,
    token,
    cookieOptions(parseSeconds(config.jwt.refreshExpiresIn))
  );
};

export const clearRefreshCookie = (res) => {
  res.clearCookie(config.jwt.refreshCookieName, {
    httpOnly: true,
    secure: config.env === "production",
    sameSite: config.env === "production" ? "none" : "lax",
    path: "/api/auth",
  });
};

const parseSeconds = (exp) => {
  if (typeof exp === "number") return exp;
  const match = /^(\d+)([smhd])$/.exec(String(exp));
  if (!match) return 30 * 24 * 60 * 60;
  const num = parseInt(match[1], 10);
  switch (match[2]) {
    case "s":
      return num;
    case "m":
      return num * 60;
    case "h":
      return num * 3600;
    case "d":
      return num * 86400;
    default:
      return num;
  }
};