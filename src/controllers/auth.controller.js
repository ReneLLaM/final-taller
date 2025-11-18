import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { pool } from '../db.js';
import { JWT_SECRET } from '../config.js';

// Configuración de nodemailer
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER || 'tu-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'tu-app-password'
    }
});

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

        // Resolver carrera contra la tabla de carreras (opcional)
        let carreraLimpia = carrera ? carrera.trim() : null;
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
                console.warn('No se pudo resolver carrera en register:', e.message);
            }
        }

        // Hash de la contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(contrasenia, saltRounds);

        // Insertar usuario
        const { rows } = await pool.query(
            'INSERT INTO usuarios (nombre_completo, carrera, carrera_id, cu, correo, contrasenia, rol_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, nombre_completo, carrera, carrera_id, cu, correo, rol_id',
            [nombre_completo, carreraLimpia, carreraId, cu, correo, hashedPassword, rol_id]
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
                carrera_id: rows[0].carrera_id,
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
            'SELECT id, nombre_completo, carrera, carrera_id, cu, correo, rol_id FROM usuarios WHERE id = $1',
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

// Update profile (propio) - no permite cambiar rol
export const updateMe = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const userId = req.user.userId;
        const { nombre_completo, carrera, cu, correo, contrasenia } = req.body;

        if (!nombre_completo || !correo) {
            return res.status(400).json({ message: 'Nombre y correo son requeridos' });
        }

        // Verificar unicidad de correo si cambia
        const { rows: existingEmail } = await pool.query(
            'SELECT id FROM usuarios WHERE correo = $1 AND id <> $2',
            [correo, userId]
        );
        if (existingEmail.length > 0) {
            return res.status(400).json({ message: 'El correo ya está registrado' });
        }

        // Verificar unicidad de CU si cambia y si se envió
        if (cu) {
            const { rows: existingCu } = await pool.query(
                'SELECT id FROM usuarios WHERE cu = $1 AND id <> $2',
                [cu, userId]
            );
            if (existingCu.length > 0) {
                return res.status(400).json({ message: 'El CU ya está registrado' });
            }
        }

        // Resolver carrera contra tabla carreras (opcional)
        let carreraLimpia = carrera ? carrera.trim() : null;
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
                console.warn('No se pudo resolver carrera en updateMe:', e.message);
            }
        }

        // Construir actualización dinámica
        let query = 'UPDATE usuarios SET nombre_completo = $1, carrera = $2, carrera_id = $3, cu = $4, correo = $5';
        const params = [nombre_completo, carreraLimpia, carreraId, cu || null, correo];

        if (contrasenia && contrasenia.length >= 6) {
            const hashed = await bcrypt.hash(contrasenia, 10);
            query += ', contrasenia = $6 WHERE id = $7 RETURNING id, nombre_completo, carrera, carrera_id, cu, correo, rol_id';
            params.push(hashed, userId);
        } else {
            query += ' WHERE id = $6 RETURNING id, nombre_completo, carrera, carrera_id, cu, correo, rol_id';
            params.push(userId);
        }

        const { rows } = await pool.query(query, params);
        res.json({ message: 'Perfil actualizado', user: rows[0] });
    } catch (error) {
        console.error('Error en updateMe:', error);
        res.status(500).json({ message: 'Error al actualizar perfil', error: error.message });
    }
};

// Forgot Password - Solicitar recuperación
export const forgotPassword = async (req, res) => {
    try {
        const { correo } = req.body;

        if (!correo) {
            return res.status(400).json({ 
                message: 'Correo es requerido' 
            });
        }

        // Buscar usuario
        const { rows } = await pool.query(
            'SELECT * FROM usuarios WHERE correo = $1',
            [correo]
        );

        // Siempre devolver éxito por seguridad (no revelar si el correo existe)
        const responseMessage = 'Si el correo existe, se ha enviado un enlace de recuperación.';

        if (rows.length === 0) {
            return res.json({ 
                message: responseMessage 
            });
        }

        const user = rows[0];

        // Generar token de recuperación (válido por 1 hora)
        const resetToken = jwt.sign(
            { 
                userId: user.id, 
                correo: user.correo 
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        // URL de reset (ajusta según tu dominio)
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pages/auth/reset-password.html?token=${resetToken}`;

        // Enviar correo
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER || 'noreply@usfx.edu.bo',
                to: correo,
                subject: 'Recuperación de Contraseña - Asignación de Aulas',
                html: `
                    <h2>Recuperación de Contraseña</h2>
                    <p>Hola ${user.nombre_completo},</p>
                    <p>Has solicitado restablecer tu contraseña.</p>
                    <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
                    <a href="${resetUrl}" style="background-color: #006FEE; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">
                        Restablecer Contraseña
                    </a>
                    <p>Este enlace expirará en 1 hora.</p>
                    <p>Si no solicitaste esto, ignora este correo.</p>
                    <p>Atentamente,<br>Sistema de Asignación de Aulas</p>
                `
            });

            console.log('Correo enviado a:', correo);
        } catch (emailError) {
            console.error('Error al enviar correo:', emailError);
            // No fallar la petición si no se puede enviar el correo
        }

        res.json({ 
            message: responseMessage 
        });
    } catch (error) {
        console.error('Error en forgotPassword:', error);
        res.status(500).json({ 
            message: 'Error al procesar solicitud',
            error: error.message 
        });
    }
};

// Reset Password - Cambiar contraseña con token
export const resetPassword = async (req, res) => {
    try {
        const { token, contrasenia } = req.body;

        if (!token || !contrasenia) {
            return res.status(400).json({ 
                message: 'Token y contraseña son requeridos' 
            });
        }

        // Validar token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (error) {
            return res.status(400).json({ 
                message: 'Token inválido o expirado' 
            });
        }

        // Validar longitud de contraseña
        if (contrasenia.length < 6) {
            return res.status(400).json({ 
                message: 'La contraseña debe tener al menos 6 caracteres' 
            });
        }

        // Hash de la nueva contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(contrasenia, saltRounds);

        // Actualizar contraseña en la base de datos
        const { rowCount } = await pool.query(
            'UPDATE usuarios SET contrasenia = $1 WHERE id = $2',
            [hashedPassword, decoded.userId]
        );

        if (rowCount === 0) {
            return res.status(404).json({ 
                message: 'Usuario no encontrado' 
            });
        }

        res.json({ 
            message: 'Contraseña restablecida exitosamente' 
        });
    } catch (error) {
        console.error('Error en resetPassword:', error);
        res.status(500).json({ 
            message: 'Error al restablecer contraseña',
            error: error.message 
        });
    }
};

