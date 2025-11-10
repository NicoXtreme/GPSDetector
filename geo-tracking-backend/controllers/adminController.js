// controllers/adminController.js
const db = require('../db/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Para verificar contraseñas hasheadas

// --------------------------------------------------------------------------
// POST /api/admin/login (Login del Panel Web)
// --------------------------------------------------------------------------
exports.adminLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send({ message: 'Email y contraseña son requeridos.' });
    }

    try {
        // 1. Buscar el administrador por email
        const userQuery = `
            SELECT id_admin, password_hash, rol 
            FROM Usuarios_Admin 
            WHERE email = $1;
        `;
        const result = await db.query(userQuery, [email]);
        const user = result.rows[0];

        if (!user) {
            // No usar mensajes específicos, solo "Credenciales inválidas"
            return res.status(401).send({ message: 'Credenciales inválidas.' });
        }

        // 2. Comparar la contraseña (hash)
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).send({ message: 'Credenciales inválidas.' });
        }

        // 3. Generar el JWT para el Administrador (Token de corta duración, ej. 1h)
        const adminPayload = {
            id: user.id_admin,
            rol: user.rol,
            type: 'admin' // Para distinguir de los tokens de dispositivo
        };

        const adminToken = jwt.sign(
            adminPayload, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' } // Token de corta duración para el panel web
        );

        // 4. Respuesta exitosa
        res.status(200).json({
            message: 'Login exitoso',
            token: adminToken,
            user: { id_admin: user.id_admin, rol: user.rol }
        });

    } catch (error) {
        console.error('Error en el login del administrador:', error);
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
};

// NOTA: Recuerda que antes de probar el login, debes tener al menos un registro en 
// la tabla Usuarios_Admin con una contraseña hasheada (ej: usando bcrypt.hash).