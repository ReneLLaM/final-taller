import { pool } from '../db.js';

// Crear una inscripción (inscribir al usuario en una clase)
export const createInscripcion = async (req, res) => {
    try {
        const userId = req.userId; // Del middleware de autenticación
        const { id_clase } = req.body;
        
        // Verificar que la clase existe
        const claseCheck = await pool.query('SELECT * FROM clases WHERE id = $1', [id_clase]);
        
        if (claseCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Clase no encontrada' });
        }
        
        // Verificar si ya está inscrito
        const inscripcionCheck = await pool.query(
            'SELECT * FROM inscripciones WHERE id_usuario = $1 AND id_clase = $2',
            [userId, id_clase]
        );
        
        if (inscripcionCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Ya estás inscrito en esta clase' });
        }
        
        // Crear la inscripción
        const { rows } = await pool.query(
            'INSERT INTO inscripciones (id_usuario, id_clase) VALUES ($1, $2) RETURNING *',
            [userId, id_clase]
        );
        
        res.status(201).json({
            message: 'Inscripción realizada exitosamente',
            inscripcion: rows[0]
        });
    } catch (error) {
        console.error('Error al crear inscripción:', error);
        res.status(500).json({ 
            message: 'Error al crear inscripción',
            error: error.message 
        });
    }
};

// Obtener inscripciones del usuario autenticado
export const getMisInscripciones = async (req, res) => {
    try {
        const userId = req.userId;
        
        const { rows } = await pool.query(`
            SELECT 
                i.id,
                i.id_clase,
                i.fecha_inscripcion,
                c.sigla,
                c.docente,
                c.grupo,
                m.nombre as materia_nombre
            FROM inscripciones i
            INNER JOIN clases c ON i.id_clase = c.id
            INNER JOIN materias m ON c.id_materia = m.id
            WHERE i.id_usuario = $1
            ORDER BY i.fecha_inscripcion DESC
        `, [userId]);
        
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener inscripciones:', error);
        res.status(500).json({ 
            message: 'Error al obtener inscripciones',
            error: error.message 
        });
    }
};

// Eliminar una inscripción
export const deleteInscripcion = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        
        const { rows } = await pool.query(
            'DELETE FROM inscripciones WHERE id = $1 AND id_usuario = $2 RETURNING *',
            [id, userId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Inscripción no encontrada' });
        }
        
        res.json({
            message: 'Inscripción eliminada exitosamente',
            inscripcion: rows[0]
        });
    } catch (error) {
        console.error('Error al eliminar inscripción:', error);
        res.status(500).json({ 
            message: 'Error al eliminar inscripción',
            error: error.message 
        });
    }
};

// Eliminar inscripción por id_clase
export const deleteInscripcionByClase = async (req, res) => {
    try {
        const userId = req.userId;
        const { id_clase } = req.params;
        
        const { rows } = await pool.query(
            'DELETE FROM inscripciones WHERE id_clase = $1 AND id_usuario = $2 RETURNING *',
            [id_clase, userId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Inscripción no encontrada' });
        }
        
        res.json({
            message: 'Desinscripción exitosa',
            inscripcion: rows[0]
        });
    } catch (error) {
        console.error('Error al eliminar inscripción:', error);
        res.status(500).json({ 
            message: 'Error al eliminar inscripción',
            error: error.message 
        });
    }
};
