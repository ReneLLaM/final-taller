import { pool } from '../db.js';

function generateRandomCode() {
  const num = Math.floor(100000 + Math.random() * 900000);
  return String(num);
}

export const getMatriculacionDetalle = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    const auxiliarId = req.user.userId ?? req.user.id ?? req.userId;
    const auxMateriaId = parseInt(req.params.auxMateriaId, 10);
    if (!auxMateriaId || Number.isNaN(auxMateriaId)) {
      return res.status(400).json({ message: 'Materia inválida' });
    }

    const { rows } = await pool.query(
      `SELECT
        am.id,
        am.auxiliar_id,
        am.materia_global_id,
        am.grupo,
        am.veces_por_semana,
        am.horas_por_clase,
        mg.nombre AS materia_nombre,
        mg.sigla,
        mg.color,
        mat.id AS matriculacion_id,
        mat.codigo,
        mat.activo,
        mat.fecha_creacion
      FROM auxiliar_materias am
      INNER JOIN materias_globales mg ON am.materia_global_id = mg.id
      LEFT JOIN auxiliar_matriculaciones mat ON mat.auxiliar_materia_id = am.id
      WHERE am.id = $1 AND am.auxiliar_id = $2`,
      [auxMateriaId, auxiliarId],
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Materia de auxiliar no encontrada' });
    }

    const row = rows[0];

    const { rows: inscritos } = await pool.query(
      `SELECT
        ame.estudiante_id AS id,
        u.nombre_completo,
        u.cu,
        u.correo,
        u.carrera
      FROM auxiliar_matricula_estudiantes ame
      INNER JOIN auxiliar_matriculaciones mat ON ame.matriculacion_id = mat.id
      INNER JOIN usuarios u ON ame.estudiante_id = u.id
      WHERE mat.auxiliar_materia_id = $1
      ORDER BY u.nombre_completo`,
      [auxMateriaId],
    );

    const matriculacion = row.matriculacion_id
      ? {
          id: row.matriculacion_id,
          codigo: row.codigo,
          activo: row.activo,
          fecha_creacion: row.fecha_creacion,
        }
      : null;

    const auxiliarMateria = {
      id: row.id,
      auxiliar_id: row.auxiliar_id,
      materia_global_id: row.materia_global_id,
      grupo: row.grupo,
      veces_por_semana: row.veces_por_semana,
      horas_por_clase: row.horas_por_clase,
      materia_nombre: row.materia_nombre,
      sigla: row.sigla,
      color: row.color,
    };

    res.json({ auxiliarMateria, matriculacion, estudiantes: inscritos });
  } catch (error) {
    console.error('Error en getMatriculacionDetalle:', error);
    res.status(500).json({
      message: 'Error al obtener información de matriculación',
      error: error.message,
    });
  }
};

export const cerrarMatriculacion = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const auxiliarId = req.user.userId ?? req.user.id ?? req.userId;
    const auxMateriaId = parseInt(req.params.auxMateriaId, 10);

    if (!auxMateriaId || Number.isNaN(auxMateriaId)) {
      return res.status(400).json({ message: 'Materia inválida' });
    }

    const { rows } = await pool.query(
      `SELECT mat.id, mat.codigo, mat.activo
       FROM auxiliar_matriculaciones mat
       INNER JOIN auxiliar_materias am ON mat.auxiliar_materia_id = am.id
       WHERE am.id = $1 AND am.auxiliar_id = $2`,
      [auxMateriaId, auxiliarId],
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Esta materia no tiene código de matriculación activo' });
    }

    const matriculacionId = rows[0].id;

    const { rows: updated } = await pool.query(
      `UPDATE auxiliar_matriculaciones
       SET activo = FALSE
       WHERE id = $1
       RETURNING id, codigo, activo, fecha_creacion`,
      [matriculacionId],
    );

    res.json({
      message: 'Matriculación cerrada. Ya no se aceptan nuevas inscripciones.',
      matriculacion: updated[0],
    });
  } catch (error) {
    console.error('Error en cerrarMatriculacion:', error);
    res.status(500).json({
      message: 'Error al cerrar la matriculación',
      error: error.message,
    });
  }
};

