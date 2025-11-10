// controllers/deviceAdminController.js
const db = require('../db/db');

// --------------------------------------------------------------------------
// I. GESTIÓN DE DISPOSITIVOS (Usuarios_Dispositivos)
// --------------------------------------------------------------------------

// 1. GET /api/admin/devices - Listar todos los dispositivos
exports.listAllDevices = async (req, res) => {
    try {
        const query = `
            SELECT 
                id_dispositivo, 
                numero_telefono, 
                nombre_dispositivo, 
                activo 
                -- Se ha removido 'ultima_ubicacion_id' para evitar el error 500, 
                -- ya que esta columna no existe en la tabla Usuarios_Dispositivos según init.sql.
            FROM 
                Usuarios_Dispositivos
            ORDER BY 
                id_dispositivo ASC;
        `;
        const result = await db.query(query);

        res.status(200).json({ devices: result.rows });

    } catch (error) {
        console.error('Error al listar dispositivos:', error);
        res.status(500).send({ message: 'Error interno del servidor al listar dispositivos.' });
    }
};

// 2. PUT /api/admin/devices/:id_dispositivo/status - Activar/Desactivar
exports.updateDeviceStatus = async (req, res) => {
    const { id_dispositivo } = req.params;
    const { activo } = req.body; 

    if (activo === undefined) {
        return res.status(400).send({ message: 'El estado "activo" es requerido (true o false).' });
    }

    try {
        const query = `
            UPDATE Usuarios_Dispositivos
            SET activo = $1
            WHERE id_dispositivo = $2
            RETURNING id_dispositivo, activo;
        `;
        const result = await db.query(query, [activo, id_dispositivo]);

        if (result.rows.length === 0) {
            return res.status(404).send({ message: 'Dispositivo no encontrado.' });
        }

        res.status(200).json({ 
            message: `Dispositivo ${id_dispositivo} ${activo ? 'activado' : 'desactivado'} correctamente.`,
            device: result.rows[0]
        });

    } catch (error) {
        console.error('Error al actualizar estado del dispositivo:', error);
        res.status(500).send({ message: 'Error interno del servidor al actualizar estado.' });
    }
};


// --------------------------------------------------------------------------
// II. CONSULTA DE ALERTAS (Alertas_Historial)
// --------------------------------------------------------------------------

// 3. GET /api/admin/alerts - Listar historial de alertas
exports.listAlertHistory = async (req, res) => {
    const { limit = 100, device_id, zone_id } = req.query;

    let filter = '';
    const values = [];
    let paramIndex = 1;

    // Construcción dinámica de la cláusula WHERE
    if (device_id) {
        filter += `WHERE a.id_dispositivo = $${paramIndex++} `;
        values.push(device_id);
    }
    if (zone_id) {
        filter += (filter ? 'AND ' : 'WHERE ') + `a.id_zona = $${paramIndex++} `;
        values.push(zone_id);
    }

    const finalLimit = parseInt(limit) || 100;

    try {
        const query = `
            SELECT 
                a.id_alerta,
                a.timestamp_alerta,
                a.tipo_alerta,
                d.nombre_dispositivo,
                d.numero_telefono,
                z.nombre_zona
            FROM 
                Alertas_Historial a
            JOIN 
                Usuarios_Dispositivos d ON a.id_dispositivo = d.id_dispositivo
            JOIN 
                Zonas_Geofencing z ON a.id_zona = z.id_zona
            ${filter}
            ORDER BY 
                a.timestamp_alerta DESC
            LIMIT 
                ${finalLimit}; 
        `;
        
        const result = await db.query(query, values);

        res.status(200).json({ alerts: result.rows });

    } catch (error) {
        console.error('Error al listar alertas:', error);
        res.status(500).send({ message: 'Error interno del servidor al listar alertas.' });
    }
};