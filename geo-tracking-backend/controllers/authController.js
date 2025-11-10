// controllers/authController.js

const db = require('../db/db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
// Cargar JWT_SECRET desde el entorno (asegúrate de que esté en tu .env)
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_DEVICE_EXPIRATION = '90d'; 

// Función utilitaria para generar un código de 6 dígitos
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};


// --------------------------------------------------------------------------
// 1. POST /api/auth/register (Genera código)
// --------------------------------------------------------------------------
exports.registerDevice = async (req, res) => {
    const { telefono, nombre_dispositivo } = req.body;

    if (!telefono) {
        return res.status(400).send({ message: 'El número de teléfono es requerido.' });
    }
    
    const codigo = generateVerificationCode();
    const expiryTime = new Date(Date.now() + 10 * 60000); 

    try {
        const deviceName = nombre_dispositivo || `Dispositivo ${telefono}`;

        // Consulta de registro/actualización (INSERT ON CONFLICT)
        const query = `
            INSERT INTO Usuarios_Dispositivos (numero_telefono, nombre_dispositivo, codigo_verificacion, codigo_expira, activo)
            VALUES ($1, $2, $3, $4, FALSE)
            ON CONFLICT (numero_telefono) DO UPDATE
            SET 
                nombre_dispositivo = COALESCE(Usuarios_Dispositivos.nombre_dispositivo, $2),
                codigo_verificacion = $3, 
                codigo_expira = $4,
                activo = FALSE, 
                token_acceso = NULL 
            RETURNING id_dispositivo;
        `.trim(); 

        await db.query(query, [telefono, deviceName, codigo, expiryTime]);

        console.log(`\n\n[SMS SIMULADO] Código de Verificación para ${telefono}: ${codigo}\n\n`);

        res.status(200).json({ 
            message: 'Registro exitoso. Se ha enviado un código de verificación.',
            simulated_code: codigo 
        });

    } catch (error) {
        console.error('Error en el registro del dispositivo:', error);
        res.status(500).send({ message: 'Error interno del servidor al registrar.' });
    }
};


// --------------------------------------------------------------------------
// 2. POST /api/auth/verify (Verifica código y emite token)
// --------------------------------------------------------------------------
exports.verifyCode = async (req, res) => {
    const { telefono, codigo_verificacion } = req.body;

    if (!telefono || !codigo_verificacion) {
        return res.status(400).send({ message: 'Teléfono y código de verificación son requeridos.' });
    }

    try {
        // 1. Buscar y validar el código.
        // Se usa una sola línea para la consulta, siendo lo más robusto contra caracteres invisibles.
        const deviceQuery = `SELECT id_dispositivo FROM Usuarios_Dispositivos WHERE numero_telefono = $1 AND codigo_verificacion = $2 AND activo = FALSE AND codigo_expira > NOW() LIMIT 1;`.trim();
        
        const result = await db.query(deviceQuery, [telefono, codigo_verificacion]);

        if (result.rows.length === 0) {
            return res.status(401).send({ message: 'Código de verificación inválido o expirado. Inténtelo de nuevo.' });
        }

        const id_dispositivo = result.rows[0].id_dispositivo;
        
        // 2. Generar el Token JWT
        const jti = crypto.randomBytes(16).toString('hex'); 

        const deviceToken = jwt.sign(
            { id: id_dispositivo, type: 'device' }, 
            JWT_SECRET,
            { expiresIn: JWT_DEVICE_EXPIRATION, jwtid: jti } 
        );

        // 3. Activar el dispositivo y guardar el JTI.
        // Se usa una sola línea para la consulta.
        const updateQuery = `UPDATE Usuarios_Dispositivos SET activo = TRUE, token_acceso = $1, codigo_verificacion = NULL, codigo_expira = NULL WHERE id_dispositivo = $2;`.trim();
        
        await db.query(updateQuery, [jti, id_dispositivo]);

        // 4. Respuesta exitosa con el token
        res.status(200).json({ 
            message: 'Dispositivo verificado y activado.',
            deviceToken: deviceToken
        });

    } catch (error) {
        // MUY IMPORTANTE: Loguear la consulta SQL si es posible para ver dónde está el carácter problemático.
        // Dado que la consulta está limpia ahora, este error podría ser por la base de datos.
        console.error('Error en la verificación del código:', error);
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
};