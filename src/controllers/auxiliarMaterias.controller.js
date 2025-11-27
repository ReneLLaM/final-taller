import { pool } from '../db.js';

// Obtener materias asignadas a un auxiliar (admin)
export const getAuxiliarMaterias = async (req, res) => {
    try {
        const { auxiliarId } = req.params;

        const { rows } = await pool.query(`
            SELECT
                am.id,
                am.auxiliar_id,
                u.nombre_completo AS auxiliar_nombre,
                am.materia_global_id,
                mg.nombre AS materia_nombre,
                mg.sigla,
                mg.color,
                am.grupo,
                am.veces_por_semana,
                am.horas_por_clase
            FROM auxiliar_materias am
            INNER JOIN usuarios u ON am.auxiliar_id = u.id
            INNER JOIN materias_globales mg ON am.materia_global_id = mg.id
            WHERE am.auxiliar_id = $1
            ORDER BY mg.nombre, am.grupo
        `, [auxiliarId]);

        res.json(rows);
    } catch (error) {
        console.error('Error en getAuxiliarMaterias:', error);
        res.status(500).json({ message: 'Error al obtener materias del auxiliar', error: error.message });
    }
};

// Obtener materias asignadas para el auxiliar autenticado (rol auxiliar)
export const getMisAuxiliarMaterias = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        // Solo auxiliares (rol_id = 2)
        if (req.user.rol_id !== 2) {
            return res.status(403).json({ message: 'No autorizado' });
        }

        const auxiliarId = req.user.userId ?? req.user.id ?? req.userId;

        // 1) Intentar obtener desde auxiliar_materias (asignaciones explícitas)
        const { rows } = await pool.query(`
            SELECT
                am.id,
                am.auxiliar_id,
                am.materia_global_id,
                mg.nombre AS materia_nombre,
                mg.sigla,
                mg.color,
                am.grupo,
                am.veces_por_semana,
                am.horas_por_clase
            FROM auxiliar_materias am
            INNER JOIN materias_globales mg ON am.materia_global_id = mg.id
            WHERE am.auxiliar_id = $1
            ORDER BY mg.nombre, am.grupo
        `, [auxiliarId]);

        if (rows.length > 0) {
            return res.json(rows);
        }

        // 2) Si no hay asignaciones en auxiliar_materias, derivar desde las clases tipo 3
        //    (auxiliaturas que el auxiliar dicta) usando las inscripciones y el horario.
        const { rows: fromClases } = await pool.query(`
            SELECT
                ROW_NUMBER() OVER () AS id,
                $1 AS auxiliar_id,
                mg.id AS materia_global_id,
                mg.nombre AS materia_nombre,
                mg.sigla,
                mg.color,
                c.grupo,
                COUNT(*) AS veces_por_semana,
                AVG(EXTRACT(EPOCH FROM (c.hora_fin - c.hora_inicio)) / 3600.0) AS horas_por_clase
            FROM clases c
            INNER JOIN inscripciones i ON c.id = i.id_clase
            INNER JOIN materias m ON c.id_materia = m.id
            INNER JOIN materias_globales mg ON mg.sigla = m.sigla
            WHERE i.id_usuario = $1
              AND c.tipo_clase = 3
            GROUP BY mg.id, mg.nombre, mg.sigla, mg.color, c.grupo
            ORDER BY mg.nombre, c.grupo
        `, [auxiliarId]);

        return res.json(fromClases);
    } catch (error) {
        console.error('Error en getMisAuxiliarMaterias:', error);
        res.status(500).json({ message: 'Error al obtener tus materias asignadas', error: error.message });
    }
};

