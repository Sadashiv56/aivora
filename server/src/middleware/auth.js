import { verifyAccessToken } from "../utils/token.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/User.js";
import { serializeUser } from "../utils/serialize.js";

export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      throw ApiError.unauthorized("Access token required");
    }
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw ApiError.unauthorized("Invalid or expired access token", "TOKEN_EXPIRED");
    }
    const user = await User.findById(payload.sub).select("+passwordHash");
    if (!user) {
      throw ApiError.unauthorized("User no longer exists");
    }
    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (err) {
    next(err);
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (token) {
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub);
      if (user) {
        req.user = user;
        req.userId = user._id.toString();
      }
    }
  } catch {
    /* ignore invalid token in optional mode */
  }
  next();
};

export const currentUserView = (req) => serializeUser(req.user);