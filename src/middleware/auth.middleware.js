import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

export const authMiddleware = (req, res, next) => {
    try {
        // Obtener el token de las cookies
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ 
                message: 'No se proporcionó token de autenticación' 
            });
        }

        // Verificar y decodificar el token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Agregar la información del usuario al request
        // Soporta tokens con 'userId' o con 'id'
        req.userId = decoded.userId ?? decoded.id;
        req.user = decoded;

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                message: 'Token inválido' 
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Token expirado' 
            });
        }
        console.error('Error en authMiddleware:', error);
        return res.status(500).json({ 
            message: 'Error en la autenticación',
            error: error.message 
        });
    }
};

// Alias para verifyToken
export const verifyToken = authMiddleware;

