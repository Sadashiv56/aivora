import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
} from "../controllers/auth.controller.js";
import { validate, authLimiter } from "../middleware/validation.js";
import { registerSchema, loginSchema } from "../utils/schemas.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", protect, logout);

export default router;