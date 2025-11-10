// mobile_simulator.js
const axios = require('axios');
require('dotenv').config();

const API_BASE = process.env.BACKEND_URL;
const SIM_PHONE = process.env.SIM_PHONE;
let DEVICE_JWT = null; // Almacenará el token de acceso JWT

// --- Coordenadas de Rastreo ---
// Definimos una ruta simulada (desde el punto A al punto B)
const route = [
    { lat: 4.6548, long: -74.0543 }, // Punto de inicio (Bogotá, cerca al centro)
    { lat: 4.6548, long: -74.0530 },
    { lat: 4.6549, long: -74.0520 },
    { lat: 4.6555, long: -74.0515 },
    { lat: 4.6560, long: -74.0510 },
    { lat: 4.6565, long: -74.0505 },
    { lat: 4.6570, long: -74.0500 }, // Punto final (Se habrá movido unos metros)
];
let currentStep = 0;

/**
 * 1. Simula la primera fase de autenticación (Envía el número de teléfono).
 */
async function registerDevice() {
    console.log(`[PASO 1] Iniciando registro para ${SIM_PHONE}...`);
    try {
        const response = await axios.post(`${API_BASE}/auth/register`, {
            numero_telefono: SIM_PHONE
        });
        console.log(`[PASO 1 OK] ${response.data.message}`);
        // El código de verificación simulado se imprime en la consola del backend.
        return response.data.simulated_code; 
    } catch (error) {
        console.error("[ERROR EN REGISTRO]", error.response ? error.response.data.message : error.message);
        return null;
    }
}

/**
 * 2. Simula la verificación de código (Obtiene el JWT).
 */
async function verifyCode(code) {
    console.log(`\n[PASO 2] Verificando código ${code}...`);
    try {
        const response = await axios.post(`${API_BASE}/auth/verify`, {
            numero_telefono: SIM_PHONE,
            codigo_verificacion: code
        });
        DEVICE_JWT = response.data.token_acceso;
        console.log(`[PASO 2 OK] Token JWT obtenido. Dispositivo ID: ${response.data.id_dispositivo}`);
    } catch (error) {
        console.error("[ERROR EN VERIFICACIÓN]", error.response ? error.response.data.message : error.message);
    }
}

/**
 * 3. Envía una ubicación al backend usando el JWT (Rastreo).
 */
async function sendLocation(lat, long) {
    if (!DEVICE_JWT) {
        console.error("No hay JWT. Imposible enviar ubicación.");
        return;
    }
    
    try {
        const response = await axios.post(`${API_BASE}/location`, {
            latitud: lat,
            longitud: long
        }, {
            headers: {
                // El token debe ir en el encabezado Authorization
                Authorization: `Bearer ${DEVICE_JWT}`
            }
        });
        console.log(`[RASTREO OK] Coordenadas: ${lat}, ${long}. Respuesta: ${response.data.message}`);
    } catch (error) {
        console.error(`[ERROR RASTREO] Falló el envío de (${lat}, ${long}). ¿El token expiró?`, error.response ? error.response.data.message : error.message);
    }
}

/**
 * Ciclo principal de simulación.
 */
async function startSimulation() {
    // A. Autenticación (Solo se hace una vez)
    const code = await registerDevice();
    if (!code) return;

    // Actualiza el .env con el código y ejecuta de nuevo si quieres simular el flujo en dos pasos
    // Para esta simulación rápida, asumimos que el código fue "enviado" (impreso en consola del backend)
    // NOTA: Debes ir a la consola de tu backend para ver el código impreso y pegarlo aquí
    const verificationCode = code; 
    await verifyCode(verificationCode);

    if (!DEVICE_JWT) {
        console.log("No se pudo obtener el JWT. Terminando simulación.");
        return;
    }

    // B. Ciclo de Rastreo (Simulación de movimiento)
    console.log("\n[INICIANDO RASTREO SIMULADO]");
    const trackingInterval = setInterval(() => {
        if (currentStep >= route.length) {
            console.log("\n[FIN RASTREO] Ruta completada.");
            clearInterval(trackingInterval);
            return;
        }

        const point = route[currentStep];
        sendLocation(point.lat, point.long);
        currentStep++;

    }, 3000); // Envía una ubicación cada 3 segundos
}

startSimulation();