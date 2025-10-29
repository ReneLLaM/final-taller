import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { JWT_SECRET } from '../config.js';

// Registrar usuario
export const register = async (req, res) => {
    try {
        const { nombre_completo, carrera, cu, correo, contrasenia } = req.body;

        // Validar campos requeridos (carrera y cu son opcionales)
        if (!nombre_completo || !correo || !contrasenia) {
            return res.status(400).json({ 
                message: 'Nombre completo, correo y contraseña son requeridos' 
            });
        }

        // Verificar si el correo ya existe
        const { rows: existingUser } = await pool.query(
            'SELECT * FROM usuarios WHERE correo = $1',
            [correo]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ 
                message: 'El correo ya está registrado' 
            });
        }

        // Verificar si el CU ya existe (solo si se proporcionó)
        if (cu) {
            const { rows: existingCu } = await pool.query(
                'SELECT * FROM usuarios WHERE cu = $1',
                [cu]
            );

            if (existingCu.length > 0) {
                return res.status(400).json({ 
                    message: 'El CU ya está registrado' 
                });
            }
        }

        // Obtener el ID del rol "estudiante" (rol_id = 1)
        const { rows: rolRows } = await pool.query(
            'SELECT id FROM roles WHERE nombre = $1',
            ['estudiante']
        );

        if (rolRows.length === 0) {
            return res.status(500).json({ 
                message: 'Rol estudiante no encontrado' 
            });
        }

        const rol_id = rolRows[0].id;

        // Hash de la contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(contrasenia, saltRounds);

        // Insertar usuario
        const { rows } = await pool.query(
            'INSERT INTO usuarios (nombre_completo, carrera, cu, correo, contrasenia, rol_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nombre_completo, carrera, cu, correo, rol_id',
            [nombre_completo, carrera, cu, correo, hashedPassword, rol_id]
        );

        // Generar token JWT
        const token = jwt.sign(
            { 
                userId: rows[0].id, 
                correo: rows[0].correo,
                rol_id: rows[0].rol_id 
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Enviar token como cookie httpOnly
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 // 1 hora
        });

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            user: {
                id: rows[0].id,
                nombre_completo: rows[0].nombre_completo,
                carrera: rows[0].carrera,
                cu: rows[0].cu,
                correo: rows[0].correo,
                rol_id: rows[0].rol_id
            }
        });
    } catch (error) {
        console.error('Error en register:', error);
        res.status(500).json({ 
            message: 'Error al registrar usuario',
            error: error.message 
        });
    }
};

// Login
export const login = async (req, res) => {
    try {
        const { correo, contrasenia } = req.body;

        // Validar campos requeridos
        if (!correo || !contrasenia) {
            return res.status(400).json({ 
                message: 'Correo y contraseña son requeridos' 
            });
        }

        // Buscar usuario por correo
        const { rows } = await pool.query(
            'SELECT * FROM usuarios WHERE correo = $1',
            [correo]
        );

        if (rows.length === 0) {
            return res.status(401).json({ 
                message: 'Credenciales inválidas' 
            });
        }

        const user = rows[0];

        // Verificar contraseña
        const isPasswordValid = await bcrypt.compare(contrasenia, user.contrasenia);

        if (!isPasswordValid) {
            return res.status(401).json({ 
                message: 'Credenciales inválidas' 
            });
        }

        // Generar token JWT
        const token = jwt.sign(
            { 
                userId: user.id, 
                correo: user.correo,
                rol_id: user.rol_id 
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Enviar token como cookie httpOnly
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 // 1 hora
        });

        res.json({
            message: 'Login exitoso',
            user: {
                id: user.id,
                nombre_completo: user.nombre_completo,
                carrera: user.carrera,
                cu: user.cu,
                correo: user.correo,
                rol_id: user.rol_id
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
            message: 'Error al iniciar sesión',
            error: error.message 
        });
    }
};

// Logout
export const logout = async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.json({ message: 'Logout exitoso' });
    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({ 
            message: 'Error al cerrar sesión',
            error: error.message 
        });
    }
};

// Protected - obtener datos del usuario autenticado
export const getProtectedData = async (req, res) => {
    try {
        // req.user se establece en el middleware de autenticación
        if (!req.user) {
            return res.status(401).json({ 
                message: 'No autorizado' 
            });
        }

        // Obtener datos completos del usuario
        const { rows } = await pool.query(
            'SELECT id, nombre_completo, carrera, cu, correo, rol_id FROM usuarios WHERE id = $1',
            [req.user.userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ 
                message: 'Usuario no encontrado' 
            });
        }

        res.json({
            message: 'Datos protegidos obtenidos exitosamente',
            user: rows[0]
        });
    } catch (error) {
        console.error('Error en protected:', error);
        res.status(500).json({ 
            message: 'Error al obtener datos protegidos',
            error: error.message 
        });
    }
};