export const desinscribirsePorCodigo = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const usuarioId = req.user.userId ?? req.user.id ?? req.userId;
    let { codigo } = req.body || {};
    codigo = codigo ? String(codigo).trim() : '';

    if (!codigo) {
      return res.status(400).json({ message: 'Debes ingresar el código de la auxiliatura de la que deseas desmatricularte' });
    }

    const { rows } = await pool.query(
      `SELECT
        mat.id,
        am.id AS auxiliar_materia_id,
        am.grupo,
        am.auxiliar_id,
        mg.nombre AS materia_nombre,
        mg.sigla,
        mg.color
       FROM auxiliar_matriculaciones mat
       INNER JOIN auxiliar_materias am ON mat.auxiliar_materia_id = am.id
       INNER JOIN materias_globales mg ON am.materia_global_id = mg.id
       WHERE mat.codigo = $1`,
      [codigo],
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Código de matriculación no encontrado' });
    }

    const row = rows[0];
    const matriculacionId = row.id;

    const { rows: deleted } = await pool.query(
      `DELETE FROM auxiliar_matricula_estudiantes
       WHERE matriculacion_id = $1 AND estudiante_id = $2
       RETURNING id`,
      [matriculacionId, usuarioId],
    );

    if (!deleted.length) {
      return res.status(400).json({ message: 'No estabas inscrito en esta auxiliatura' });
    }

    res.json({
      message: 'Te desinscribiste de la auxiliatura',
      materia: {
        nombre: row.materia_nombre,
        sigla: row.sigla,
        grupo: row.grupo,
        color: row.color,
      },
    });
  } catch (error) {
    console.error('Error en desinscribirsePorCodigo:', error);
    res.status(500).json({
      message: 'Error al desinscribirse por código',
      error: error.message,
    });
  }
};

export const getMisAuxiliaturasMatriculadas = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const usuarioId = req.user.userId ?? req.user.id ?? req.userId;

    const { rows } = await pool.query(
      `SELECT
        ame.id AS inscripcion_id,
        mat.id AS matriculacion_id,
        mat.codigo,
        am.id AS auxiliar_materia_id,
        am.grupo,
        mg.nombre AS materia_nombre,
        mg.sigla,
        mg.color,
        u.nombre_completo AS auxiliar_nombre
       FROM auxiliar_matricula_estudiantes ame
       INNER JOIN auxiliar_matriculaciones mat ON ame.matriculacion_id = mat.id
       INNER JOIN auxiliar_materias am ON mat.auxiliar_materia_id = am.id
       INNER JOIN materias_globales mg ON am.materia_global_id = mg.id
       INNER JOIN usuarios u ON am.auxiliar_id = u.id
       WHERE ame.estudiante_id = $1
       ORDER BY mg.nombre, am.grupo`,
      [usuarioId],
    );

    res.json(rows);
  } catch (error) {
    console.error('Error en getMisAuxiliaturasMatriculadas:', error);
    res.status(500).json({
      message: 'Error al obtener tus auxiliaturas matriculadas',
      error: error.message,
    });
  }
};

