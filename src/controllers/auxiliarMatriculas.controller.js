import { pool } from '../db.js';
import { getIO } from '../socket.js';

function generateRandomCode() {
  const num = Math.floor(100000 + Math.random() * 900000);
  return String(num);
}

function timeToMinutes(t) {
  if (!t) return 0;
  const str = typeof t === 'string' ? t : t.toString().substring(0, 5);
  const [h, m] = str.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function rangesOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
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
        mat.fecha_creacion,
        v.id AS votacion_id,
        v.activa AS votacion_activa,
        v.fecha_inicio AS votacion_fecha_inicio,
        v.fecha_cierre AS votacion_fecha_cierre
      FROM auxiliar_materias am
      INNER JOIN materias_globales mg ON am.materia_global_id = mg.id
      LEFT JOIN auxiliar_matriculaciones mat ON mat.auxiliar_materia_id = am.id
      LEFT JOIN auxiliar_votaciones v ON v.auxiliar_materia_id = am.id
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

    const votacion = row.votacion_id
      ? {
          id: row.votacion_id,
          activa: row.votacion_activa,
          fecha_inicio: row.votacion_fecha_inicio,
          fecha_cierre: row.votacion_fecha_cierre,
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

    res.json({ auxiliarMateria, matriculacion, votacion, estudiantes: inscritos });
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
        u.nombre_completo AS auxiliar_nombre,
        v.id AS votacion_id,
        v.activa AS votacion_activa
       FROM auxiliar_matricula_estudiantes ame
       INNER JOIN auxiliar_matriculaciones mat ON ame.matriculacion_id = mat.id
       INNER JOIN auxiliar_materias am ON mat.auxiliar_materia_id = am.id
       INNER JOIN materias_globales mg ON am.materia_global_id = mg.id
       INNER JOIN usuarios u ON am.auxiliar_id = u.id
       LEFT JOIN auxiliar_votaciones v ON v.auxiliar_materia_id = am.id
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

export const getDisponibilidadVotacion = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const usuarioId = req.user.userId ?? req.user.id ?? req.userId;
    const rolId = req.user.rol_id;
    const auxMateriaId = parseInt(req.params.auxMateriaId, 10);

    if (!auxMateriaId || Number.isNaN(auxMateriaId)) {
      return res.status(400).json({ message: 'Materia inválida' });
    }

    const { rows: materiaRows } = await pool.query(
      `SELECT
        am.id,
        am.auxiliar_id,
        am.veces_por_semana,
        am.horas_por_clase,
        am.grupo,
        mg.nombre AS materia_nombre,
        mg.sigla AS materia_sigla,
        v.id AS votacion_id,
        v.activa AS votacion_activa
       FROM auxiliar_materias am
       JOIN materias_globales mg ON mg.id = am.materia_global_id
       LEFT JOIN auxiliar_votaciones v ON v.auxiliar_materia_id = am.id
       WHERE am.id = $1`,
      [auxMateriaId],
    );

    if (!materiaRows.length) {
      return res.status(404).json({ message: 'Materia de auxiliar no encontrada' });
    }

    const materia = materiaRows[0];

    if (!materia.votacion_id || !materia.votacion_activa) {
      return res.status(400).json({ message: 'No hay una votación activa para esta auxiliatura' });
    }

    // Permisos:
    // - El auxiliar asignado siempre puede ver.
    // - Cualquier usuario matriculado en la auxiliatura también puede ver,
    //   incluso si su rol actual es auxiliar (modo auxiliar).
    const esAuxiliarDeLaMateria = materia.auxiliar_id === usuarioId;

    const { rows: inscRows } = await pool.query(
      `SELECT 1
       FROM auxiliar_matricula_estudiantes ame
       INNER JOIN auxiliar_matriculaciones mat ON ame.matriculacion_id = mat.id
       WHERE mat.auxiliar_materia_id = $1 AND ame.estudiante_id = $2`,
      [auxMateriaId, usuarioId],
    );

    const esEstudianteMatriculado = inscRows.length > 0;

    if (rolId === 2) {
      if (!esAuxiliarDeLaMateria && !esEstudianteMatriculado) {
        return res.status(403).json({ message: 'No autorizado para ver la disponibilidad de esta auxiliatura' });
      }
    } else if (rolId === 1) {
      if (!esEstudianteMatriculado) {
        return res.status(403).json({ message: 'No estás inscrito en esta auxiliatura' });
      }
    } else {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const { rows: aulasRows } = await pool.query('SELECT sigla, capacidad FROM aulas');
    const aulas = aulasRows.map((r) => ({
      sigla: r.sigla,
      capacidad: typeof r.capacidad === 'number' ? r.capacidad : parseInt(r.capacidad, 10) || 0,
    }));

    const { rows: horariosRows } = await pool.query(
      `SELECT dia_semana, hora_inicio, hora_fin, aula
       FROM clases_horarios`,
    );

    const ocupacionPorDiaYAula = new Map();
    horariosRows.forEach((row) => {
      const dia = parseInt(row.dia_semana, 10);
      const aula = row.aula;
      if (!aula) return;
      const key = `${dia}|${aula}`;
      const inicio = timeToMinutes(row.hora_inicio);
      const fin = timeToMinutes(row.hora_fin);
      if (!ocupacionPorDiaYAula.has(key)) {
        ocupacionPorDiaYAula.set(key, []);
      }
      ocupacionPorDiaYAula.get(key).push({ inicio, fin });
    });

    const { rows: estRows } = await pool.query(
      `SELECT ame.estudiante_id
       FROM auxiliar_matricula_estudiantes ame
       INNER JOIN auxiliar_matriculaciones mat ON ame.matriculacion_id = mat.id
       WHERE mat.auxiliar_materia_id = $1`,
      [auxMateriaId],
    );

    const estudianteIds = estRows.map((r) => r.estudiante_id);

    const clasesPorEstudiante = new Map();
    if (estudianteIds.length) {
      const { rows: clasesEstRows } = await pool.query(
        `SELECT i.id_usuario AS estudiante_id, c.dia_semana, c.hora_inicio, c.hora_fin, c.tipo_clase
         FROM inscripciones i
         INNER JOIN clases c ON i.id_clase = c.id
         WHERE i.id_usuario = ANY($1::int[]) AND c.tipo_clase IN (1, 2, 3)`,
        [estudianteIds],
      );

      clasesEstRows.forEach((row) => {
        const id = row.estudiante_id;
        if (!clasesPorEstudiante.has(id)) {
          clasesPorEstudiante.set(id, []);
        }
        clasesPorEstudiante.get(id).push({
          dia_semana: parseInt(row.dia_semana, 10),
          inicio: timeToMinutes(row.hora_inicio),
          fin: timeToMinutes(row.hora_fin),
        });
      });
    }

    const { rows: clasesAuxRows } = await pool.query(
      `SELECT c.dia_semana, c.hora_inicio, c.hora_fin, c.tipo_clase
       FROM inscripciones i
       INNER JOIN clases c ON i.id_clase = c.id
       WHERE i.id_usuario = $1 AND c.tipo_clase IN (1, 2, 3)`,
      [materia.auxiliar_id],
    );

    const clasesAuxiliar = clasesAuxRows.map((row) => ({
      dia_semana: parseInt(row.dia_semana, 10),
      inicio: timeToMinutes(row.hora_inicio),
      fin: timeToMinutes(row.hora_fin),
    }));

    const horasPorClase = materia.horas_por_clase || 2;
    const vecesPorSemana = materia.veces_por_semana ? parseInt(materia.veces_por_semana, 10) || 1 : 1;

    let misVotos = [];
    let votosUsados = 0;
    if (materia.votacion_id) {
      const { rows: votosRows } = await pool.query(
        `SELECT id, dia_semana, hora_inicio, hora_fin
         FROM auxiliar_votos
         WHERE votacion_id = $1 AND estudiante_id = $2
         ORDER BY dia_semana, hora_inicio`,
        [materia.votacion_id, usuarioId],
      );
      misVotos = votosRows;
      votosUsados = votosRows.length;
    }

    const totalEstudiantes = estudianteIds.length;

    // Bloques fijos de 2 horas: 07-09, 09-11, 11-13, 14-16, 16-18, 18-20, 20-22
    // (se omite la franja de 13 a 14 como indicaste).
    const bloquesInicioHoras = [7, 9, 11, 14, 16, 18, 20];
    const duracionBloqueMin = 120;

    const slots = [];

    for (let dia = 1; dia <= 6; dia += 1) {
      bloquesInicioHoras.forEach((hInicio) => {
        if (dia === 6 && hInicio >= 14) {
          return;
        }
        const inicioSlot = hInicio * 60;
        const finSlot = inicioSlot + duracionBloqueMin;

        let aulasLibres = 0;
        let aulasAdecuadas = 0;
        let capacidadMaxLibre = 0;
        let mejorAulaAdecuada = null;

        aulas.forEach((aula) => {
          const key = `${dia}|${aula.sigla}`;
          const ocupaciones = ocupacionPorDiaYAula.get(key) || [];
          const ocupada = ocupaciones.some((o) => rangesOverlap(inicioSlot, finSlot, o.inicio, o.fin));
          if (!ocupada) {
            aulasLibres += 1;
            const cap = aula.capacidad || 0;
            capacidadMaxLibre = Math.max(capacidadMaxLibre, cap);
            if (totalEstudiantes > 0 && cap >= totalEstudiantes) {
              aulasAdecuadas += 1;
              if (!mejorAulaAdecuada || cap < mejorAulaAdecuada.capacidad) {
                mejorAulaAdecuada = aula;
              }
            }
          }
        });

        const hayAulasDisponibles = aulasLibres > 0;
        const hayAulaCapSuficiente = aulasAdecuadas > 0;

        const auxOcupado = clasesAuxiliar.some(
          (c) => c.dia_semana === dia && rangesOverlap(inicioSlot, finSlot, c.inicio, c.fin),
        );
        const auxiliarDisponible = !auxOcupado;

        let estudiantesDisponibles = 0;
        if (totalEstudiantes > 0) {
          estudianteIds.forEach((id) => {
            const clasesEst = clasesPorEstudiante.get(id) || [];
            const ocupado = clasesEst.some(
              (c) => c.dia_semana === dia && rangesOverlap(inicioSlot, finSlot, c.inicio, c.fin),
            );
            if (!ocupado) {
              estudiantesDisponibles += 1;
            }
          });
        }

        const porcentajeDisponibles =
          totalEstudiantes > 0 ? Math.round((estudiantesDisponibles * 100) / totalEstudiantes) : null;

        const horaInicioStr = `${String(hInicio).padStart(2, '0')}:00`;
        const horaFinStr = `${String(hInicio + 2).padStart(2, '0')}:00`;

        slots.push({
          dia_semana: dia,
          hora_inicio: horaInicioStr,
          hora_fin: horaFinStr,
          inicio_min: inicioSlot,
          aulas_libres: aulasLibres,
          aulas_adecuadas: aulasAdecuadas,
          capacidad_max_libre: capacidadMaxLibre,
          hay_aulas_disponibles: hayAulasDisponibles,
          hay_aula_capacidad_suficiente: hayAulaCapSuficiente,
          auxiliar_disponible: auxiliarDisponible,
          total_estudiantes: totalEstudiantes,
          estudiantes_disponibles: estudiantesDisponibles,
          porcentaje_disponibles: porcentajeDisponibles,
          aula_sugerida: mejorAulaAdecuada ? mejorAulaAdecuada.sigla : null,
        });
      });
    }

    // Elegir como "recomendadas" solo hasta 'veces_por_semana' bloques donde
    // todos los estudiantes pueden y existe al menos un aula con capacidad suficiente.
    // Además:
    // - No recomendar más de una vez por día.
    // - No recomendar bloques del sábado (día 6) a partir de las 14:00.
    const candidatos = slots.filter((s) => {
      if (!s.auxiliar_disponible) return false;
      if (!s.hay_aulas_disponibles) return false;
      if (!s.hay_aula_capacidad_suficiente) return false;
      if (s.porcentaje_disponibles === null) return false;
      if (s.porcentaje_disponibles !== 100) return false;

      // Sábado (día 6) después de las 13:00 -> no se recomienda
      if (s.dia_semana === 6) {
        const horaEntera = parseInt(String(s.hora_inicio).split(':')[0], 10) || 0;
        if (horaEntera >= 14) {
          return false;
        }
      }

      return true;
    });

    candidatos.sort((a, b) => {
      const pa = a.porcentaje_disponibles ?? 0;
      const pb = b.porcentaje_disponibles ?? 0;
      if (pb !== pa) return pb - pa;
      const capA = a.capacidad_max_libre ?? 0;
      const capB = b.capacidad_max_libre ?? 0;
      if (capB !== capA) return capB - capA;
      if (a.dia_semana !== b.dia_semana) return a.dia_semana - b.dia_semana;
      return a.inicio_min - b.inicio_min;
    });

    const seleccionados = new Set();
    const recomendadosPorDia = new Map();

    for (const slot of candidatos) {
      if (seleccionados.size >= vecesPorSemana) break;

      const dia = slot.dia_semana;
      const yaEnDia = recomendadosPorDia.get(dia) || 0;
      if (yaEnDia >= 1) continue;

      seleccionados.add(`${slot.dia_semana}|${slot.hora_inicio}`);
      recomendadosPorDia.set(dia, yaEnDia + 1);
    }

    // Contar votos totales por slot (todos los estudiantes matriculados)
    const votosPorSlot = new Map();
    if (materia.votacion_id) {
      const { rows: votosCountRows } = await pool.query(
        `SELECT dia_semana, hora_inicio, COUNT(*) AS total_votos
         FROM auxiliar_votos
         WHERE votacion_id = $1
         GROUP BY dia_semana, hora_inicio`,
        [materia.votacion_id],
      );

      votosCountRows.forEach((row) => {
        const diaRow = parseInt(row.dia_semana, 10);
        const horaRowRaw = row.hora_inicio;
        const horaRowStr = typeof horaRowRaw === 'string'
          ? horaRowRaw.substring(0, 5)
          : horaRowRaw?.toString().substring(0, 5);
        if (!diaRow || !horaRowStr) return;
        const key = `${diaRow}|${horaRowStr}`;
        const total = typeof row.total_votos === 'number'
          ? row.total_votos
          : parseInt(row.total_votos, 10) || 0;
        votosPorSlot.set(key, total);
      });
    }

    const disponibilidad = slots.map((s) => {
      let estado = 'neutral';
      if (seleccionados.has(`${s.dia_semana}|${s.hora_inicio}`)) {
        estado = 'recomendada';
      } else if (!s.auxiliar_disponible || !s.hay_aulas_disponibles) {
        // No disponible si el auxiliar tiene clases en ese horario
        // o si no existe ninguna aula libre para el bloque
        estado = 'no_disponible';
      }

      const keySlot = `${s.dia_semana}|${s.hora_inicio}`;
      const votosSlot = votosPorSlot.has(keySlot) ? votosPorSlot.get(keySlot) : 0;

      return {
        dia_semana: s.dia_semana,
        hora_inicio: s.hora_inicio,
        hora_fin: s.hora_fin,
        aulas_disponibles: s.aulas_libres,
        aulas_con_capacidad_suficiente: s.aulas_adecuadas,
        hay_aulas_disponibles: s.hay_aulas_disponibles,
        hay_aula_capacidad_suficiente: s.hay_aula_capacidad_suficiente,
        auxiliar_disponible: s.auxiliar_disponible,
        total_estudiantes: s.total_estudiantes,
        estudiantes_disponibles: s.estudiantes_disponibles,
        porcentaje_disponibles: s.porcentaje_disponibles,
        votos_slot: votosSlot,
        aula_sugerida: s.aula_sugerida,
        estado,
      };
    });

    res.json({
      auxiliar_materia_id: materia.id,
      horas_por_clase: horasPorClase,
      veces_por_semana: vecesPorSemana,
      max_votos: vecesPorSemana,
      votos_usados: votosUsados,
      mis_votos: misVotos,
      puede_votar: esEstudianteMatriculado && !esAuxiliarDeLaMateria,
      es_auxiliar_de_la_materia: esAuxiliarDeLaMateria,
      materia_nombre: materia.materia_nombre,
      materia_sigla: materia.materia_sigla,
      grupo: materia.grupo,
      disponibilidad,
    });
  } catch (error) {
    console.error('Error en getDisponibilidadVotacion:', error);
    res.status(500).json({
      message: 'Error al obtener la disponibilidad para votación',
      error: error.message,
    });
  }
};

export const iniciarVotacion = async (req, res) => {
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
      `SELECT id
       FROM auxiliar_materias
       WHERE id = $1 AND auxiliar_id = $2`,
      [auxMateriaId, auxiliarId],
    );

    if (!matRows.length) {
      return res.status(404).json({ message: 'Materia de auxiliar no encontrada' });
    }

    const { rows } = await pool.query(
      `INSERT INTO auxiliar_votaciones (auxiliar_materia_id, activa, fecha_inicio, fecha_cierre)
       VALUES ($1, TRUE, CURRENT_TIMESTAMP, NULL)
       ON CONFLICT (auxiliar_materia_id)
       DO UPDATE SET activa = TRUE, fecha_inicio = CURRENT_TIMESTAMP, fecha_cierre = NULL
       RETURNING id, auxiliar_materia_id, activa, fecha_inicio, fecha_cierre`,
      [auxMateriaId],
    );

    try {
      const io = getIO();
      io.emit('votacion:actualizada', {
        auxiliar_materia_id: auxMateriaId,
        estado: 'activa',
        votacion: rows[0],
      });
    } catch (socketError) {
      console.error('Error emitiendo evento de votación (iniciar):', socketError.message);
    }

    res.json({
      message: 'Votación iniciada para esta auxiliatura',
      votacion: rows[0],
    });
  } catch (error) {
    console.error('Error en iniciarVotacion:', error);
    res.status(500).json({
      message: 'Error al iniciar la votación',
      error: error.message,
    });
  }
};

