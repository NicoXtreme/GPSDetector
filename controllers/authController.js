// controllers/authController.js
const db = require('../db/db');
const jwt = require('jsonwebtoken');

// Usaremos 'crypto' para generar un token_acceso realmente único para la BD
const crypto = require('crypto');

// --- SIMULACIÓN DE CÓDIGOS Y SERVICIO SMS ---
const tempCodes = {}; // Simula caché (solo para desarrollo)
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// --------------------------------------------------------------------------
// 1. POST /api/auth/register
// --------------------------------------------------------------------------
exports.registerDevice = async (req, res) => {
  const { numero_telefono } = req.body;

  if (!numero_telefono) {
    return res.status(400).send({ message: 'Número de teléfono es requerido.' });
  }

  try {
    const code = generateCode();
    tempCodes[numero_telefono] = code;

    // SIMULACIÓN DE SMS
    console.log(`[SIMULACIÓN SMS] Código para ${numero_telefono}: ${code}`);
    
    res.status(200).send({ 
      message: 'Código de verificación enviado. Por favor, verifique.',
      simulated_code: code // Quitar en producción
    });

  } catch (error) {
    console.error('Error en el registro:', error);
    res.status(500).send({ message: 'Error interno del servidor.' });
  }
};


// --------------------------------------------------------------------------
// 2. POST /api/auth/verify
// --------------------------------------------------------------------------
exports.verifyCode = async (req, res) => {
  const { numero_telefono, codigo_verificacion } = req.body;

  if (!numero_telefono || !codigo_verificacion) {
    return res.status(400).send({ message: 'Faltan campos requeridos.' });
  }

  if (tempCodes[numero_telefono] !== codigo_verificacion) {
    return res.status(401).send({ message: 'Código de verificación incorrecto o expirado.' });
  }

  try {
    // 1. Generar el token_acceso único para la tabla Usuarios_Dispositivos
    const token_acceso = crypto.randomBytes(32).toString('hex');

    // 2. Firmar el JWT que se enviará al cliente móvil
    const payload = {
        sub: numero_telefono, 
        jti: token_acceso, // Usado para buscar el dispositivo por token en la DB
    };

    const jwt_firmado = jwt.sign(
        payload, 
        process.env.JWT_SECRET, // ¡Aquí se usa tu secreto del .env!
        { expiresIn: '365d' } // Larga duración para App Móvil
    );

    // 3. Insertar el dispositivo
    const insertQuery = `
      INSERT INTO Usuarios_Dispositivos (numero_telefono, token_acceso)
      VALUES ($1, $2)
      RETURNING id_dispositivo;
    `;
    const result = await db.query(insertQuery, [numero_telefono, token_acceso]);
    
    delete tempCodes[numero_telefono];

    // 4. Devolver el JWT (¡este es el token que el móvil debe usar!)
    res.status(201).send({
      message: 'Dispositivo vinculado exitosamente.',
      id_dispositivo: result.rows[0].id_dispositivo,
      token_acceso: jwt_firmado // El JWT firmado completo
    });

  } catch (error) {
    console.error('Error en la verificación/inserción:', error);
    res.status(500).send({ message: 'Error interno del servidor.' });
  }
};