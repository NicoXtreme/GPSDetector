// server.js
const express = require('express');
// Carga las variables del archivo .env al entorno de Node.js
require('dotenv').config(); 

const app = express();
const port = process.env.PORT || 3000;

// --- 1. MIDDLEWARES GLOBALES ---

// Permite a Express leer cuerpos de petición en formato JSON
app.use(express.json());

// Permite a Express leer datos de formularios URL-encoded
app.use(express.urlencoded({ extended: true }));


// --- 2. IMPORTACIÓN DE RUTAS ---

// Rutas de Autenticación (Registro y Vinculación de Dispositivos)
const authRoutes = require('./routes/authRoutes');
// Rutas de Ubicación (Recepción de Datos y Geofencing)
const locationRoutes = require('./routes/locationRoutes');


// --- 3. CONEXIÓN DE RUTAS BASE ---

// Conecta las rutas de autenticación a /api/auth
// Ejemplo: POST /api/auth/register
app.use('/api/auth', authRoutes); 

// Conecta las rutas de ubicación a /api/location
// Ejemplo: POST /api/location (ruta protegida)
app.use('/api/location', locationRoutes); 

// Rutas base (para verificación de salud del servidor)
app.get('/', (req, res) => {
  res.send('✅ Servidor de Rastreo Geográfico en funcionamiento.');
});


// --- 4. INICIO DEL SERVIDOR ---

app.listen(port, () => {
  console.log(`🚀 Servidor Node.js corriendo en: http://localhost:${port}`);
  
  // (Opcional: Verificar conexión a DB aquí si lo deseas)
  // const db = require('./db/db');
  // db.query('SELECT 1 + 1 AS result')
  //   .then(() => console.log('✅ Conexión a PostgreSQL/PostGIS OK.'))
  //   .catch(err => console.error('❌ Error de conexión a DB:', err.message));
});