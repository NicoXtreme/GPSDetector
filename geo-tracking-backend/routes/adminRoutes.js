// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Endpoint de login para el Panel Web
router.post('/login', adminController.adminLogin);

// Rutas adicionales de gestión de Admin irán aquí

module.exports = router;