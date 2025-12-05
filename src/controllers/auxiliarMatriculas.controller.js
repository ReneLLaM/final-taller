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

async function getAuxiliarMateriaInfo(auxMateriaId) {
  const { rows } = await pool.query(
    `SELECT
        am.id,
        am.auxiliar_id,
        am.materia_global_id,
        am.grupo,
        am.veces_por_semana,
        am.horas_por_clase,
        mg.nombre AS materia_nombre,
        mg.sigla AS materia_sigla,
        mg.color AS materia_color
       FROM auxiliar_materias am
       INNER JOIN materias_globales mg ON am.materia_global_id = mg.id
       WHERE am.id = $1`,
    [auxMateriaId],
  );

  return rows[0] || null;
}

async function ensureAuxiliarMateriaLocalMateria(auxMateria) {
  const auxiliarId = auxMateria.auxiliar_id;
  const sigla = auxMateria.materia_sigla;
  const nombre = auxMateria.materia_nombre;
  const color = auxMateria.materia_color || '#2196F3';
  const grupo = auxMateria.grupo;

  const { rows: existentes } = await pool.query(
    `SELECT id, docente
       FROM materias
       WHERE usuario_id = $1 AND sigla = $2 AND grupo = $3
       LIMIT 1`,
    [auxiliarId, sigla, grupo],
  );

  if (existentes.length) {
    return existentes[0];
  }

  const { rows: usuarioRows } = await pool.query(
    'SELECT nombre_completo FROM usuarios WHERE id = $1',
    [auxiliarId],
  );

  const docente = usuarioRows[0]?.nombre_completo || 'Auxiliar';

  const { rows: insertRows } = await pool.query(
    `INSERT INTO materias (nombre, sigla, docente, grupo, color, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, docente`,
    [nombre, sigla, docente, grupo, color, auxiliarId],
  );

  return insertRows[0];
}

async function sugerirAulasParaGanadores(ganadores, totalEstudiantes) {
  const mapa = new Map();
  if (!ganadores || !ganadores.length) return mapa;

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

  ganadores.forEach((slot) => {
    const dia = parseInt(slot.dia_semana, 10) || 1;
    const inicioSlot = timeToMinutes(slot.hora_inicio);
    const finSlot = timeToMinutes(slot.hora_fin);

    let mejorAdecuada = null;
    let mejorLibreCualquiera = null;

    aulas.forEach((aula) => {
      const key = `${dia}|${aula.sigla}`;
      const ocupaciones = ocupacionPorDiaYAula.get(key) || [];
      const ocupada = ocupaciones.some((o) => rangesOverlap(inicioSlot, finSlot, o.inicio, o.fin));
      if (ocupada) return;

      const cap = aula.capacidad || 0;
      if (!mejorLibreCualquiera || cap > mejorLibreCualquiera.capacidad) {
        mejorLibreCualquiera = aula;
      }

      if (totalEstudiantes > 0 && cap >= totalEstudiantes) {
        if (!mejorAdecuada || cap < mejorAdecuada.capacidad) {
          mejorAdecuada = aula;
        }
      }
    });

    const seleccionada = mejorAdecuada || mejorLibreCualquiera || null;
    if (seleccionada) {
      const keySlot = `${dia}|${slot.hora_inicio}`;
      mapa.set(keySlot, seleccionada.sigla);
    }
  });

  return mapa;
}

