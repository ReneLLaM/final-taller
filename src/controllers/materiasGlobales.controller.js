import { pool } from '../db.js';

// Obtener todas las materias globales (solo admin)
export const getMateriasGlobales = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, sigla, color FROM materias_globales ORDER BY nombre ASC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener materias globales:', error);
    res.status(500).json({
      message: 'Error al obtener materias globales',
      error: error.message,
    });
  }
};

// Crear una nueva materia global (solo admin)
export const createMateriaGlobal = async (req, res) => {
  try {
    const { nombre, sigla, color } = req.body;
    const nombreLimpio = nombre?.trim();
    const siglaLimpia = sigla?.trim().toUpperCase();
    const colorLimpio = color?.trim();

    if (!nombreLimpio || !siglaLimpia || !colorLimpio) {
      return res.status(400).json({
        message: 'Nombre, sigla y color son obligatorios',
      });
    }

    const { rows } = await pool.query(
      'INSERT INTO materias_globales (nombre, sigla, color) VALUES ($1, $2, $3) RETURNING id, nombre, sigla, color',
      [nombreLimpio, siglaLimpia, colorLimpio]
    );

    res.status(201).json({
      message: 'Materia global creada exitosamente',
      materia: rows[0],
    });
  } catch (error) {
    console.error('Error al crear materia global:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        message: 'Ya existe una materia con ese nombre o sigla',
      });
    }
    res.status(500).json({
      message: 'Error al crear materia global',
      error: error.message,
    });
  }
};

// Actualizar una materia global (solo admin)
export const updateMateriaGlobal = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, sigla, color } = req.body;
    const nombreLimpio = nombre?.trim();
    const siglaLimpia = sigla?.trim().toUpperCase();
    const colorLimpio = color?.trim();

    if (!nombreLimpio || !siglaLimpia || !colorLimpio) {
      return res.status(400).json({
        message: 'Nombre, sigla y color son obligatorios',
      });
    }

    const { rows } = await pool.query(
      'UPDATE materias_globales SET nombre = $1, sigla = $2, color = $3 WHERE id = $4 RETURNING id, nombre, sigla, color',
      [nombreLimpio, siglaLimpia, colorLimpio, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Materia global no encontrada' });
    }

    res.json({
      message: 'Materia global actualizada exitosamente',
      materia: rows[0],
    });
  } catch (error) {
    console.error('Error al actualizar materia global:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        message: 'Ya existe una materia con ese nombre o sigla',
      });
    }
    res.status(500).json({
      message: 'Error al actualizar materia global',
      error: error.message,
    });
  }
};

// Eliminar una materia global (solo admin)
export const deleteMateriaGlobal = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'DELETE FROM materias_globales WHERE id = $1 RETURNING id, nombre, sigla, color',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Materia global no encontrada' });
    }

    res.json({
      message: 'Materia global eliminada exitosamente',
      materia: rows[0],
    });
  } catch (error) {
    console.error('Error al eliminar materia global:', error);
    res.status(500).json({
      message: 'Error al eliminar materia global',
      error: error.message,
    });
  }
};