export const finalizarVotacion = async (req, res) => {
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
      `SELECT v.id
       FROM auxiliar_votaciones v
       INNER JOIN auxiliar_materias am ON v.auxiliar_materia_id = am.id
       WHERE am.id = $1 AND am.auxiliar_id = $2 AND v.activa = TRUE`,
      [auxMateriaId, auxiliarId],
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'No hay una votación activa para esta auxiliatura' });
    }

    const votacionId = rows[0].id;

    const { rows: updated } = await pool.query(
      `UPDATE auxiliar_votaciones
       SET activa = FALSE, fecha_cierre = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, auxiliar_materia_id, activa, fecha_inicio, fecha_cierre`,
      [votacionId],
    );

    try {
      const io = getIO();
      io.emit('votacion:actualizada', {
        auxiliar_materia_id: auxMateriaId,
        estado: 'finalizada',
        votacion: updated[0],
      });
    } catch (socketError) {
      console.error('Error emitiendo evento de votación (finalizar):', socketError.message);
    }

    res.json({
      message: 'Votación finalizada para esta auxiliatura',
      votacion: updated[0],
    });
  } catch (error) {
    console.error('Error en finalizarVotacion:', error);
    res.status(500).json({
      message: 'Error al finalizar la votación',
      error: error.message,
    });
  }
};

