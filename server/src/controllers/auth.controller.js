import { serializeUser } from "../utils/serialize.js";
import { success } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { registerUser, loginUser, issueTokens } from "../services/auth.service.js";
import { verifyRefreshToken } from "../utils/token.js";
import { ApiError } from "../utils/ApiError.js";
import { clearRefreshCookie, setRefreshCookie } from "../utils/token.js";
import config from "../config/index.js";
import User from "../models/User.js";

export const register = asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);
  const tokens = issueTokens(user);
  setRefreshCookie(res, tokens.refreshToken);
  return success(res, { user: serializeUser(user), accessToken: tokens.accessToken }, "Account created", 201);
});

export const login = asyncHandler(async (req, res) => {
  const user = await loginUser(req.body.email, req.body.password);
  const tokens = issueTokens(user);
  setRefreshCookie(res, tokens.refreshToken);
  user.isOnline = true;
  await user.save().catch(() => {});
  return success(res, { user: serializeUser(user), accessToken: tokens.accessToken }, "Logged in");
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies[config.jwt.refreshCookieName];
  if (!token) throw ApiError.unauthorized("Refresh token missing", "REFRESH_MISSING");
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token", "REFRESH_EXPIRED");
  }
  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized("User not found", "USER_NOT_FOUND");
  const tokens = issueTokens(user);
  setRefreshCookie(res, tokens.refreshToken);
  return success(res, { user: serializeUser(user), accessToken: tokens.accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  if (req.userId) {
    await User.findByIdAndUpdate(req.userId, { isOnline: false, lastSeenAt: new Date() });
  }
  clearRefreshCookie(res);
  return success(res, null, "Logged out");
});