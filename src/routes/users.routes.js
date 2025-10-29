import { Router } from "express";
const router = Router();
import { 
    getAllUsers, 
    getUserById, 
    createUser, 
    deleteUser, 
    updateUser,
 } from "../controllers/users.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

// Solo usuarios autenticados pueden consultar; admin y auxiliar ven listas completas
router.get("/usuarios", authMiddleware, requireRole(2,3), getAllUsers);

router.get("/usuarios/:id", authMiddleware, getUserById);

// Solo administrador puede crear, actualizar y eliminar usuarios
router.post("/usuarios", authMiddleware, requireRole(3), createUser);

router.delete("/usuarios/:id", authMiddleware, requireRole(3), deleteUser);

router.put("/usuarios/:id", authMiddleware, requireRole(3), updateUser);

export default router;
