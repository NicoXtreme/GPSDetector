// routes/deviceAdminRoutes.js
const express = require('express');
const router = express.Router();
const deviceAdminController = require('../controllers/deviceAdminController');
const authenticateAdmin = require('../middleware/authAdminMiddleware'); 

// Todas estas rutas son para uso administrativo y requieren autenticación de Admin

// I. GESTIÓN DE DISPOSITIVOS

// GET /api/admin/devices - Listar todos los dispositivos
router.get('/devices', authenticateAdmin, deviceAdminController.listAllDevices);

// PUT /api/admin/devices/:id_dispositivo/status - Activar/Desactivar dispositivo
router.put('/devices/:id_dispositivo/status', authenticateAdmin, deviceAdminController.updateDeviceStatus);


// II. CONSULTA DE ALERTAS

// GET /api/admin/alerts - Listar historial de alertas
router.get('/alerts', authenticateAdmin, deviceAdminController.listAlertHistory);

module.exports = router;