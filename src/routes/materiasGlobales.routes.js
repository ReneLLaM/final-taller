import { Router } from 'express';
import {
  getMateriasGlobales,
  createMateriaGlobal,
  updateMateriaGlobal,
  deleteMateriaGlobal,
} from '../controllers/materiasGlobales.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

// CRUD de materias globales solo para administradores
router.get('/materias-globales', authMiddleware, requireRole(3), getMateriasGlobales);
router.post('/materias-globales', authMiddleware, requireRole(3), createMateriaGlobal);
router.put('/materias-globales/:id', authMiddleware, requireRole(3), updateMateriaGlobal);
router.delete('/materias-globales/:id', authMiddleware, requireRole(3), deleteMateriaGlobal);

export default router;
