// LocationTask.js
import * as TaskManager from 'expo-task-manager';
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ Nombre de la tarea que será registrada en el sistema operativo
const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TRACKING';

// ----------------------------------------------------------------------
// 1. DEFINICIÓN DE LA TAREA EN SEGUNDO PLANO
// ----------------------------------------------------------------------

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[TASK ERROR]', error.message);
    return;
  }
  
  if (data) {
    const { locations } = data;
    
    // Solo procesamos la ubicación más reciente
    const latestLocation = locations[0]; 
    const { latitude, longitude } = latestLocation.coords;

    console.log(`[BACKGROUND] Coordenadas Capturadas: ${latitude}, ${longitude}`);

    try {
      // Intentar enviar la ubicación a tu backend (POST /api/location)
      // La función 'api' gestiona el token JWT guardado
      const response = await api.post('/location', {
        latitud: latitude, 
        longitud: longitude,
      });

      console.log(`[BACKGROUND] Envío OK. Respuesta: ${response.data.message}`);

    } catch (apiError) {
      // Manejo de errores de red o token inválido (401)
      if (apiError.response && apiError.response.status === 401) {
        console.error('[BACKGROUND ERROR] Token inválido o expirado. Deteniendo rastreo.');
        // En un caso real, aquí deberías llamar a stopLocationTracking()
      } else {
        console.error('[BACKGROUND ERROR] Error al enviar a API:', apiError.message);
      }
    }
  }
});

// ----------------------------------------------------------------------
// 2. EXPORTACIÓN DE FUNCIONES DE GESTIÓN
// ----------------------------------------------------------------------

/**
 * Verifica si la tarea de rastreo ya está registrada.
 */
export async function isTrackingActive() {
    return TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
}

/**
 * Inicia el servicio de rastreo en segundo plano.
 * @param {number} interval - Intervalo de actualización en milisegundos.
 */
export async function startLocationTracking(interval = 600000) {
    if (await isTrackingActive()) {
        console.log("El rastreo ya está activo.");
        return;
    }

    // Requiere permisos 'Permitir siempre'
    await TaskManager.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: 4, // ACCURACY_BALANCED
        timeInterval: interval, // Intervalo de 10 minutos (600000 ms)
        showsBackgroundLocationIndicator: true, // Requerido por iOS
        deferredUpdatesInterval: interval, 
    });
    
    console.log(`Rastreo iniciado: cada ${interval/1000} segundos.`);
}

/**
 * Detiene el servicio de rastreo.
 */
export async function stopLocationTracking() {
    if (await isTrackingActive()) {
        await TaskManager.unregisterTaskAsync(LOCATION_TASK_NAME);
        console.log("Rastreo detenido.");
    }
}