import { pool } from "../db.js";
import bcrypt from "bcrypt";

export const getAllUsers = async (req, res) => {
    try {
    const { rows } = await pool.query("SELECT * FROM usuarios");
    res.json(rows);
    } catch (error) {
        console.error('Error en getAllUsers:', error);
        res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
    }
};

export const getUserById = async (req, res) => {
    try {
    const { id } = req.params;
    const { rows } = await pool.query("SELECT * FROM usuarios WHERE id = $1", [id]);

    if (rows.length === 0) {
        return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(rows[0]);
    } catch (error) {
        console.error('Error en getUserById:', error);
        res.status(500).json({ message: 'Error al obtener usuario', error: error.message });
    }
};

export const createUser = async (req, res) => {
    try {
    const data = req.body;

    // Resolver carrera contra tabla carreras (opcional)
    let carreraLimpia = data.carrera ? data.carrera.trim() : null;
    let carreraId = null;

    if (carreraLimpia) {
        try {
            const { rows: carreraRows } = await pool.query(
                'SELECT id, nombre FROM carreras WHERE LOWER(nombre) = LOWER($1)',
                [carreraLimpia]
            );
            if (carreraRows.length > 0) {
                carreraId = carreraRows[0].id;
                carreraLimpia = carreraRows[0].nombre; // usar nombre oficial
            }
        } catch (e) {
            console.warn('No se pudo resolver carrera en createUser:', e.message);
        }
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.contrasenia, saltRounds);
    const { rows } = await pool.query(
        "INSERT INTO usuarios (nombre_completo, carrera, carrera_id, cu, correo, contrasenia, rol_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *", 
        [data.nombre_completo, carreraLimpia, carreraId, data.cu, data.correo, hashedPassword, data.rol_id]
    );
    res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error en createUser:', error);
        res.status(500).json({ message: 'Error al crear usuario', error: error.message });
    }
};

export const updateUser = async (req, res) => {
    try {
    const { id } = req.params;
    const data = req.body;
    // Resolver carrera contra tabla carreras (opcional)
    let carreraLimpia = data.carrera ? data.carrera.trim() : null;
    let carreraId = null;

    if (carreraLimpia) {
        try {
            const { rows: carreraRows } = await pool.query(
                'SELECT id, nombre FROM carreras WHERE LOWER(nombre) = LOWER($1)',
                [carreraLimpia]
            );
            if (carreraRows.length > 0) {
                carreraId = carreraRows[0].id;
                carreraLimpia = carreraRows[0].nombre;
            }
        } catch (e) {
            console.warn('No se pudo resolver carrera en updateUser:', e.message);
        }
    }

    // Si no se envía contrasenia (o viene vacía), no se actualiza ese campo
    const shouldUpdatePassword = typeof data.contrasenia === 'string' && data.contrasenia.trim() !== '';

    const query = shouldUpdatePassword
        ? "UPDATE usuarios SET nombre_completo = $1, carrera = $2, carrera_id = $3, cu = $4, correo = $5, contrasenia = $6, rol_id = $7 WHERE id = $8 RETURNING *"
        : "UPDATE usuarios SET nombre_completo = $1, carrera = $2, carrera_id = $3, cu = $4, correo = $5, rol_id = $6 WHERE id = $7 RETURNING *";

    let params;
    if (shouldUpdatePassword) {
        const hashedPassword = await bcrypt.hash(data.contrasenia, 10);
        params = [data.nombre_completo, carreraLimpia, carreraId, data.cu, data.correo, hashedPassword, data.rol_id, id];
    } else {
        params = [data.nombre_completo, carreraLimpia, carreraId, data.cu, data.correo, data.rol_id, id];
    }

    const { rows } = await pool.query(query, params);
    
    if (rows.length === 0) {
        return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(rows[0]);
    } catch (error) {
        console.error('Error en updateUser:', error);
        res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
    const { id } = req.params;
    const { rowCount } = await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
    
    if (rowCount === 0) {
        return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.sendStatus(204);
    } catch (error) {
        console.error('Error en deleteUser:', error);
        res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
    }
};
