export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user || typeof req.user.rol_id === 'undefined') {
                return res.status(401).json({ message: 'No autenticado' });
            }
            if (!allowedRoles.includes(req.user.rol_id)) {
                return res.status(403).json({ message: 'No autorizado' });
            }
            next();
        } catch (error) {
            console.error('Error en requireRole:', error);
            res.status(500).json({ message: 'Error de autorización' });
        }
    };
};


