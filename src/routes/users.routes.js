import { Router } from "express";
const router = Router();
import { 
    getAllUsers, 
    getUserById, 
    createUser, 
    deleteUser, 
    updateUser,
 } from "../controllers/users.controller.js";

router.get("/usuarios", getAllUsers);

router.get("/usuarios/:id", getUserById);

router.post("/usuarios", createUser);

router.delete("/usuarios/:id", deleteUser);

router.put("/usuarios/:id", updateUser);

export default router;
