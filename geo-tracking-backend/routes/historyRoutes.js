// routes/historyRoutes.js
const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
// Importar el middleware de autenticación REAL para administradores
const authenticateAdmin = require('../middleware/authAdminMiddleware'); 

// --------------------------------------------------------------------------
// 1. NUEVA RUTA PARA EL DASHBOARD: Obtener la última ubicación de TODOS
// --------------------------------------------------------------------------
// GET /api/history/latest/all - Consulta la última ubicación de TODOS los dispositivos activos
router.get('/latest/all', authenticateAdmin, historyController.getAllLastLocations);

// --------------------------------------------------------------------------
// 2. Rutas existentes (Historial y última ubicación por dispositivo)
// --------------------------------------------------------------------------
// GET /api/history/{device_id} - Consulta el historial de ubicaciones
router.get('/:device_id', authenticateAdmin, historyController.getDeviceHistory);

// GET /api/history/latest/{device_id} - Consulta la última ubicación de un dispositivo específico
router.get('/latest/:device_id', authenticateAdmin, historyController.getLastLocation);

module.exports = router;