import { pool } from '../db.js';

// Obtener todas las clases con información de materias
export const getClases = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT 
                c.id,
                c.id_materia,
                c.sigla,
                c.docente,
                c.grupo,
                c.dia_semana,
                c.hora_inicio,
                c.hora_fin,
                c.tipo_clase,
                c.aula,
                m.nombre as materia_nombre,
                m.color as color
            FROM clases c
            INNER JOIN materias m ON c.id_materia = m.id
            ORDER BY c.dia_semana, c.hora_inicio
        `);

        res.json(rows);
    } catch (error) {
        console.error('Error al obtener clases:', error);
        res.status(500).json({ 
            message: 'Error al obtener clases',
            error: error.message 
        });
    }
};

// Obtener clases del usuario autenticado
export const getMisClases = async (req, res) => {
    try {
        const userId = req.userId; // Viene del middleware de autenticación

        const { rows } = await pool.query(`
            SELECT 
                c.id,
                c.id_materia,
                c.sigla,
                c.docente,
                c.grupo,
                c.dia_semana,
                c.hora_inicio,
                c.hora_fin,
                c.tipo_clase,
                c.aula,
                m.nombre as materia_nombre,
                m.color as color
            FROM clases c
            INNER JOIN materias m ON c.id_materia = m.id
            INNER JOIN inscripciones i ON c.id = i.id_clase
            WHERE i.id_usuario = $1
            ORDER BY c.dia_semana, c.hora_inicio
        `, [userId]);

        res.json(rows);
    } catch (error) {
        console.error('Error al obtener mis clases:', error);
        res.status(500).json({ 
            message: 'Error al obtener mis clases',
            error: error.message 
        });
    }
};

// Obtener clases por día de la semana
export const getClasesByDia = async (req, res) => {
    try {
        const { dia } = req.params;

        const { rows } = await pool.query(`
            SELECT 
                c.id,
                c.id_materia,
                c.sigla,
                c.docente,
                c.grupo,
                c.dia_semana,
                c.hora_inicio,
                c.hora_fin,
                c.tipo_clase,
                c.aula,
                m.nombre as materia_nombre,
                m.color as color
            FROM clases c
            INNER JOIN materias m ON c.id_materia = m.id
            WHERE c.dia_semana = $1
            ORDER BY c.hora_inicio
        `, [dia]);

        res.json(rows);
    } catch (error) {
        console.error('Error al obtener clases por día:', error);
        res.status(500).json({ 
            message: 'Error al obtener clases',
            error: error.message 
        });
    }
};

// Crear una nueva clase
export const createClase = async (req, res) => {
    try {
        const { 
            id_materia, 
            sigla, 
            docente, 
            grupo, 
            dia_semana, 
            hora_inicio, 
            hora_fin, 
            tipo_clase, 
            aula 
        } = req.body;

        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado' });
        }

        const materiaCheck = await pool.query(
            'SELECT id FROM materias WHERE id = $1 AND usuario_id = $2',
            [id_materia, userId]
        );

        if (materiaCheck.rows.length === 0) {
            return res.status(403).json({ message: 'La materia no pertenece al usuario autenticado' });
        }

        const { rows } = await pool.query(`
            INSERT INTO clases 
            (id_materia, sigla, docente, grupo, dia_semana, hora_inicio, hora_fin, tipo_clase, aula)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [id_materia, sigla, docente, grupo, dia_semana, hora_inicio, hora_fin, tipo_clase, aula]);

        res.status(201).json({
            message: 'Clase creada exitosamente',
            clase: rows[0]
        });
    } catch (error) {
        console.error('Error al crear clase:', error);
        res.status(500).json({ 
            message: 'Error al crear clase',
            error: error.message 
        });
    }
};

// Actualizar una clase
export const updateClase = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            id_materia, 
            sigla, 
            docente, 
            grupo, 
            dia_semana, 
            hora_inicio, 
            hora_fin, 
            tipo_clase, 
            aula 
        } = req.body;

        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado' });
        }

        const claseCheck = await pool.query(`
            SELECT c.id, c.id_materia 
            FROM clases c
            INNER JOIN materias m ON c.id_materia = m.id
            WHERE c.id = $1 AND m.usuario_id = $2
        `, [id, userId]);

        if (claseCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Clase no encontrada para este usuario' });
        }

        const materiaCheck = await pool.query(
            'SELECT id FROM materias WHERE id = $1 AND usuario_id = $2',
            [id_materia, userId]
        );

        if (materiaCheck.rows.length === 0) {
            return res.status(403).json({ message: 'La materia no pertenece al usuario autenticado' });
        }

        const { rows } = await pool.query(`
            UPDATE clases 
            SET 
                id_materia = $1,
                sigla = $2,
                docente = $3,
                grupo = $4,
                dia_semana = $5,
                hora_inicio = $6,
                hora_fin = $7,
                tipo_clase = $8,
                aula = $9
            WHERE id = $10
            RETURNING *
        `, [id_materia, sigla, docente, grupo, dia_semana, hora_inicio, hora_fin, tipo_clase, aula, id]);

        res.json({
            message: 'Clase actualizada exitosamente',
            clase: rows[0]
        });
    } catch (error) {
        console.error('Error al actualizar clase:', error);
        res.status(500).json({ 
            message: 'Error al actualizar clase',
            error: error.message 
        });
    }
};

// Eliminar una clase
export const deleteClase = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado' });
        }

        const claseCheck = await pool.query(`
            SELECT c.id
            FROM clases c
            INNER JOIN materias m ON c.id_materia = m.id
            WHERE c.id = $1 AND m.usuario_id = $2
        `, [id, userId]);

        if (claseCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Clase no encontrada para este usuario' });
        }

        const { rows } = await pool.query('DELETE FROM clases WHERE id = $1 RETURNING *', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Clase no encontrada' });
        }

        res.json({
            message: 'Clase eliminada exitosamente',
            clase: rows[0]
        });
    } catch (error) {
        console.error('Error al eliminar clase:', error);
        res.status(500).json({ 
            message: 'Error al eliminar clase',
            error: error.message 
        });
    }
};
