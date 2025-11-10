// controllers/historyController.js
const db = require('../db/db');

// Esta función asume que el usuario/admin ya fue autenticado a nivel de la ruta
exports.getDeviceHistory = async (req, res) => {
    // 1. Obtener parámetros de la solicitud
    const { device_id } = req.params; // ID del dispositivo a consultar (desde la URL)
    const { start_date, end_date } = req.query; // Fechas de inicio y fin (desde los parámetros de consulta ?start_date=...&end_date=...)

    // Validación básica
    if (!device_id) {
        return res.status(400).send({ message: 'El ID del dispositivo es requerido.' });
    }
    
    // Convertir a objetos Date válidos (o manejar como strings si el frontend los maneja)
    // Para simplificar, asumiremos que start_date y end_date son strings de fecha/hora válidos.

    try {
        // 2. Consulta a PostgreSQL con filtros
        const query = `
            SELECT 
                latitud, 
                longitud, 
                timestamp_captura
            FROM 
                Ubicaciones
            WHERE 
                id_dispositivo = $1
                -- Filtrar por rango de fecha/hora (si se proporcionan)
                AND timestamp_captura >= COALESCE($2, '-infinity'::timestamp with time zone)
                AND timestamp_captura <= COALESCE($3, 'infinity'::timestamp with time zone)
            ORDER BY 
                timestamp_captura ASC;
        `;

        // Si start_date o end_date son nulos, COALESCE usa '-infinity' o 'infinity' para incluir todos los datos.
        const result = await db.query(query, [device_id, start_date, end_date]);

        // 3. Devolver los resultados
        if (result.rows.length === 0) {
            return res.status(404).send({ message: 'No se encontraron ubicaciones para el dispositivo en el rango especificado.' });
        }

        res.status(200).json({
            device_id: device_id,
            count: result.rows.length,
            locations: result.rows,
        });

    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
};

// Opcional: Obtener la última ubicación (Útil para el mapa principal del panel)
exports.getLastLocation = async (req, res) => {
    const { device_id } = req.params;

    try {
        const query = `
            SELECT 
                latitud, 
                longitud, 
                timestamp_captura
            FROM 
                Ubicaciones
            WHERE 
                id_dispositivo = $1
            ORDER BY 
                timestamp_captura DESC
            LIMIT 1;
        `;
        const result = await db.query(query, [device_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).send({ message: 'No se encontró la última ubicación para el dispositivo.' });
        }

        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error('Error al obtener última ubicación:', error);
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
};


// --------------------------------------------------------------------------
// Nuevo: Obtener la última ubicación de TODOS los dispositivos activos
// --------------------------------------------------------------------------
exports.getAllLastLocations = async (req, res) => {
    try {
        const query = `
            WITH LastLocations AS (
                SELECT 
                    u.id_dispositivo,
                    u.latitud,
                    u.longitud,
                    u.timestamp_captura,
                    -- RANK() para encontrar la última ubicación por dispositivo
                    ROW_NUMBER() OVER (
                        PARTITION BY u.id_dispositivo 
                        ORDER BY u.timestamp_captura DESC
                    ) as rn
                FROM 
                    Ubicaciones u
                JOIN 
                    Usuarios_Dispositivos d ON u.id_dispositivo = d.id_dispositivo
                WHERE 
                    d.activo = TRUE -- Solo dispositivos activos
            )
            SELECT 
                ll.id_dispositivo, 
                ll.latitud, 
                ll.longitud, 
                ll.timestamp_captura,
                d.nombre_dispositivo
            FROM 
                LastLocations ll
            JOIN
                Usuarios_Dispositivos d ON ll.id_dispositivo = d.id_dispositivo
            WHERE 
                ll.rn = 1; -- Seleccionar solo la ubicación más reciente (rank=1)
        `;
        const result = await db.query(query);
        
        res.status(200).json({ 
            count: result.rows.length,
            locations: result.rows 
        });

    } catch (error) {
        console.error('Error al obtener todas las últimas ubicaciones:', error);
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
};