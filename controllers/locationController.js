// controllers/locationController.js (Fragmento modificado)
const db = require('../db/db');
const geofencingService = require('../services/geofencingService'); // ¡Nuevo!

// --------------------------------------------------------------------------
// POST /api/location
// --------------------------------------------------------------------------
exports.receiveLocation = async (req, res) => {
    const { latitud, longitud } = req.body;
    const id_dispositivo = req.deviceId;
    
    if (!latitud || !longitud) {
        return res.status(400).send({ message: 'Latitud y Longitud son requeridas.' });
    }

    try {
        // 1. Insertar la nueva ubicación y obtener su ID
        const insertQuery = `
            INSERT INTO Ubicaciones (id_dispositivo, latitud, longitud, ubicacion_point)
            VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($3, $2), 4326))
            RETURNING id_ubicacion;
        `;
        const result = await db.query(insertQuery, [id_dispositivo, latitud, longitud]);
        const nueva_ubicacion_id = result.rows[0].id_ubicacion;

        // 2. Ejecutar la lógica de Geofencing (ASÍNCRONO - para no bloquear la respuesta)
        // Usamos .then/.catch para que no bloquee la respuesta HTTP al cliente
        geofencingService.checkGeofence(id_dispositivo, nueva_ubicacion_id)
            .catch(err => console.error("Error asíncrono en Geofencing:", err)); 
        
        // 3. Responder al cliente inmediatamente
        res.status(200).send({ message: 'Ubicación registrada exitosamente. Geofencing en proceso.' });

    } catch (error) {
        console.error('Error al registrar ubicación:', error);
        res.status(500).send({ message: 'Error interno del servidor al procesar la ubicación.' });
    }
};