// middleware/authAdminMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ message: 'Acceso denegado. Se requiere Token de Administrador.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 1. Verificar y Decodificar el JWT usando el secreto
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 2. Verificar que sea un Token de Administrador (opcional pero recomendado)
        if (decoded.type !== 'admin') {
            return res.status(403).send({ message: 'Token de tipo incorrecto. Se requiere acceso de administrador.' });
        }
        
        // 3. Adjuntar datos del Admin a la solicitud (id y rol)
        req.adminId = decoded.id;
        req.adminRole = decoded.rol;
        
        // 4. Continuar
        next();

    } catch (error) {
        // Maneja errores de token expirado o inválido
        console.error('Error de autenticación de Administrador:', error);
        return res.status(401).send({ message: 'Token inválido o expirado.' });
    }
};

module.exports = authenticateAdmin;