// services/geofencingService.js
const db = require('../db/db');

/**
 * Función principal para verificar el Geofencing.
 * Se llama después de cada nueva ubicación registrada.
 */
exports.checkGeofence = async (id_dispositivo, nueva_ubicacion_id) => {
    try {
        // --- 1. Obtener la Nueva Ubicación y la Ubicación Anterior ---
        
        const ubicacionesQuery = `
            WITH UltimasUbicaciones AS (
                SELECT 
                    ubicacion_point,
                    timestamp_captura,
                    ROW_NUMBER() OVER (ORDER BY timestamp_captura DESC) as rn
                FROM Ubicaciones
                WHERE id_dispositivo = $1
                ORDER BY timestamp_captura DESC
                LIMIT 2
            )
            SELECT 
                (SELECT ubicacion_point FROM UltimasUbicaciones WHERE rn = 1) as nueva_punto,
                (SELECT ubicacion_point FROM UltimasUbicaciones WHERE rn = 2) as anterior_punto
        `;
        const ubicacionResult = await db.query(ubicacionesQuery, [id_dispositivo]);
        const { nueva_punto, anterior_punto } = ubicacionResult.rows[0];

        if (!nueva_punto) return; // No hay datos de ubicación

        // --- 2. Obtener Todas las Zonas de Geofencing Activas ---
        
        const zonasQuery = `
            SELECT 
                id_zona, 
                nombre_zona, 
                centro_point, 
                radio_metros,
                alerta_entrada,
                alerta_salida
            FROM Zonas_Geofencing;
        `;
        const zonasResult = await db.query(zonasQuery);
        const zonas = zonasResult.rows;

        // --- 3. Evaluar la Posición de las Ubicaciones Respecto a Cada Zona ---
        
        for (const zona of zonas) {
            // Consulta de PostGIS para verificar si el punto está DENTRO del radio (en metros)
            // ST_DWithin: Retorna TRUE si A está a la distancia B de C (distancia medida en metros si el SRID es 4326/WGS84)
            
            const postgisQuery = `
                SELECT 
                    ST_DWithin($1::geometry, $2::geometry, $3) as esta_dentro;
            `;
            
            // Verificación de la NUEVA posición
            const nuevoCheck = await db.query(postgisQuery, [zona.centro_point, nueva_punto, zona.radio_metros]);
            const nueva_posicion_es_dentro = nuevoCheck.rows[0].esta_dentro;
            
            // Verificación de la POSICIÓN ANTERIOR (asumimos FALSE si no hay punto anterior)
            let anterior_posicion_es_dentro = false;
            if (anterior_punto) {
                const anteriorCheck = await db.query(postgisQuery, [zona.centro_point, anterior_punto, zona.radio_metros]);
                anterior_posicion_es_dentro = anteriorCheck.rows[0].esta_dentro;
            }

            // --- 4. Determinar y Registrar el Evento de Alerta ---
            
            let tipo_alerta = null;
            let descripcion = null;

            if (zona.alerta_entrada && !anterior_posicion_es_dentro && nueva_posicion_es_dentro) {
                // Salió de afuera hacia adentro = ENTRADA
                tipo_alerta = 'ENTRADA_ZONA';
                descripcion = `El dispositivo ha entrado a la zona: ${zona.nombre_zona}.`;
            } else if (zona.alerta_salida && anterior_posicion_es_dentro && !nueva_posicion_es_dentro) {
                // Salió de adentro hacia afuera = SALIDA
                tipo_alerta = 'SALIDA_ZONA';
                descripcion = `El dispositivo ha salido de la zona: ${zona.nombre_zona}.`;
            }

            if (tipo_alerta) {
                // Registrar la Alerta en la tabla Alertas_Historial
                const alertaQuery = `
                    INSERT INTO Alertas_Historial (id_dispositivo, id_zona, tipo_alerta, descripcion)
                    VALUES ($1, $2, $3, $4);
                `;
                await db.query(alertaQuery, [id_dispositivo, zona.id_zona, tipo_alerta, descripcion]);
                console.log(`[ALERTA REGISTRADA] Dispositivo ${id_dispositivo}: ${tipo_alerta} en ${zona.nombre_zona}`);
                
                // (Aquí iría la lógica para enviar notificaciones en tiempo real al Panel Web)
            }
        }

    } catch (error) {
        console.error('Error en el servicio de Geofencing:', error);
    }
};