export const emitirVotoVotacion = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const usuarioId = req.user.userId ?? req.user.id ?? req.userId;
    const rolId = req.user.rol_id;
    const auxMateriaId = parseInt(req.params.auxMateriaId, 10);

    if (!auxMateriaId || Number.isNaN(auxMateriaId)) {
      return res.status(400).json({ message: 'Materia inválida' });
    }

    const { dia_semana, hora_inicio, hora_fin } = req.body || {};
    const dia = parseInt(dia_semana, 10);
    const horaInicio = hora_inicio;
    const horaFin = hora_fin;

    if (!dia || Number.isNaN(dia) || !horaInicio || !horaFin) {
      return res.status(400).json({ message: 'Parámetros de voto inválidos' });
    }

    const { rows: materiaRows } = await pool.query(
      `SELECT
        am.id,
        am.auxiliar_id,
        am.veces_por_semana,
        v.id AS votacion_id,
        v.activa AS votacion_activa
       FROM auxiliar_materias am
       LEFT JOIN auxiliar_votaciones v ON v.auxiliar_materia_id = am.id
       WHERE am.id = $1`,
      [auxMateriaId],
    );

    if (!materiaRows.length) {
      return res.status(404).json({ message: 'Materia de auxiliar no encontrada' });
    }

    const materia = materiaRows[0];

    if (!materia.votacion_id || !materia.votacion_activa) {
      return res.status(400).json({ message: 'No hay una votación activa para esta auxiliatura' });
    }

    const esAuxiliarDeLaMateria = materia.auxiliar_id === usuarioId;
    if (esAuxiliarDeLaMateria) {
      return res.status(403).json({ message: 'El auxiliar que dicta esta auxiliatura no puede emitir votos en ella' });
    }

    if (rolId !== 1 && rolId !== 2) {
      return res.status(403).json({ message: 'Solo los estudiantes o auxiliares matriculados pueden emitir votos' });
    }

    const { rows: inscRows } = await pool.query(
      `SELECT 1
       FROM auxiliar_matricula_estudiantes ame
       INNER JOIN auxiliar_matriculaciones mat ON ame.matriculacion_id = mat.id
       WHERE mat.auxiliar_materia_id = $1 AND ame.estudiante_id = $2`,
      [auxMateriaId, usuarioId],
    );

    if (!inscRows.length) {
      return res.status(403).json({ message: 'No estás inscrito en esta auxiliatura' });
    }

    const maxVotos = materia.veces_por_semana ? parseInt(materia.veces_por_semana, 10) || 1 : 1;

    const { rows: existentes } = await pool.query(
      `SELECT id, dia_semana, hora_inicio
       FROM auxiliar_votos
       WHERE votacion_id = $1 AND estudiante_id = $2
       ORDER BY dia_semana, hora_inicio`,
      [materia.votacion_id, usuarioId],
    );

    const usados = existentes.length;

    const yaEnSlot = existentes.find(
      (v) => v.dia_semana === dia && String(v.hora_inicio).substring(0, 5) === String(horaInicio).substring(0, 5),
    );

    if (yaEnSlot) {
      return res.status(400).json({ message: 'Ya emitiste un voto en este horario' });
    }

    if (usados >= maxVotos) {
      return res.status(400).json({ message: 'Ya utilizaste todos tus votos. Elimina uno antes de volver a votar.' });
    }

    const { rows: insertRows } = await pool.query(
      `INSERT INTO auxiliar_votos (votacion_id, estudiante_id, dia_semana, hora_inicio, hora_fin)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, dia_semana, hora_inicio, hora_fin`,
      [materia.votacion_id, usuarioId, dia, horaInicio, horaFin],
    );

    const votosUsados = usados + 1;

    res.status(201).json({
      message: 'Voto registrado correctamente',
      max_votos: maxVotos,
      votos_usados: votosUsados,
      voto: insertRows[0],
    });
  } catch (error) {
    console.error('Error en emitirVotoVotacion:', error);
    res.status(500).json({
      message: 'Error al registrar el voto',
      error: error.message,
    });
  }
};

