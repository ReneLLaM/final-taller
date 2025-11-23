import { pool } from '../db.js';

// Devuelve métricas agregadas para el dashboard del administrador
export const getAdminDashboardStats = async (req, res) => {
  try {
    const [
      { rows: usuariosRows },
      { rows: estudiantesRows },
      { rows: auxiliaresRows },
      { rows: adminsRows },
      { rows: aulasRows },
      { rows: carrerasRows },
      { rows: materiasGlobalesRows },
      { rows: horariosRows },
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) AS count FROM usuarios'),
      pool.query('SELECT COUNT(*) AS count FROM usuarios WHERE rol_id = 1'),
      pool.query('SELECT COUNT(*) AS count FROM usuarios WHERE rol_id = 2'),
      pool.query('SELECT COUNT(*) AS count FROM usuarios WHERE rol_id = 3'),
      pool.query('SELECT COUNT(*) AS count FROM aulas'),
      pool.query('SELECT COUNT(*) AS count FROM carreras'),
      pool.query('SELECT COUNT(*) AS count FROM materias_globales'),
      pool.query('SELECT COUNT(*) AS count FROM clases_horarios'),
    ]);

    const toNumber = (row) => {
      const raw = row && (row.count ?? row.total);
      const n = parseInt(raw, 10);
      return Number.isNaN(n) ? 0 : n;
    };

    const totalUsuarios = toNumber(usuariosRows[0] || {});
    const totalEstudiantes = toNumber(estudiantesRows[0] || {});
    const totalAuxiliares = toNumber(auxiliaresRows[0] || {});
    const totalAdmins = toNumber(adminsRows[0] || {});

    res.json({
      usuarios: {
        total: totalUsuarios,
        estudiantes: totalEstudiantes,
        auxiliares: totalAuxiliares,
        administradores: totalAdmins,
      },
      aulas: toNumber(aulasRows[0] || {}),
      carreras: toNumber(carrerasRows[0] || {}),
      materias_globales: toNumber(materiasGlobalesRows[0] || {}),
      horarios_importados: toNumber(horariosRows[0] || {}),
    });
  } catch (error) {
    console.error('Error en getAdminDashboardStats:', error);
    res.status(500).json({
      message: 'Error al obtener estadísticas del dashboard de administrador',
      error: error.message,
    });
  }
};
