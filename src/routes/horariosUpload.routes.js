import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  uploadHorariosMiddleware,
  uploadHorarios,
} from '../controllers/horariosUploadJson.controller.js';

const router = Router();

// Subir múltiples archivos de horarios (solo administradores)
router.post(
  '/horarios/upload',
  authMiddleware,
  requireRole(3),
  uploadHorariosMiddleware,
  uploadHorarios,
);

export default router;
