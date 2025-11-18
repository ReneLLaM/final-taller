import { pool } from '../db.js';

// Obtener todas las materias
export const getMaterias = async (req, res) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado' });
        }

        const { rows } = await pool.query(
            `
                SELECT id, nombre, sigla, color, usuario_id 
                FROM materias 
                WHERE usuario_id = $1 
                ORDER BY sigla, nombre
            `,
            [userId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener materias:', error);
        res.status(500).json({ 
            message: 'Error al obtener materias',
            error: error.message 
        });
    }
};

// Obtener una materia por ID
export const getMateriaById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado' });
        }

        const { rows } = await pool.query(
            'SELECT id, nombre, sigla, color, usuario_id FROM materias WHERE id = $1 AND usuario_id = $2',
            [id, userId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Materia no encontrada' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error al obtener materia:', error);
        res.status(500).json({ 
            message: 'Error al obtener materia',
            error: error.message 
        });
    }
};

// Crear una nueva materia
export const createMateria = async (req, res) => {
    try {
        const { nombre, sigla, color } = req.body;
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado' });
        }

        const nombreLimpio = nombre?.trim();
        const siglaLimpia = sigla?.trim().toUpperCase();

        if (!nombreLimpio || !color || !siglaLimpia) {
            return res.status(400).json({ message: 'Nombre, sigla y color son obligatorios' });
        }
        
        const { rows } = await pool.query(
            'INSERT INTO materias (nombre, sigla, color, usuario_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [nombreLimpio, siglaLimpia, color, userId]
        );
        
        res.status(201).json({
            message: 'Materia creada exitosamente',
            materia: rows[0]
        });
    } catch (error) {
        console.error('Error al crear materia:', error);
        res.status(500).json({ 
            message: 'Error al crear materia',
            error: error.message 
        });
    }
};

// Actualizar una materia
export const updateMateria = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, sigla, color } = req.body;
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado' });
        }

        const nombreLimpio = nombre?.trim();
        const siglaLimpia = sigla?.trim().toUpperCase();

        if (!nombreLimpio || !color || !siglaLimpia) {
            return res.status(400).json({ message: 'Nombre, sigla y color son obligatorios' });
        }

        const { rows } = await pool.query(
            'UPDATE materias SET nombre = $1, sigla = $2, color = $3 WHERE id = $4 AND usuario_id = $5 RETURNING *',
            [nombreLimpio, siglaLimpia, color, id, userId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Materia no encontrada' });
        }
        
        res.json({
            message: 'Materia actualizada exitosamente',
            materia: rows[0]
        });
    } catch (error) {
        console.error('Error al actualizar materia:', error);
        res.status(500).json({ 
            message: 'Error al actualizar materia',
            error: error.message 
        });
    }
};

// Eliminar una materia
export const deleteMateria = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado' });
        }
        
        const { rows } = await pool.query(
            'DELETE FROM materias WHERE id = $1 AND usuario_id = $2 RETURNING *',
            [id, userId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Materia no encontrada' });
        }
        
        res.json({
            message: 'Materia eliminada exitosamente',
            materia: rows[0]
        });
    } catch (error) {
        console.error('Error al eliminar materia:', error);
        res.status(500).json({ 
            message: 'Error al eliminar materia',
            error: error.message 
        });
    }
};