export const eliminarVotoVotacion = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const usuarioId = req.user.userId ?? req.user.id ?? req.userId;
    const rolId = req.user.rol_id;
    const auxMateriaId = parseInt(req.params.auxMateriaId, 10);

    if (!auxMateriaId || Number.isNaN(auxMateriaId)) {
      return res.status(400).json({ message: 'Materia inválida' });
    }

    const { dia_semana, hora_inicio } = req.body || {};
    const dia = parseInt(dia_semana, 10);
    const horaInicio = hora_inicio;

    if (!dia || Number.isNaN(dia) || !horaInicio) {
      return res.status(400).json({ message: 'Parámetros de voto inválidos' });
    }

    const { rows: materiaRows } = await pool.query(
      `SELECT
        am.id,
        am.auxiliar_id,
        am.veces_por_semana,
        v.id AS votacion_id,
        v.activa AS votacion_activa
       FROM auxiliar_materias am
       LEFT JOIN auxiliar_votaciones v ON v.auxiliar_materia_id = am.id
       WHERE am.id = $1`,
      [auxMateriaId],
    );

    if (!materiaRows.length) {
      return res.status(404).json({ message: 'Materia de auxiliar no encontrada' });
    }

    const materia = materiaRows[0];

    if (!materia.votacion_id || !materia.votacion_activa) {
      return res.status(400).json({ message: 'La votación ya no está activa' });
    }

    const esAuxiliarDeLaMateria = materia.auxiliar_id === usuarioId;
    if (esAuxiliarDeLaMateria) {
      return res.status(403).json({ message: 'El auxiliar que dicta esta auxiliatura no puede eliminar votos porque no puede emitirlos' });
    }

    if (rolId !== 1 && rolId !== 2) {
      return res.status(403).json({ message: 'Solo los estudiantes o auxiliares matriculados pueden eliminar votos' });
    }

    const { rows: existentes } = await pool.query(
      `SELECT id, dia_semana, hora_inicio
       FROM auxiliar_votos
       WHERE votacion_id = $1 AND estudiante_id = $2
       ORDER BY dia_semana, hora_inicio`,
      [materia.votacion_id, usuarioId],
    );

    const usados = existentes.length;

    const voto = existentes.find(
      (v) => v.dia_semana === dia && String(v.hora_inicio).substring(0, 5) === String(horaInicio).substring(0, 5),
    );

    if (!voto) {
      return res.status(404).json({ message: 'No tenías un voto registrado en este horario' });
    }

    await pool.query('DELETE FROM auxiliar_votos WHERE id = $1', [voto.id]);

    const votosUsados = usados - 1;
    const maxVotos = materia.veces_por_semana ? parseInt(materia.veces_por_semana, 10) || 1 : 1;

    res.json({
      message: 'Voto eliminado correctamente',
      max_votos: maxVotos,
      votos_usados: votosUsados,
    });
  } catch (error) {
    console.error('Error en eliminarVotoVotacion:', error);
    res.status(500).json({
      message: 'Error al eliminar el voto',
      error: error.message,
    });
  }
};
