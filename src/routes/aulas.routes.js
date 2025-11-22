import { Router } from 'express';
import {
  getAulas,
  createAula,
  updateAula,
  deleteAula,
} from '../controllers/aulas.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

// Lectura de aulas puede ser pública; modificaciones solo admin
router.get('/aulas', getAulas);
router.post('/aulas', authMiddleware, requireRole(3), createAula);
router.put('/aulas/:id', authMiddleware, requireRole(3), updateAula);
router.delete('/aulas/:id', authMiddleware, requireRole(3), deleteAula);

export default router;
