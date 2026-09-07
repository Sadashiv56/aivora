import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signAccessToken, signRefreshToken } from "../utils/token.js";
import { ApiError } from "../utils/ApiError.js";

const SALT_ROUNDS = 10;

export const registerUser = async ({ name, username, email, phone, password }) => {
  const existing = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });
  if (existing) {
    const field = existing.email === email.toLowerCase() ? "email" : "username";
    throw ApiError.conflict(`${field} already in use`, "DUPLICATE_VALUE", [
      { field, message: `${field} already exists` },
    ]);
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    name,
    username,
    email: email.toLowerCase(),
    phone: phone || "",
    passwordHash,
  });
  return user;
};

export const loginUser = async (email, password) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user) throw ApiError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  return user;
};

export const issueTokens = (user) => {
  const subject = user._id.toString();
  return {
    accessToken: signAccessToken({ sub: subject }),
    refreshToken: signRefreshToken({ sub: subject, typ: "refresh" }),
  };
};