import { Router } from 'express';
import {
    getCarreras,
    createCarrera,
    updateCarrera,
    deleteCarrera,
} from '../controllers/carreras.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

// Lista de carreras oficial (pública, usada en registro y autocompletado)
router.get('/carreras', getCarreras);

// CRUD de carreras solo para administradores
router.post('/carreras', authMiddleware, requireRole(3), createCarrera);
router.put('/carreras/:id', authMiddleware, requireRole(3), updateCarrera);
router.delete('/carreras/:id', authMiddleware, requireRole(3), deleteCarrera);

export default router;
