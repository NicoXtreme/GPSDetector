// api.js

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ AJUSTA ESTA URL a la IP de tu computadora (si estás en LAN) o a la URL pública de tu servidor.
const API_BASE_URL = 'http://192.168.1.8:3000/api'; 

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Interceptor para inyectar el token de acceso (JWT) a las peticiones protegidas.
 * Tu backend espera el formato: Authorization: Bearer <token>
 */
api.interceptors.request.use(
    async (config) => {
        // En un proyecto real se usaría 'react-native-keychain' o 'expo-secure-store', 
        // pero AsyncStorage sirve para prototipos iniciales.
        const token = await AsyncStorage.getItem('deviceToken');
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * Función para guardar el token después de la verificación.
 * @param {string} token - El JWT de acceso.
 */
export const saveToken = async (token) => {
    await AsyncStorage.setItem('deviceToken', token);
};

/**
 * Función para eliminar el token (Logout).
 */
export const removeToken = async () => {
    await AsyncStorage.removeItem('deviceToken');
};


export default api;