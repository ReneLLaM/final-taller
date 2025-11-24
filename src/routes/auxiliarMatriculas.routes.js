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
  iniciarVotacion,
  finalizarVotacion,
  getDisponibilidadVotacion,
  emitirVotoVotacion,
  eliminarVotoVotacion,
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

router.post(
  '/auxiliar-materias/:auxMateriaId/votacion/iniciar',
  verifyToken,
  requireRole(2),
  iniciarVotacion,
);

router.post(
  '/auxiliar-materias/:auxMateriaId/votacion/finalizar',
  verifyToken,
  requireRole(2),
  finalizarVotacion,
);

router.get(
  '/auxiliar-materias/:auxMateriaId/votacion/disponibilidad',
  verifyToken,
  requireRole(1, 2),
  getDisponibilidadVotacion,
);

router.post(
  '/auxiliar-materias/:auxMateriaId/votacion/votos',
  verifyToken,
  requireRole(1, 2),
  emitirVotoVotacion,
);

router.delete(
  '/auxiliar-materias/:auxMateriaId/votacion/votos',
  verifyToken,
  requireRole(1, 2),
  eliminarVotoVotacion,
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
