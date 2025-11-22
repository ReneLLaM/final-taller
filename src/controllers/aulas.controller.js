import { pool } from '../db.js';

// Obtener todas las aulas (lista oficial)
export const getAulas = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, sigla, capacidad FROM aulas ORDER BY sigla ASC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener aulas:', error);
    res.status(500).json({
      message: 'Error al obtener aulas',
      error: error.message,
    });
  }
};

// Crear nueva aula (solo admin)
export const createAula = async (req, res) => {
  try {
    const { sigla, capacidad } = req.body;
    const siglaLimpia = sigla?.trim().toUpperCase();
    const capacidadNum = Number(capacidad);

    if (!siglaLimpia) {
      return res.status(400).json({ message: 'La sigla es obligatoria' });
    }
    if (!Number.isInteger(capacidadNum) || capacidadNum <= 0) {
      return res
        .status(400)
        .json({ message: 'La capacidad debe ser un número entero positivo' });
    }

    const { rows } = await pool.query(
      'INSERT INTO aulas (sigla, capacidad) VALUES ($1, $2) RETURNING id, sigla, capacidad',
      [siglaLimpia, capacidadNum]
    );

    res.status(201).json({
      message: 'Aula creada exitosamente',
      aula: rows[0],
    });
  } catch (error) {
    console.error('Error al crear aula:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        message: 'Ya existe un aula con esa sigla',
      });
    }
    res.status(500).json({
      message: 'Error al crear aula',
      error: error.message,
    });
  }
};

// Actualizar aula (solo admin)
export const updateAula = async (req, res) => {
  try {
    const { id } = req.params;
    const { sigla, capacidad } = req.body;
    const siglaLimpia = sigla?.trim().toUpperCase();
    const capacidadNum = Number(capacidad);

    if (!siglaLimpia) {
      return res.status(400).json({ message: 'La sigla es obligatoria' });
    }
    if (!Number.isInteger(capacidadNum) || capacidadNum <= 0) {
      return res
        .status(400)
        .json({ message: 'La capacidad debe ser un número entero positivo' });
    }

    const { rows } = await pool.query(
      'UPDATE aulas SET sigla = $1, capacidad = $2 WHERE id = $3 RETURNING id, sigla, capacidad',
      [siglaLimpia, capacidadNum, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Aula no encontrada' });
    }

    res.json({
      message: 'Aula actualizada exitosamente',
      aula: rows[0],
    });
  } catch (error) {
    console.error('Error al actualizar aula:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        message: 'Ya existe un aula con esa sigla',
      });
    }
    res.status(500).json({
      message: 'Error al actualizar aula',
      error: error.message,
    });
  }
};

// Eliminar aula (solo admin)
export const deleteAula = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'DELETE FROM aulas WHERE id = $1 RETURNING id, sigla, capacidad',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Aula no encontrada' });
    }

    res.json({
      message: 'Aula eliminada exitosamente',
      aula: rows[0],
    });
  } catch (error) {
    console.error('Error al eliminar aula:', error);
    res.status(500).json({
      message: 'Error al eliminar aula',
      error: error.message,
    });
  }
};
