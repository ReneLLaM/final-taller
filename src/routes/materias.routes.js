import { Router } from 'express';
import { 
    getMaterias, 
    getMateriaById, 
    createMateria, 
    updateMateria, 
    deleteMateria 
} from '../controllers/materias.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = Router();

// Obtener todas las materias
router.get('/materias', verifyToken, getMaterias);

// Obtener una materia por ID
router.get('/materias/:id', verifyToken, getMateriaById);

// Crear una nueva materia
router.post('/materias', verifyToken, createMateria);

// Actualizar una materia
router.put('/materias/:id', verifyToken, updateMateria);

// Eliminar una materia
router.delete('/materias/:id', verifyToken, deleteMateria);

export default router;