// Crear una nueva asignación materia-global -> auxiliar
export const createAuxiliarMateria = async (req, res) => {
    try {
        const { auxiliarId } = req.params;
        const { materia_global_id, grupo, veces_por_semana, horas_por_clase } = req.body;

        if (!materia_global_id || !grupo) {
            return res.status(400).json({ message: 'Materia y grupo son obligatorios' });
        }

        const vps = Number(veces_por_semana) || 2;
        const hpc = Number(horas_por_clase) || 2;

        if (vps <= 0 || hpc <= 0) {
            return res.status(400).json({ message: 'Las veces por semana y horas por clase deben ser mayores a 0' });
        }

        // Verificar que el usuario exista y sea auxiliar
        const { rows: userRows } = await pool.query(
            'SELECT id, rol_id FROM usuarios WHERE id = $1',
            [auxiliarId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ message: 'Auxiliar no encontrado' });
        }
        if (userRows[0].rol_id !== 2) {
            return res.status(400).json({ message: 'El usuario seleccionado no es un auxiliar' });
        }

        // Verificar que la materia global exista
        const { rows: matRows } = await pool.query(
            'SELECT id FROM materias_globales WHERE id = $1',
            [materia_global_id]
        );
        if (matRows.length === 0) {
            return res.status(404).json({ message: 'Materia global no encontrada' });
        }

        const { rows } = await pool.query(`
            INSERT INTO auxiliar_materias
                (auxiliar_id, materia_global_id, grupo, veces_por_semana, horas_por_clase)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, auxiliar_id, materia_global_id, grupo, veces_por_semana, horas_por_clase
        `, [auxiliarId, materia_global_id, grupo.trim(), vps, hpc]);

        res.status(201).json({
            message: 'Materia asignada al auxiliar correctamente',
            asignacion: rows[0]
        });
    } catch (error) {
        console.error('Error en createAuxiliarMateria:', error);
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Esta materia ya está asignada a este auxiliar con el mismo grupo' });
        }
        res.status(500).json({ message: 'Error al asignar materia al auxiliar', error: error.message });
    }
};

// Actualizar una asignación existente
export const updateAuxiliarMateria = async (req, res) => {
    try {
        const { auxiliarId, id } = req.params;
        const { grupo, veces_por_semana, horas_por_clase } = req.body;

        const vps = Number(veces_por_semana) || 2;
        const hpc = Number(horas_por_clase) || 2;

        if (vps <= 0 || hpc <= 0) {
            return res.status(400).json({ message: 'Las veces por semana y horas por clase deben ser mayores a 0' });
        }

        const { rows } = await pool.query(`
            UPDATE auxiliar_materias
            SET
                grupo = COALESCE($1, grupo),
                veces_por_semana = $2,
                horas_por_clase = $3
            WHERE id = $4 AND auxiliar_id = $5
            RETURNING id, auxiliar_id, materia_global_id, grupo, veces_por_semana, horas_por_clase
        `, [grupo ? grupo.trim() : null, vps, hpc, id, auxiliarId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Asignación no encontrada para este auxiliar' });
        }

        res.json({
            message: 'Asignación actualizada correctamente',
            asignacion: rows[0]
        });
    } catch (error) {
        console.error('Error en updateAuxiliarMateria:', error);
        res.status(500).json({ message: 'Error al actualizar asignación', error: error.message });
    }
};

// Eliminar una asignación
export const deleteAuxiliarMateria = async (req, res) => {
    try {
        const { auxiliarId, id } = req.params;

        const { rows } = await pool.query(`
            SELECT am.id, am.auxiliar_id, mg.sigla, am.grupo
            FROM auxiliar_materias am
            INNER JOIN materias_globales mg ON am.materia_global_id = mg.id
            WHERE am.id = $1 AND am.auxiliar_id = $2
        `, [id, auxiliarId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Asignación no encontrada para este auxiliar' });
        }

        const row = rows[0];

        // Eliminar inscripciones del auxiliar a clases tipo 3 de esta auxiliatura
        try {
            const { rows: materiasRows } = await pool.query(
                'SELECT id FROM materias WHERE usuario_id = $1 AND sigla = $2 AND grupo = $3 LIMIT 1',
                [row.auxiliar_id, row.sigla, row.grupo]
            );

            if (materiasRows.length > 0) {
                const materiaId = materiasRows[0].id;

                const { rows: clasesRows } = await pool.query(
                    'SELECT id FROM clases WHERE id_materia = $1 AND tipo_clase = 3',
                    [materiaId]
                );

                if (clasesRows.length > 0) {
                    const claseIds = clasesRows.map(c => c.id);
                    await pool.query(
                        'DELETE FROM inscripciones WHERE id_usuario = $1 AND id_clase = ANY($2::int[])',
                        [row.auxiliar_id, claseIds]
                    );
                }
            }
        } catch (cleanupError) {
            console.error('Error al limpiar inscripciones de clases tipo 3 al eliminar auxiliar_materia:', cleanupError);
        }

        await pool.query(
            'DELETE FROM auxiliar_materias WHERE id = $1 AND auxiliar_id = $2',
            [id, auxiliarId]
        );

        res.json({ message: 'Asignación eliminada correctamente' });
    } catch (error) {
        console.error('Error en deleteAuxiliarMateria:', error);
        res.status(500).json({ message: 'Error al eliminar asignación', error: error.message });
    }
};
