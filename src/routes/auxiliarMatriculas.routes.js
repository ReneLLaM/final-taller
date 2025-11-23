import { Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  getMatriculacionDetalle,
  generarCodigoMatriculacion,
  cerrarMatriculacion,
  inscribirsePorCodigo,
  eliminarInscrito,
  getMisAuxiliaturasMatriculadas,
  desinscribirsePorCodigo,
} from '../controllers/auxiliarMatriculas.controller.js';

const router = Router();

router.get(
  '/auxiliar-materias/:auxMateriaId/matriculacion',
  verifyToken,
  requireRole(2),
  getMatriculacionDetalle,
);

router.post(
  '/auxiliar-materias/:auxMateriaId/matriculacion/generar',
  verifyToken,
  requireRole(2),
  generarCodigoMatriculacion,
);

router.post(
  '/auxiliar-materias/:auxMateriaId/matriculacion/cerrar',
  verifyToken,
  requireRole(2),
  cerrarMatriculacion,
);

router.post('/matriculacion/inscribirse', verifyToken, requireRole(1, 2), inscribirsePorCodigo);

router.post('/matriculacion/desinscribirse', verifyToken, requireRole(1, 2), desinscribirsePorCodigo);

router.get(
  '/matriculacion/mis-auxiliaturas',
  verifyToken,
  requireRole(1, 2),
  getMisAuxiliaturasMatriculadas,
);

router.delete(
  '/auxiliar-materias/:auxMateriaId/matriculacion/estudiantes/:estudianteId',
  verifyToken,
  requireRole(2),
  eliminarInscrito,
);

export default router;
