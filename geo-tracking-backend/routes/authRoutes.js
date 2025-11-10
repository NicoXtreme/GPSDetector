// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Iniciar registro (envío de SMS simulado)
router.post('/register', authController.registerDevice);

// Verificar código y emitir Token de Acceso
router.post('/verify', authController.verifyCode);

module.exports = router;