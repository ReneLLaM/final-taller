import { Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
    getAuxiliarMaterias,
    getMisAuxiliarMaterias,
    createAuxiliarMateria,
    updateAuxiliarMateria,
    deleteAuxiliarMateria,
} from '../controllers/auxiliarMaterias.controller.js';

const router = Router();

// Rutas para administrador (rol_id = 3)
router.get('/auxiliares/:auxiliarId/materias', verifyToken, requireRole(3), getAuxiliarMaterias);
router.post('/auxiliares/:auxiliarId/materias', verifyToken, requireRole(3), createAuxiliarMateria);
router.put('/auxiliares/:auxiliarId/materias/:id', verifyToken, requireRole(3), updateAuxiliarMateria);
router.delete('/auxiliares/:auxiliarId/materias/:id', verifyToken, requireRole(3), deleteAuxiliarMateria);

// Rutas para el propio auxiliar (rol_id = 2)
router.get('/mis-auxiliar-materias', verifyToken, requireRole(2), getMisAuxiliarMaterias);

export default router;
