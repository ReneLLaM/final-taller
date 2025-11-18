import { Router } from 'express';
import { 
    getClases,
    getMisClases, 
    getClasesByDia, 
    createClase, 
    updateClase, 
    deleteClase 
} from '../controllers/clases.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

// Obtener todas las clases
router.get('/clases', getClases);

// Obtener clases del usuario autenticado (protegida)
router.get('/mis-clases', verifyToken, getMisClases);

// Obtener clases por día
router.get('/clases/dia/:dia', getClasesByDia);

// Crear una nueva clase (protegida)
router.post('/clases', verifyToken, createClase);

// Actualizar una clase (protegida)
router.put('/clases/:id', verifyToken, updateClase);

// Eliminar una clase (protegida)
router.delete('/clases/:id', verifyToken, deleteClase);

export default router;
