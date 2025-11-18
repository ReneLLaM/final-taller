import { pool } from '../db.js';

// Obtener todas las carreras (lista oficial)
export const getCarreras = async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, nombre FROM carreras ORDER BY nombre ASC'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener carreras:', error);
        res.status(500).json({
            message: 'Error al obtener carreras',
            error: error.message,
        });
    }
};

// Crear una nueva carrera (solo admin)
export const createCarrera = async (req, res) => {
    try {
        const { nombre } = req.body;
        const nombreLimpio = nombre?.trim();

        if (!nombreLimpio) {
            return res
                .status(400)
                .json({ message: 'El nombre de la carrera es obligatorio' });
        }

        const { rows } = await pool.query(
            'INSERT INTO carreras (nombre) VALUES ($1) RETURNING id, nombre',
            [nombreLimpio]
        );

        res.status(201).json({
            message: 'Carrera creada exitosamente',
            carrera: rows[0],
        });
    } catch (error) {
        console.error('Error al crear carrera:', error);
        if (error.code === '23505') {
            return res.status(400).json({
                message: 'Ya existe una carrera con ese nombre',
            });
        }
        res.status(500).json({
            message: 'Error al crear carrera',
            error: error.message,
        });
    }
};

// Actualizar una carrera (solo admin)
export const updateCarrera = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;
        const nombreLimpio = nombre?.trim();

        if (!nombreLimpio) {
            return res
                .status(400)
                .json({ message: 'El nombre de la carrera es obligatorio' });
        }

        const { rows } = await pool.query(
            'UPDATE carreras SET nombre = $1 WHERE id = $2 RETURNING id, nombre',
            [nombreLimpio, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Carrera no encontrada' });
        }

        res.json({
            message: 'Carrera actualizada exitosamente',
            carrera: rows[0],
        });
    } catch (error) {
        console.error('Error al actualizar carrera:', error);
        if (error.code === '23505') {
            return res.status(400).json({
                message: 'Ya existe una carrera con ese nombre',
            });
        }
        res.status(500).json({
            message: 'Error al actualizar carrera',
            error: error.message,
        });
    }
};

// Eliminar una carrera (solo admin)
export const deleteCarrera = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query(
            'DELETE FROM carreras WHERE id = $1 RETURNING id, nombre',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Carrera no encontrada' });
        }

        res.json({
            message: 'Carrera eliminada exitosamente',
            carrera: rows[0],
        });
    } catch (error) {
        console.error('Error al eliminar carrera:', error);
        res.status(500).json({
            message: 'Error al eliminar carrera',
            error: error.message,
        });
    }
};
