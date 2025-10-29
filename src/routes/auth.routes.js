import { Router } from "express";
import { register, login, logout, getProtectedData, forgotPassword, resetPassword, updateMe } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

// Rutas públicas
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Rutas protegidas
router.post("/logout", logout);
router.get("/protected", authMiddleware, getProtectedData);
router.put("/me", authMiddleware, updateMe);

export default router;

