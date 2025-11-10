const express = require('express');
const router = express.Router();
const zoneController = require('../controllers/zoneController');
// Importamos el middleware de autenticación de Administradores
const authenticateAdmin = require('../middleware/authAdminMiddleware'); 

// Todas estas rutas son para uso administrativo y requieren autenticación

// POST /api/zones - Crear nueva zona
router.post('/', authenticateAdmin, zoneController.createZone);

// GET /api/zones - Listar todas las zonas
router.get('/', authenticateAdmin, zoneController.getAllZones);

// PUT /api/zones/:id_zona - Actualizar zona específica
router.put('/:id_zona', authenticateAdmin, zoneController.updateZone);

// DELETE /api/zones/:id_zona - Eliminar zona específica
router.delete('/:id_zona', authenticateAdmin, zoneController.deleteZone);

module.exports = router;