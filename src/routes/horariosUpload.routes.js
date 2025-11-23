import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  uploadHorariosMiddleware,
  uploadHorarios,
  getAulasPorDia,
  getHorariosByDiaAdmin,
  createHorarioAdmin,
  updateHorarioAdmin,
  deleteHorarioAdmin,
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

// Obtener aulas por día desde clases_horarios (solo administradores)
router.get(
  '/horarios/aulas',
  authMiddleware,
  requireRole(3),
  getAulasPorDia,
);

// Listar registros de clases_horarios por día (solo administradores)
router.get(
  '/horarios/dia/:dia',
  authMiddleware,
  requireRole(3),
  getHorariosByDiaAdmin,
);

// Crear un nuevo registro de clases_horarios (solo administradores)
router.post(
  '/horarios',
  authMiddleware,
  requireRole(3),
  createHorarioAdmin,
);

// Actualizar un registro de clases_horarios (solo administradores)
router.put(
  '/horarios/:id',
  authMiddleware,
  requireRole(3),
  updateHorarioAdmin,
);

// Eliminar un registro de clases_horarios (solo administradores)
router.delete(
  '/horarios/:id',
  authMiddleware,
  requireRole(3),
  deleteHorarioAdmin,
);

export default router;
