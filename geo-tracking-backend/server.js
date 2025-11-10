// server.js
const express = require('express');
const cors = require('cors'); 
require('dotenv').config(); 

const app = express();
const port = process.env.PORT || 3000;

// --- 1. MIDDLEWARES GLOBALES ---

// ✅ CORRECCIÓN CLAVE: Habilitar CORS de manera explícita para aceptar todos los orígenes
const corsOptions = {
    origin: '*', // Permite todos los orígenes durante el desarrollo
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions)); // Aplicar la configuración de CORS

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// --- 2. IMPORTACIÓN DE RUTAS ---

const authRoutes = require('./routes/authRoutes');
const locationRoutes = require('./routes/locationRoutes');
const historyRoutes = require('./routes/historyRoutes');
const adminRoutes = require('./routes/adminRoutes');
const zoneRoutes = require('./routes/zoneRoutes');
const deviceAdminRoutes = require('./routes/deviceAdminRoutes');


// --- 3. CONEXIÓN DE RUTAS BASE ---\r

app.use('/api/auth', authRoutes); 
app.use('/api/location', locationRoutes); 
app.use('/api/admin', adminRoutes); 
app.use('/api/admin', deviceAdminRoutes);
app.use('/api/history', historyRoutes); 
app.use('/api/zones', zoneRoutes); 

app.get('/', (req, res) => {
    res.send('✅ Servidor de Rastreo Geográfico en funcionamiento.');
});


// --- 4. INICIO DEL SERVIDOR ---

app.listen(port, () => {
    console.log(`🚀 Servidor Node.js corriendo en: http://localhost:${port}`);
});