export const generarCodigoMatriculacion = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    const auxiliarId = req.user.userId ?? req.user.id ?? req.userId;
    const auxMateriaId = parseInt(req.params.auxMateriaId, 10);
    if (!auxMateriaId || Number.isNaN(auxMateriaId)) {
      return res.status(400).json({ message: 'Materia inválida' });
    }

    const { rows: matRows } = await pool.query(
      `SELECT am.id
       FROM auxiliar_materias am
       WHERE am.id = $1 AND am.auxiliar_id = $2`,
      [auxMateriaId, auxiliarId],
    );

    if (!matRows.length) {
      return res.status(404).json({ message: 'Materia de auxiliar no encontrada' });
    }

    let { codigo } = req.body || {};
    if (codigo) {
      codigo = String(codigo).trim();
      if (!codigo) {
        return res.status(400).json({ message: 'El código no puede estar vacío' });
      }
      if (codigo.length > 20) {
        return res.status(400).json({ message: 'El código es demasiado largo' });
      }
    } else {
      codigo = generateRandomCode();
    }

    const existing = await pool.query(
      'SELECT id FROM auxiliar_matriculaciones WHERE auxiliar_materia_id = $1',
      [auxMateriaId],
    );

    let matriculacion;

    if (existing.rows.length) {
      const { rows } = await pool.query(
        `UPDATE auxiliar_matriculaciones
         SET codigo = $1, activo = TRUE, fecha_creacion = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [codigo, existing.rows[0].id],
      );
      matriculacion = rows[0];
    } else {
      const { rows } = await pool.query(
        `INSERT INTO auxiliar_matriculaciones (auxiliar_materia_id, codigo, activo)
         VALUES ($1, $2, TRUE)
         RETURNING *`,
        [auxMateriaId, codigo],
      );
      matriculacion = rows[0];
    }

    res.status(200).json({ message: 'Código de matriculación listo', matriculacion });
  } catch (error) {
    console.error('Error en generarCodigoMatriculacion:', error);
    if (error.code === '23505') {
      return res.status(400).json({ message: 'El código ya está en uso, prueba con otro' });
    }
    res.status(500).json({
      message: 'Error al generar código de matriculación',
      error: error.message,
    });
  }
};

export const inscribirsePorCodigo = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    const usuarioId = req.user.userId ?? req.user.id ?? req.userId;
    let { codigo } = req.body || {};
    codigo = codigo ? String(codigo).trim() : '';

    if (!codigo) {
      return res.status(400).json({ message: 'Debes ingresar un código de matriculación' });
    }

    const { rows } = await pool.query(
      `SELECT
        mat.id,
        mat.activo,
        am.id AS auxiliar_materia_id,
        am.grupo,
        am.auxiliar_id,
        mg.nombre AS materia_nombre,
        mg.sigla,
        mg.color
       FROM auxiliar_matriculaciones mat
       INNER JOIN auxiliar_materias am ON mat.auxiliar_materia_id = am.id
       INNER JOIN materias_globales mg ON am.materia_global_id = mg.id
       WHERE mat.codigo = $1`,
      [codigo],
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Código de matriculación no encontrado' });
    }

    const row = rows[0];

    if (!row.activo) {
      return res.status(400).json({ message: 'La matriculación para esta materia está cerrada' });
    }

    const matriculacionId = row.id;

    // Evitar que el auxiliar se inscriba en su propia auxiliatura
    if (row.auxiliar_id === usuarioId) {
      return res.status(400).json({ message: 'No puedes inscribirte a la auxiliatura que tú dictas' });
    }

    const { rows: yaInscrito } = await pool.query(
      'SELECT 1 FROM auxiliar_matricula_estudiantes WHERE matriculacion_id = $1 AND estudiante_id = $2',
      [matriculacionId, usuarioId],
    );

    if (yaInscrito.length) {
      return res.status(400).json({ message: 'Ya estás inscrito en esta auxiliatura' });
    }

    const { rows: insertRows } = await pool.query(
      `INSERT INTO auxiliar_matricula_estudiantes (matriculacion_id, estudiante_id)
       VALUES ($1, $2)
       RETURNING id, fecha_inscripcion`,
      [matriculacionId, usuarioId],
    );

    res.status(201).json({
      message: 'Te inscribiste correctamente en la auxiliatura',
      matriculacion: {
        id: matriculacionId,
        codigo,
        auxiliar_materia_id: row.auxiliar_materia_id,
      },
      materia: {
        nombre: row.materia_nombre,
        sigla: row.sigla,
        grupo: row.grupo,
        color: row.color,
      },
      inscripcion: insertRows[0],
    });
  } catch (error) {
    console.error('Error en inscribirsePorCodigo:', error);
    res.status(500).json({
      message: 'Error al inscribirse por código',
      error: error.message,
    });
  }
};

export const eliminarInscrito = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const auxiliarId = req.user.userId ?? req.user.id ?? req.userId;
    const auxMateriaId = parseInt(req.params.auxMateriaId, 10);
    const estudianteId = parseInt(req.params.estudianteId, 10);

    if (!auxMateriaId || Number.isNaN(auxMateriaId) || !estudianteId || Number.isNaN(estudianteId)) {
      return res.status(400).json({ message: 'Parámetros inválidos' });
    }

    const { rows } = await pool.query(
      `SELECT mat.id
       FROM auxiliar_matriculaciones mat
       INNER JOIN auxiliar_materias am ON mat.auxiliar_materia_id = am.id
       WHERE am.id = $1 AND am.auxiliar_id = $2`,
      [auxMateriaId, auxiliarId],
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Materia de auxiliar no encontrada o sin código activo' });
    }

    const matriculacionId = rows[0].id;

    const { rows: deleted } = await pool.query(
      `DELETE FROM auxiliar_matricula_estudiantes
       WHERE matriculacion_id = $1 AND estudiante_id = $2
       RETURNING id`,
      [matriculacionId, estudianteId],
    );

    if (!deleted.length) {
      return res.status(404).json({ message: 'El estudiante no estaba inscrito en esta auxiliatura' });
    }

    res.json({ message: 'Estudiante eliminado de la lista de inscritos' });
  } catch (error) {
    console.error('Error en eliminarInscrito:', error);
    res.status(500).json({
      message: 'Error al eliminar inscripción del estudiante',
      error: error.message,
    });
  }
};
