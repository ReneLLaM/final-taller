import { Router } from "express";
import { register, login, logout, getProtectedData } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

// Rutas públicas
router.post("/register", register);
router.post("/login", login);

// Rutas protegidas
router.post("/logout", logout);
router.get("/protected", authMiddleware, getProtectedData);

export default router;

