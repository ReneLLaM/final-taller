import { Router } from 'express';
import { 
    createInscripcion, 
    getMisInscripciones, 
    deleteInscripcion,
    deleteInscripcionByClase 
} from '../controllers/inscripciones.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

// Crear una inscripción (protegida)
router.post('/inscripciones', verifyToken, createInscripcion);

// Obtener mis inscripciones (protegida)
router.get('/mis-inscripciones', verifyToken, getMisInscripciones);

// Eliminar una inscripción por ID (protegida)
router.delete('/inscripciones/:id', verifyToken, deleteInscripcion);

// Eliminar una inscripción por id_clase (protegida)
router.delete('/inscripciones/clase/:id_clase', verifyToken, deleteInscripcionByClase);

export default router;
