import multer from 'multer';
import { pool } from '../db.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB por archivo JSON
  },
});

export const uploadHorariosMiddleware = upload.array('files', 20);

function normalizarTexto(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).trim().toLowerCase();
}

function mapearDiaSemanaDesdeNombre(nombreDia) {
  const txt = normalizarTexto(nombreDia);
  if (!txt) return null;
  if (txt.startsWith('lun')) return 1;
  if (txt.startsWith('mar')) return 2;
  if (txt.startsWith('mi')) return 3; // miércoles
  if (txt.startsWith('jue')) return 4;
  if (txt.startsWith('vie')) return 5;
  if (txt.startsWith('sab') || txt.startsWith('sáb')) return 6;
  return null;
}

function dividirHora(horaRango) {
  if (!horaRango) return { hora_inicio: null, hora_fin: null };
  const partes = String(horaRango).split('-');
  if (partes.length !== 2) return { hora_inicio: null, hora_fin: null };
  const normalizar = (h) => {
    const m = String(h).match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const hh = String(parseInt(m[1], 10)).padStart(2, '0');
    const mm = m[2];
    return `${hh}:${mm}`;
  };
  return {
    hora_inicio: normalizar(partes[0]),
    hora_fin: normalizar(partes[1]),
  };
}

export const uploadHorarios = async (req, res) => {
  try {
    const files = req.files || [];

    if (!files.length) {
      return res.status(400).json({ message: 'No se enviaron archivos de horario (.json)' });
    }

    const client = await pool.connect();
    let totalRegistros = 0;
    let totalArchivos = 0;

    try {
      await client.query('BEGIN');

      // Limpiar tabla antes de insertar nuevos horarios
      await client.query('DELETE FROM clases_horarios');

      for (const file of files) {
        totalArchivos += 1;

        let contenido;
        try {
          const texto = file.buffer.toString('utf8');
          contenido = JSON.parse(texto);
        } catch (e) {
          console.error(`Archivo JSON inválido: ${file.originalname}`, e.message);
          continue;
        }

        const registros = Array.isArray(contenido) ? contenido : [];

        for (let i = 0; i < registros.length; i++) {
          const r = registros[i] || {};

          const semestre = r.semestre || null;
          const grupo = r.grupo || null;
          const diaNombre = r.dia || r.dia_semana || null;
          const dia_semana = mapearDiaSemanaDesdeNombre(diaNombre);
          const { hora_inicio, hora_fin } = dividirHora(r.hora || r.rango_hora || '');

          if (!dia_semana || !hora_inicio || !hora_fin) {
            continue;
          }

          const materiaBase = r.materia || r.materiaCod || '';
          const grupoMateria = r.grupo_materia || r.grupoMateria || '';
          const materia = `${materiaBase} ${grupoMateria}`.trim() || null;
          const docente = r.docente ? String(r.docente).trim() : null;
          const aula = r.aula ? String(r.aula).trim() : null;

          await client.query(
            `INSERT INTO clases_horarios
              (archivo, hoja, fila, dia_semana, hora_inicio, hora_fin, aula, materia, docente)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              file.originalname,
              `${semestre || ''} ${grupo || ''}`.trim() || null,
              i + 1,
              dia_semana,
              hora_inicio,
              hora_fin,
              aula,
              materia,
              docente,
            ],
          );

          totalRegistros += 1;
        }
      }

      await client.query('COMMIT');

      return res.json({
        message: 'Horarios JSON cargados correctamente',
        archivos: totalArchivos,
        registros: totalRegistros,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error al importar horarios desde JSON:', err);
      return res.status(500).json({
        message: 'Error al importar horarios desde JSON',
        error: err.message,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error general en uploadHorarios (JSON):', error);
    return res.status(500).json({
      message: 'Error interno al procesar los horarios JSON',
      error: error.message,
    });
  }
};

// Obtener aulas distintas para un día específico desde clases_horarios
export const getAulasPorDia = async (req, res) => {
  try {
    const diaParam = req.query.dia ?? req.params.dia;
    const dia = parseInt(diaParam, 10);

    if (!dia || Number.isNaN(dia) || dia < 1 || dia > 6) {
      return res.status(400).json({ message: 'Parámetro dia inválido. Debe estar entre 1 y 6.' });
    }

    const { rows } = await pool.query(
      `SELECT DISTINCT aula
       FROM clases_horarios
       WHERE dia_semana = $1
         AND aula IS NOT NULL
         AND TRIM(aula) <> ''
       ORDER BY aula`,
      [dia],
    );

    return res.json(rows);
  } catch (error) {
    console.error('Error en getAulasPorDia:', error);
    return res.status(500).json({ message: 'Error al obtener aulas por día', error: error.message });
  }
};
