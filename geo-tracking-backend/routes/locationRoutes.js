// routes/locationRoutes.js
const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const authenticateDevice = require('../middleware/authMiddleware'); // Importar el middleware

// Esta ruta SÓLO es accesible si el JWT es válido y el dispositivo está activo.
router.post('/', authenticateDevice, locationController.receiveLocation);

module.exports = router;