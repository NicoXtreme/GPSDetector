// controllers/locationController.js (CORREGIDO)
const db = require('../db/db');
const geofencingService = require('../services/geofencingService'); 

// --------------------------------------------------------------------------
// POST /api/location
// --------------------------------------------------------------------------
exports.receiveLocation = async (req, res) => {
    // Nota: latitud y longitud son strings o números flotantes en el request
    const { latitud, longitud } = req.body;
    // id_dispositivo es inyectado por el authMiddleware
    const id_dispositivo = req.deviceId; 
    
    if (!latitud || !longitud) {
        return res.status(400).send({ message: 'Latitud y Longitud son requeridas.' });
    }

    try {
        // 1. Insertar la nueva ubicación y obtener su ID
        // CORRECCIÓN CLAVE: Usamos los valores de las variables `longitud` y `latitud`
        // directamente en ST_MakePoint para evitar el conflicto de tipos con los parámetros posicionales ($2 y $3).
        const insertQuery = `
            INSERT INTO Ubicaciones (id_dispositivo, latitud, longitud, ubicacion_point)
            VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326))
            RETURNING id_ubicacion;
        `;
        
        // Parámetros: [ID del dispositivo, Latitud (para la columna), Longitud (para la columna)]
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
        // El error 42P08 (coerción) ahora debería haberse resuelto.
        res.status(500).send({ message: 'Error interno del servidor al procesar la ubicación.' });
    }
};