async function crearClasesEInscripcionesDesdeVotacion(auxiliarId, auxMateriaId, votacionId) {
  const auxMat = await getAuxiliarMateriaInfo(auxMateriaId);
  if (!auxMat || auxMat.auxiliar_id !== auxiliarId) {
    return { ganadores: [], clases_tipo2_ids: [], clases_tipo3_ids: [] };
  }

  const vecesPorSemana = auxMat.veces_por_semana ? parseInt(auxMat.veces_por_semana, 10) || 1 : 1;

  const { rows: votosRows } = await pool.query(
    `SELECT dia_semana, hora_inicio, hora_fin, COUNT(*)::int AS total_votos
       FROM auxiliar_votos
       WHERE votacion_id = $1
       GROUP BY dia_semana, hora_inicio, hora_fin`,
    [votacionId],
  );

  if (!votosRows.length || vecesPorSemana <= 0) {
    return { ganadores: [], clases_tipo2_ids: [], clases_tipo3_ids: [] };
  }

  const slots = votosRows
    .map((row) => {
      const dia = parseInt(row.dia_semana, 10) || 1;
      const horaInicioRaw = row.hora_inicio;
      const horaFinRaw = row.hora_fin;
      const horaInicioStr = typeof horaInicioRaw === 'string'
        ? horaInicioRaw.substring(0, 5)
        : horaInicioRaw?.toString().substring(0, 5);
      const horaFinStr = typeof horaFinRaw === 'string'
        ? horaFinRaw.substring(0, 5)
        : horaFinRaw?.toString().substring(0, 5);
      const totalVotos = typeof row.total_votos === 'number'
        ? row.total_votos
        : parseInt(row.total_votos, 10) || 0;

      return {
        dia_semana: dia,
        hora_inicio: horaInicioStr,
        hora_fin: horaFinStr,
        total_votos: totalVotos,
      };
    })
    .filter((s) => s.hora_inicio && s.hora_fin && s.total_votos > 0);

  if (!slots.length) {
    return { ganadores: [], clases_tipo2_ids: [], clases_tipo3_ids: [] };
  }

  slots.sort((a, b) => {
    if (b.total_votos !== a.total_votos) return b.total_votos - a.total_votos;
    if (a.dia_semana !== b.dia_semana) return a.dia_semana - b.dia_semana;
    return String(a.hora_inicio).localeCompare(String(b.hora_inicio));
  });

  const ganadores = slots.slice(0, vecesPorSemana);

  const { rows: estRows } = await pool.query(
    `SELECT ame.estudiante_id
       FROM auxiliar_matricula_estudiantes ame
       INNER JOIN auxiliar_matriculaciones mat ON ame.matriculacion_id = mat.id
       WHERE mat.auxiliar_materia_id = $1`,
    [auxMateriaId],
  );

  const estudianteIds = estRows.map((r) => r.estudiante_id);
  const totalEstudiantes = estudianteIds.length;

  const aulasPorSlot = await sugerirAulasParaGanadores(ganadores, totalEstudiantes);

  const materiaLocal = await ensureAuxiliarMateriaLocalMateria(auxMat);
  const idMateria = materiaLocal.id;
  const docente = materiaLocal.docente;

  const archivoKey = 'AUX-VOTACIONES';
  const hojaKey = `AUX-${auxMateriaId}`;
  const materiaHorario = `${auxMat.materia_sigla || ''} ${auxMat.grupo || ''}`.trim() || auxMat.materia_nombre || null;
  const docenteHorario = docente || null;

  const clasesTipo2Ids = [];
  const clasesTipo3Ids = [];

  for (const slot of ganadores) {
    const keySlot = `${slot.dia_semana}|${slot.hora_inicio}`;
    const aulaAsignada = aulasPorSlot.get(keySlot) || 'SIN-AULA';

    const { rows: clasesExistentes } = await pool.query(
      `SELECT id, tipo_clase
         FROM clases
         WHERE id_materia = $1
           AND sigla = $2
           AND grupo = $3
           AND dia_semana = $4
           AND hora_inicio = $5
           AND hora_fin = $6
           AND tipo_clase IN (2, 3)`,
      [idMateria, auxMat.materia_sigla, auxMat.grupo, slot.dia_semana, slot.hora_inicio, slot.hora_fin],
    );

    let clase2Id = null;
    let clase3Id = null;

    clasesExistentes.forEach((c) => {
      if (c.tipo_clase === 2) clase2Id = c.id;
      if (c.tipo_clase === 3) clase3Id = c.id;
    });

    if (clase2Id) {
      await pool.query('UPDATE clases SET aula = $1 WHERE id = $2', [aulaAsignada, clase2Id]);
    } else {
      const { rows: insert2 } = await pool.query(
        `INSERT INTO clases (id_materia, sigla, docente, grupo, dia_semana, hora_inicio, hora_fin, tipo_clase, aula)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 2, $8)
           RETURNING id`,
        [idMateria, auxMat.materia_sigla, docente, auxMat.grupo, slot.dia_semana, slot.hora_inicio, slot.hora_fin, aulaAsignada],
      );
      clase2Id = insert2[0].id;
    }

    if (clase3Id) {
      await pool.query('UPDATE clases SET aula = $1 WHERE id = $2', [aulaAsignada, clase3Id]);
    } else {
      const { rows: insert3 } = await pool.query(
        `INSERT INTO clases (id_materia, sigla, docente, grupo, dia_semana, hora_inicio, hora_fin, tipo_clase, aula)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 3, $8)
           RETURNING id`,
        [idMateria, auxMat.materia_sigla, docente, auxMat.grupo, slot.dia_semana, slot.hora_inicio, slot.hora_fin, aulaAsignada],
      );
      clase3Id = insert3[0].id;
    }

    if (clase2Id) clasesTipo2Ids.push(clase2Id);
    if (clase3Id) clasesTipo3Ids.push(clase3Id);

    await pool.query(
      `INSERT INTO clases_horarios
        (archivo, hoja, fila, dia_semana, hora_inicio, hora_fin, aula, materia, docente)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        archivoKey,
        hojaKey,
        auxMateriaId,
        slot.dia_semana,
        slot.hora_inicio,
        slot.hora_fin,
        aulaAsignada,
        materiaHorario,
        docenteHorario,
      ],
    );
  }

  // Inscribir estudiantes en clases tipo 2
  for (const estudianteId of estudianteIds) {
    for (const claseId of clasesTipo2Ids) {
      // eslint-disable-next-line no-await-in-loop
      await pool.query(
        `INSERT INTO inscripciones (id_usuario, id_clase)
           VALUES ($1, $2)
           ON CONFLICT (id_usuario, id_clase) DO NOTHING`,
        [estudianteId, claseId],
      );
    }
  }

  // Inscribir auxiliar en clases tipo 3
  for (const claseId of clasesTipo3Ids) {
    // eslint-disable-next-line no-await-in-loop
    await pool.query(
      `INSERT INTO inscripciones (id_usuario, id_clase)
         VALUES ($1, $2)
         ON CONFLICT (id_usuario, id_clase) DO NOTHING`,
      [auxiliarId, claseId],
    );
  }

  return { ganadores, clases_tipo2_ids: clasesTipo2Ids, clases_tipo3_ids: clasesTipo3Ids };
}

async function limpiarInscripcionesTipo2DeAuxiliatura(auxiliarId, materiaSigla, grupo, estudianteId) {
  if (!auxiliarId || !materiaSigla || !grupo || !estudianteId) return;

  const { rows: clasesRows } = await pool.query(
    `SELECT c.id
       FROM clases c
       INNER JOIN materias m ON c.id_materia = m.id
       WHERE m.usuario_id = $1
         AND m.sigla = $2
         AND c.grupo = $3
         AND c.tipo_clase = 2`,
    [auxiliarId, materiaSigla, grupo],
  );

  if (!clasesRows.length) return;

  const claseIds = clasesRows.map((r) => r.id);

  await pool.query(
    `DELETE FROM inscripciones
       WHERE id_usuario = $1
         AND id_clase = ANY($2::int[])`,
    [estudianteId, claseIds],
  );
}

async function limpiarClasesEInscripcionesAuxiliatura(auxiliarId, auxMateriaId) {
  const auxMat = await getAuxiliarMateriaInfo(auxMateriaId);
  if (!auxMat || auxMat.auxiliar_id !== auxiliarId) {
    return;
  }

  const materiaLocal = await ensureAuxiliarMateriaLocalMateria(auxMat);

  const { rows: clasesRows } = await pool.query(
    `SELECT id
       FROM clases
       WHERE id_materia = $1
         AND sigla = $2
         AND grupo = $3
         AND tipo_clase IN (2, 3)`,
    [materiaLocal.id, auxMat.materia_sigla, auxMat.grupo],
  );

  if (!clasesRows.length) return;

  const claseIds = clasesRows.map((r) => r.id);

  await pool.query(
    `DELETE FROM inscripciones
       WHERE id_clase = ANY($1::int[])`,
    [claseIds],
  );

  await pool.query(
    `DELETE FROM clases
       WHERE id = ANY($1::int[])`,
    [claseIds],
  );
}

async function limpiarHorariosAuxiliaturaEnClasesHorarios(auxMateriaId) {
  if (!auxMateriaId) return;

  const hojaKey = `AUX-${auxMateriaId}`;

  await pool.query(
    `DELETE FROM clases_horarios
       WHERE archivo = $1
         AND hoja = $2`,
    ['AUX-VOTACIONES', hojaKey],
  );
}

async function inscribirEstudianteEnClasesTipo2DeAuxiliatura(auxiliarId, auxMateriaId, estudianteId) {
  if (!auxiliarId || !auxMateriaId || !estudianteId) return;

  const auxMat = await getAuxiliarMateriaInfo(auxMateriaId);
  if (!auxMat || auxMat.auxiliar_id !== auxiliarId) {
    return;
  }

  const materiaLocal = await ensureAuxiliarMateriaLocalMateria(auxMat);

  const { rows: clasesRows } = await pool.query(
    `SELECT id
       FROM clases
       WHERE id_materia = $1
         AND sigla = $2
         AND grupo = $3
         AND tipo_clase = 2`,
    [materiaLocal.id, auxMat.materia_sigla, auxMat.grupo],
  );

  if (!clasesRows.length) return;

  const claseIds = clasesRows.map((r) => r.id);

  for (const claseId of claseIds) {
    // eslint-disable-next-line no-await-in-loop
    await pool.query(
      `INSERT INTO inscripciones (id_usuario, id_clase)
         VALUES ($1, $2)
         ON CONFLICT (id_usuario, id_clase) DO NOTHING`,
      [estudianteId, claseId],
    );
  }
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

export const actualizarAulaVotacion = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const auxiliarId = req.user.userId ?? req.user.id ?? req.userId;
    const auxMateriaId = parseInt(req.params.auxMateriaId, 10);

    if (!auxMateriaId || Number.isNaN(auxMateriaId)) {
      return res.status(400).json({ message: 'Materia inválida' });
    }

    const { dia_semana, hora_inicio, hora_fin, aula } = req.body || {};
    const dia = parseInt(dia_semana, 10);
    const horaInicio = hora_inicio ? String(hora_inicio).substring(0, 5) : '';
    const horaFin = hora_fin ? String(hora_fin).substring(0, 5) : '';
    const aulaTrim = aula ? String(aula).trim() : '';

    if (!dia || Number.isNaN(dia) || !horaInicio || !horaFin || !aulaTrim) {
      return res.status(400).json({ message: 'Parámetros inválidos para actualizar aula' });
    }

    const auxMatInfo = await getAuxiliarMateriaInfo(auxMateriaId);
    if (!auxMatInfo) {
      return res.status(404).json({ message: 'Auxiliatura no encontrada' });
    }

    if (auxMatInfo.auxiliar_id !== auxiliarId) {
      return res.status(403).json({ message: 'No estás autorizado para administrar esta auxiliatura' });
    }

    const materiaLocal = await ensureAuxiliarMateriaLocalMateria(auxMatInfo);

    const { rows: updated } = await pool.query(
      `UPDATE clases
         SET aula = $1
       WHERE id_materia = $2
         AND sigla = $3
         AND grupo = $4
         AND dia_semana = $5
         AND hora_inicio = $6
         AND hora_fin = $7
         AND tipo_clase IN (2, 3)
       RETURNING id, tipo_clase, aula`,
      [aulaTrim, materiaLocal.id, auxMatInfo.materia_sigla, auxMatInfo.grupo, dia, horaInicio, horaFin],
    );

    if (!updated.length) {
      return res.status(404).json({
        message: 'No se encontraron clases de auxiliatura (tipo 2 o 3) para este horario. Asegúrate de haber finalizado la votación.',
      });
    }

    res.json({
      message: 'Aula actualizada para este horario de auxiliatura',
      clases: updated,
    });
  } catch (error) {
    console.error('Error en actualizarAulaVotacion:', error);
    res.status(500).json({
      message: 'Error al actualizar aula de la auxiliatura',
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

    try {
      const io = getIO();
      io.emit('matriculacion:actualizada', {
        auxiliar_materia_id: auxMateriaId,
        accion: 'cerrada',
      });
    } catch (socketError) {
      console.error('Error emitiendo evento de matriculación (cerrar):', socketError.message);
    }
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

    try {
      await limpiarInscripcionesTipo2DeAuxiliatura(row.auxiliar_id, row.sigla, row.grupo, usuarioId);
    } catch (cleanupError) {
      console.error('Error al limpiar inscripciones tipo 2 al desinscribirse:', cleanupError);
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

    try {
      const io = getIO();
      io.emit('matriculacion:actualizada', {
        auxiliar_materia_id: row.auxiliar_materia_id,
        accion: 'desinscripcion',
        estudiante_id: usuarioId,
      });
    } catch (socketError) {
      console.error('Error emitiendo evento de matriculación (desinscribirse):', socketError.message);
    }
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

    try {
      const io = getIO();
      io.emit('matriculacion:actualizada', {
        auxiliar_materia_id: auxMateriaId,
        accion: 'generado',
      });
    } catch (socketError) {
      console.error('Error emitiendo evento de matriculación (generar):', socketError.message);
    }
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

    try {
      const { rows: votRows } = await pool.query(
        `SELECT id, activa, fecha_cierre
           FROM auxiliar_votaciones
           WHERE auxiliar_materia_id = $1`,
        [row.auxiliar_materia_id],
      );

      if (votRows.length && votRows[0].id && votRows[0].activa === false && votRows[0].fecha_cierre) {
        await inscribirEstudianteEnClasesTipo2DeAuxiliatura(row.auxiliar_id, row.auxiliar_materia_id, usuarioId);
      }
    } catch (postInsError) {
      console.error('Error al inscribir estudiante en clases tipo 2 después de matricularse:', postInsError);
    }

    try {
      const io = getIO();
      io.emit('matriculacion:actualizada', {
        auxiliar_materia_id: row.auxiliar_materia_id,
        accion: 'inscripcion',
        estudiante_id: usuarioId,
      });
    } catch (socketError) {
      console.error('Error emitiendo evento de matriculación (inscribirse):', socketError.message);
    }
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
      `SELECT mat.id, am.auxiliar_id, mg.sigla, am.grupo
       FROM auxiliar_matriculaciones mat
       INNER JOIN auxiliar_materias am ON mat.auxiliar_materia_id = am.id
       INNER JOIN materias_globales mg ON am.materia_global_id = mg.id
       WHERE am.id = $1 AND am.auxiliar_id = $2`,
      [auxMateriaId, auxiliarId],
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Materia de auxiliar no encontrada o sin código activo' });
    }

    const row = rows[0];
    const matriculacionId = row.id;

    const { rows: deleted } = await pool.query(
      `DELETE FROM auxiliar_matricula_estudiantes
       WHERE matriculacion_id = $1 AND estudiante_id = $2
       RETURNING id`,
      [matriculacionId, estudianteId],
    );

    if (!deleted.length) {
      return res.status(404).json({ message: 'El estudiante no estaba inscrito en esta auxiliatura' });
    }

    try {
      await limpiarInscripcionesTipo2DeAuxiliatura(row.auxiliar_id, row.sigla, row.grupo, estudianteId);
    } catch (cleanupError) {
      console.error('Error al limpiar inscripciones tipo 2 al eliminar inscrito:', cleanupError);
    }

    res.json({ message: 'Estudiante eliminado de la lista de inscritos' });

    try {
      const io = getIO();
      io.emit('matriculacion:actualizada', {
        auxiliar_materia_id: auxMateriaId,
        accion: 'eliminado_por_auxiliar',
        estudiante_id: estudianteId,
      });
    } catch (socketError) {
      console.error('Error emitiendo evento de matriculación (eliminar inscrito):', socketError.message);
    }
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

    if (!materia.votacion_id) {
      return res.status(400).json({ message: 'No hay una votación configurada para esta auxiliatura' });
    }

    const votacionActiva = materia.votacion_activa === true;

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
    if (materia.votacion_id && votacionActiva) {
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
        const aulasDetalleSlot = [];

        aulas.forEach((aula) => {
          const key = `${dia}|${aula.sigla}`;
          const ocupaciones = ocupacionPorDiaYAula.get(key) || [];
          const ocupada = ocupaciones.some((o) => rangesOverlap(inicioSlot, finSlot, o.inicio, o.fin));
          const cap = aula.capacidad || 0;
          const capacidadSuficiente = totalEstudiantes > 0 && cap >= totalEstudiantes;
          const disponible = !ocupada;

          aulasDetalleSlot.push({
            sigla: aula.sigla,
            capacidad: cap,
            disponible,
            capacidad_suficiente: capacidadSuficiente,
          });

          if (disponible) {
            aulasLibres += 1;
            capacidadMaxLibre = Math.max(capacidadMaxLibre, cap);
            if (capacidadSuficiente) {
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
          aulas_detalle: aulasDetalleSlot,
        });
      });
    }

    // Si ya existen clases de auxiliatura creadas (tipo 2 o 3) para esta materia,
    // usar su aula como aula_sugerida para reflejar el aula realmente asignada.
    try {
      const auxMatInfo = await getAuxiliarMateriaInfo(auxMateriaId);
      if (auxMatInfo) {
        const materiaLocal = await ensureAuxiliarMateriaLocalMateria(auxMatInfo);
        const { rows: clasesAuxMatRows } = await pool.query(
          `SELECT dia_semana, hora_inicio, hora_fin, aula
           FROM clases
           WHERE id_materia = $1
             AND sigla = $2
             AND grupo = $3
             AND tipo_clase IN (2, 3)`,
          [materiaLocal.id, auxMatInfo.materia_sigla, auxMatInfo.grupo],
        );

        const aulasAsignadas = new Map();
        clasesAuxMatRows.forEach((row) => {
          const diaRow = parseInt(row.dia_semana, 10);
          const horaRaw = row.hora_inicio;
          const horaStr = typeof horaRaw === 'string'
            ? horaRaw.substring(0, 5)
            : horaRaw?.toString().substring(0, 5);
          if (!diaRow || !horaStr) return;
          const key = `${diaRow}|${horaStr}`;
          aulasAsignadas.set(key, row.aula);
        });

        if (aulasAsignadas.size > 0) {
          slots.forEach((s) => {
            const key = `${s.dia_semana}|${s.hora_inicio}`;
            if (aulasAsignadas.has(key)) {
              s.aula_sugerida = aulasAsignadas.get(key);
            }
          });
        }
      }
    } catch (aulaError) {
      console.error('Error al obtener aulas de clases de auxiliatura:', aulaError);
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
        aulas_detalle: s.aulas_detalle,
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
      puede_votar: esEstudianteMatriculado && !esAuxiliarDeLaMateria && votacionActiva,
      es_auxiliar_de_la_materia: esAuxiliarDeLaMateria,
      votacion_activa: votacionActiva,
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

    try {
      await limpiarClasesEInscripcionesAuxiliatura(auxiliarId, auxMateriaId);
    } catch (cleanupError) {
      console.error('Error al limpiar clases e inscripciones de auxiliatura al iniciar votación:', cleanupError);
    }

    try {
      await limpiarHorariosAuxiliaturaEnClasesHorarios(auxMateriaId);
    } catch (cleanupError2) {
      console.error('Error al limpiar horarios de clases_horarios al iniciar votación:', cleanupError2);
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

    let resumenClases = null;
    try {
      resumenClases = await crearClasesEInscripcionesDesdeVotacion(auxiliarId, auxMateriaId, votacionId);
    } catch (errGen) {
      console.error('Error al generar clases de auxiliatura desde votación:', errGen);
    }

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
      resumen_clases: resumenClases,
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

    try {
      const io = getIO();
      io.emit('votacion:disponibilidad-actualizada', {
        auxiliar_materia_id: auxMateriaId,
      });
    } catch (socketError) {
      console.error('Error emitiendo evento de votación (emitir voto):', socketError.message);
    }
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

    try {
      const io = getIO();
      io.emit('votacion:disponibilidad-actualizada', {
        auxiliar_materia_id: auxMateriaId,
      });
    } catch (socketError) {
      console.error('Error emitiendo evento de votación (eliminar voto):', socketError.message);
    }
  } catch (error) {
    console.error('Error en eliminarVotoVotacion:', error);
    res.status(500).json({
      message: 'Error al eliminar el voto',
      error: error.message,
    });
  }
};
