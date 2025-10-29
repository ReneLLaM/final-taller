import { pool } from "../db.js";

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
        const { rows } = await pool.query(
            "INSERT INTO usuarios (nombre_completo, carrera, cu, correo, contrasenia, rol_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *", 
            [data.nombre_completo, data.carrera, data.cu, data.correo, data.contrasenia, data.rol_id]
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
        const { rows } = await pool.query(
            "UPDATE usuarios SET nombre_completo = $1, carrera = $2, cu = $3, correo = $4, contrasenia = $5, rol_id = $6 WHERE id = $7 RETURNING *",
            [data.nombre_completo, data.carrera, data.cu, data.correo, data.contrasenia, data.rol_id, id]
        );
        
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
