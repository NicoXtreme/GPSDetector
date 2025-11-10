const db = require('../db/db');

// Función Utilitaria: Crea la expresión SQL para el GEOMETRY Point de PostGIS
const createGeomPoint = (longitud, latitud) => {
    // PostGIS requiere la sintaxis ST_MakePoint(Longitud, Latitud)
    return `ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326)`;
};

// --------------------------------------------------------------------------
// 1. POST /api/zones (Crear nueva zona)
// --------------------------------------------------------------------------
exports.createZone = async (req, res) => {
    const { nombre_zona, centro_latitud, centro_longitud, radio_metros, alerta_entrada, alerta_salida } = req.body;

    if (!nombre_zona || !centro_latitud || !centro_longitud || !radio_metros) {
        return res.status(400).send({ message: 'Faltan campos requeridos para crear la zona.' });
    }

    try {
        const query = `
            INSERT INTO Zonas_Geofencing 
                (nombre_zona, centro_point, radio_metros, alerta_entrada, alerta_salida)
            VALUES 
                ($1, ${createGeomPoint(centro_longitud, centro_latitud)}, $2, $3, $4)
            RETURNING *;
        `;
        const result = await db.query(query, [
            nombre_zona, 
            radio_metros, 
            alerta_entrada !== undefined ? alerta_entrada : true, 
            alerta_salida !== undefined ? alerta_salida : true
        ]);

        res.status(201).json({ message: 'Zona creada exitosamente.', zone: result.rows[0] });

    } catch (error) {
        console.error('Error al crear zona:', error);
        res.status(500).send({ message: 'Error interno del servidor al crear la zona.' });
    }
};

// --------------------------------------------------------------------------
// 2. GET /api/zones (Obtener todas las zonas)
// --------------------------------------------------------------------------
exports.getAllZones = async (req, res) => {
    try {
        // Usamos ST_X e ST_Y de PostGIS para devolver coordenadas legibles al frontend
        const query = `
            SELECT 
                id_zona, 
                nombre_zona, 
                ST_Y(centro_point) as centro_latitud, 
                ST_X(centro_point) as centro_longitud, 
                radio_metros, 
                alerta_entrada, 
                alerta_salida
            FROM Zonas_Geofencing
            ORDER BY nombre_zona;
        `;
        const result = await db.query(query);

        res.status(200).json({ zones: result.rows });

    } catch (error) {
        console.error('Error al obtener zonas:', error);
        res.status(500).send({ message: 'Error interno del servidor al obtener las zonas.' });
    }
};

// --------------------------------------------------------------------------
// 3. PUT /api/zones/:id_zona (Actualizar zona)
// --------------------------------------------------------------------------
exports.updateZone = async (req, res) => {
    const { id_zona } = req.params;
    const { nombre_zona, centro_latitud, centro_longitud, radio_metros, alerta_entrada, alerta_salida } = req.body;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;

    // Construcción dinámica de la consulta
    if (nombre_zona) { updates.push(`nombre_zona = $${paramIndex++}`); values.push(nombre_zona); }
    if (radio_metros) { updates.push(`radio_metros = $${paramIndex++}`); values.push(radio_metros); }
    if (alerta_entrada !== undefined) { updates.push(`alerta_entrada = $${paramIndex++}`); values.push(alerta_entrada); }
    if (alerta_salida !== undefined) { updates.push(`alerta_salida = $${paramIndex++}`); values.push(alerta_salida); }
    
    // Si se envían coordenadas, actualiza el campo GEOMETRY
    if (centro_latitud && centro_longitud) {
        updates.push(`centro_point = ${createGeomPoint(centro_longitud, centro_latitud)}`);
    }

    if (updates.length === 0) {
        return res.status(400).send({ message: 'No se proporcionaron campos para actualizar.' });
    }

    values.push(id_zona); // El último parámetro posicional

    try {
        const query = `
            UPDATE Zonas_Geofencing
            SET ${updates.join(', ')}
            WHERE id_zona = $${paramIndex}
            RETURNING id_zona;
        `;
        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).send({ message: 'Zona no encontrada o no actualizada.' });
        }

        res.status(200).send({ message: 'Zona actualizada exitosamente.' });

    } catch (error) {
        console.error('Error al actualizar zona:', error);
        res.status(500).send({ message: 'Error interno del servidor al actualizar la zona.' });
    }
};

// --------------------------------------------------------------------------
// 4. DELETE /api/zones/:id_zona (Eliminar zona)
// --------------------------------------------------------------------------
exports.deleteZone = async (req, res) => {
    const { id_zona } = req.params;

    try {
        const query = `
            DELETE FROM Zonas_Geofencing
            WHERE id_zona = $1
            RETURNING id_zona;
        `;
        const result = await db.query(query, [id_zona]);

        if (result.rows.length === 0) {
            return res.status(404).send({ message: 'Zona no encontrada.' });
        }

        res.status(200).send({ message: 'Zona eliminada exitosamente.' });

    } catch (error) {
        console.error('Error al eliminar zona:', error);
        res.status(500).send({ message: 'Error interno del servidor al eliminar la zona. (Revise si existen alertas vinculadas).' });
    }
};