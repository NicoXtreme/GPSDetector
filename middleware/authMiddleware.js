// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const db = require('../db/db');
require('dotenv').config();

const authenticateDevice = async (req, res, next) => {
    // 1. Obtener el Token del Header
    // Esperamos el formato: Authorization: Bearer <token_acceso>
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ message: 'Acceso denegado. Token no proporcionado o formato incorrecto.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 2. Verificar y Decodificar el JWT
        // Usa el JWT_SECRET para verificar la firma y expiración
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // El 'jti' es el token_acceso que guardamos en la BD.
        const tokenAccesoDB = decoded.jti; 

        // 3. Buscar el Dispositivo en la Base de Datos
        // Verificamos que el token_acceso sea válido y esté activo
        const deviceQuery = `
            SELECT id_dispositivo FROM Usuarios_Dispositivos 
            WHERE token_acceso = $1 AND activo = TRUE;
        `;
        const result = await db.query(deviceQuery, [tokenAccesoDB]);

        if (result.rows.length === 0) {
            return res.status(401).send({ message: 'Token de acceso inválido o dispositivo inactivo.' });
        }
        
        // 4. Adjuntar la ID del Dispositivo a la solicitud (clave para el controlador)
        req.deviceId = result.rows[0].id_dispositivo;
        
        // 5. Continuar al controlador de la ruta (Ej. al controlador de ubicación)
        next();

    } catch (error) {
        // Maneja errores como token expirado, firma inválida, etc.
        console.error('Error de autenticación de token:', error);
        return res.status(401).send({ message: 'Token de acceso inválido o expirado.' });
    }
};

module.exports = authenticateDevice;