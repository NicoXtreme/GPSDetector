import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Button, ActivityIndicator, Alert, Platform } from 'react-native';
import api, { saveToken, removeToken } from './api'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location'; 
import * as TaskManager from 'expo-task-manager'; 

// --- CONSTANTES DE CONFIGURACIÓN ---
const LOCATION_TRACKING_TASK = 'location-tracking-task';
const TRACKING_INTERVAL = 10000; // 10 segundos

// --------------------------------------------------------------------------
// I. TAREA DE RASTREO EN SEGUNDO PLANO (Background Task)
// --------------------------------------------------------------------------
TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }) => {
    if (error) {
        console.error("Error en la tarea de segundo plano:", error.message);
        return;
    }
    if (data && data.locations) {
        const location = data.locations[0]; 
        
        if (location) {
            const { latitude, longitude } = location.coords;
            
            try {
                const token = await AsyncStorage.getItem('deviceToken');
                
                if (!token) {
                    // Detener la tarea si el token no existe
                    if (await TaskManager.isTaskRegisteredAsync(LOCATION_TRACKING_TASK)) {
                        await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
                    }
                    return;
                }
                
                await api.post('/location', {
                    latitud: latitude,
                    longitud: longitude,
                });
                
                console.log(`[BACKGROUND] Ubicación enviada OK. Lat: ${latitude}, Lon: ${longitude}`);
                
            } catch (apiError) {
                console.error(`[BACKGROUND] Error al enviar a API: ${apiError.message}. Revisar conexión/token.`);
            }
        }
    }
});


// --------------------------------------------------------------------------
// II. COMPONENTE PRINCIPAL DE LA APP
// --------------------------------------------------------------------------
export default function App() {
    // Estado de la aplicación: 'loading', 'unverified', 'verifying', 'logged'
    const [appState, setAppState] = useState('loading'); 
    
    // Estados para la Autenticación
    const [phoneNumber, setPhoneNumber] = useState('');      
    const [verificationCode, setVerificationCode] = useState(''); 
    
    // ✅ NUEVO ESTADO: Para mostrar el código simulado al usuario
    const [simulatedCodeDisplay, setSimulatedCodeDisplay] = useState(null); 
    
    // Estados de UI y control
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isTrackingActive, setIsTrackingActive] = useState(false);
    
    // --- Lógica de Carga de Estado ---
    useEffect(() => {
        const checkLoginStatus = async () => {
            const token = await AsyncStorage.getItem('deviceToken');
            
            if (token) {
                setAppState('logged');
                const trackingStatus = await TaskManager.isTaskRegisteredAsync(LOCATION_TRACKING_TASK);
                setIsTrackingActive(trackingStatus);
            } else {
                setAppState('unverified');
            }
        };
        checkLoginStatus();
    }, []);

    // --- Lógica de Permisos de Ubicación ---
    const requestLocationPermissions = async () => {
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== 'granted') {
            Alert.alert("Permisos de Ubicación", "Se requiere permiso de ubicación en primer plano para usar esta app.");
            return false;
        }

        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
            Alert.alert(
                "Permisos de Ubicación en Segundo Plano", 
                "Es CRÍTICO que el permiso de ubicación sea 'Permitir siempre' para que el rastreo funcione en segundo plano. Por favor, cambia la configuración manualmente.",
                [{ text: "OK" }]
            );
            return false;
        }
        return true;
    };


    // --- 1. REGISTRO (POST /api/auth/register) ---
    const handleRegister = async () => {
        if (!phoneNumber || phoneNumber.length < 8) {
            setMessage('El número de teléfono es obligatorio y debe ser válido.');
            return;
        }
        
        setLoading(true);
        setMessage('');
        setSimulatedCodeDisplay(null); // Limpiar código anterior
        
        try {
            const response = await api.post('/auth/register', { 
                telefono: phoneNumber,
                nombre_dispositivo: Platform.OS, 
            });
            
            // ✅ CORRECCIÓN CLAVE: Capturar el código de la respuesta y mostrarlo
            const simulatedCode = response.data.simulated_code;
            
            if (simulatedCode) {
                // Solo lo almacenamos para mostrarlo, NO para pre-llenar el input.
                setSimulatedCodeDisplay(simulatedCode);
                // NOTA: setVerificationCode(''); se mantiene vacío para que el usuario ingrese el código.
            }
            
            setAppState('verifying'); 
            setMessage('Código enviado. Por favor, ingrésalo manualmente.');
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al solicitar el código. Verifique su IP y Backend.';
            setMessage(msg);
            console.error('Error de Registro:', error);
        } finally {
            setLoading(false);
        }
    };


    // --- 2. VERIFICACIÓN (POST /api/auth/verify) ---
    const handleVerify = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setMessage('El código de verificación debe ser de 6 dígitos.');
            return;
        }
        setLoading(true);
        setMessage('');
        try {
            const response = await api.post('/auth/verify', {
                telefono: phoneNumber,
                codigo_verificacion: verificationCode,
            });

            const token = response.data.deviceToken;
            await saveToken(token); 
            
            setAppState('logged');
            setMessage('Verificación exitosa. Dispositivo activado.');
            setVerificationCode(''); // Limpiar el código
            setSimulatedCodeDisplay(null); // Limpiar el código de pantalla

        } catch (error) {
            const msg = error.response?.data?.message || 'Error de verificación. Código incorrecto o expirado.';
            setMessage(msg);
            console.error('Error de Verificación:', error);
        } finally {
            setLoading(false);
        }
    };


    // --- 3. GESTIÓN DEL RASTREO (Tracking) ---
    const handleStartTracking = async () => {
        if (isTrackingActive) return;

        const hasPermissions = await requestLocationPermissions();
        if (!hasPermissions) {
            setMessage("No se puede iniciar el rastreo sin permisos 'Permitir siempre'.");
            return;
        }
        
        try {
            await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: TRACKING_INTERVAL,
                distanceInterval: 0, 
                showsBackgroundLocationIndicator: true, 
                foregroundService: { 
                    notificationTitle: "Rastreo GPS Activo",
                    notificationBody: "Tu ubicación está siendo monitoreada en segundo plano.",
                    notificationColor: "#4F46E5",
                },
            });

            setIsTrackingActive(true);
            setMessage('Rastreo iniciado exitosamente.');
        } catch (error) {
            console.error("Error al iniciar el rastreo:", error);
            setMessage('Error al iniciar el rastreo. Revise su configuración.');
        }
    };

    const handleStopTracking = async (shouldLogout = false) => {
        if (await TaskManager.isTaskRegisteredAsync(LOCATION_TRACKING_TASK)) {
            await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
            setIsTrackingActive(false);
            setMessage('Rastreo detenido.');
        }
        
        if (shouldLogout) {
            await removeToken(); 
            setPhoneNumber('');
            setVerificationCode('');
            setAppState('unverified');
            setMessage('Sesión cerrada y dispositivo desvinculado.');
        }
    };


    // --------------------------------------------------------------------------
    // III. RENDERIZADO DE LA INTERFAZ
    // --------------------------------------------------------------------------

    if (appState === 'loading') {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.messageText}>Cargando estado...</Text>
            </View>
        );
    }
    
    // Pantalla de Registro (Paso 1)
    if (appState === 'unverified') {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Iniciar Servicio</Text>
                <Text style={styles.subtitle}>Ingresa tu número para recibir un código de verificación.</Text>
                
                <TextInput
                    style={styles.input}
                    placeholder="Número de Teléfono (ej. +57310xxxxxxx)"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber} 
                    maxLength={15}
                    editable={!loading}
                />

                <Button 
                    title={loading ? "Enviando Código..." : "Registrar y Enviar Código"} 
                    onPress={handleRegister} 
                    disabled={loading}
                    color="#4F46E5"
                />
                
                <Text style={styles.messageText}>{message}</Text>
            </View>
        );
    }
    
    // Pantalla de Verificación (Paso 2)
    if (appState === 'verifying') {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Verificación</Text>
                <Text style={styles.subtitle}>Ingresa el código que **recibiste por SMS** en el {phoneNumber}</Text>
                
                {/* ✅ Muestra el código simulado devuelto por el backend */}
                {simulatedCodeDisplay && (
                    <View style={styles.codeDisplayBox}>
                        <Text style={styles.codeLabel}>CÓDIGO SMS SIMULADO:</Text>
                        <Text style={styles.codeValue}>{simulatedCodeDisplay}</Text>
                        <Text style={styles.codeHint}>(Cópialo y pégalo o escríbelo abajo)</Text>
                    </View>
                )}
                {/* ---------------------------------------------------- */}

                <TextInput
                    style={styles.input}
                    placeholder="Código de Verificación (6 dígitos)"
                    keyboardType="numeric"
                    value={verificationCode}
                    onChangeText={setVerificationCode} 
                    maxLength={6}
                    editable={!loading}
                />

                <Button 
                    title={loading ? "Verificando..." : "Verificar Código"} 
                    onPress={handleVerify} 
                    disabled={loading}
                    color="#4F46E5"
                />
                
                <Text style={styles.messageText}>{message}</Text>
            </View>
        );
    }
    
    // Pantalla Principal (Logged)
    if (appState === 'logged') {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Rastreo GPS Activo</Text>
                <Text style={styles.subtitle}>Estado: **{isTrackingActive ? 'MONITOREANDO' : 'DETENIDO'}**</Text>
                
                <View style={styles.buttonContainer}>
                    <Button 
                        title={isTrackingActive ? "Detener Rastreo" : "Iniciar Rastreo"} 
                        onPress={isTrackingActive ? () => handleStopTracking(false) : handleStartTracking}
                        color={isTrackingActive ? "#F59E0B" : "#4F46E5"}
                    />
                </View>
                
                <View style={styles.buttonContainer}>
                    <Button 
                        title="Cerrar Sesión y Desvincular" 
                        onPress={() => handleStopTracking(true)} 
                        color="#DC2626" 
                    />
                </View>

                <Text style={styles.messageText}>{message}</Text>
            </View>
        );
    }
}

// --- ESTILOS ---

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    center: {
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#374151',
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
        color: '#6B7280',
    },
    input: {
        height: 40,
        borderColor: '#D1D5DB',
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 15,
        paddingHorizontal: 10,
        width: '100%',
        backgroundColor: '#F9FAFB',
    },
    messageText: {
        marginTop: 20,
        textAlign: 'center',
        color: '#DC2626',
    },
    buttonContainer: {
        width: '100%',
        marginVertical: 5,
    },
    // ✅ NUEVOS ESTILOS para la visualización del código simulado
    codeDisplayBox: {
        backgroundColor: '#E0F2FE', 
        borderColor: '#0C4A6E',
        borderWidth: 1,
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
        width: '100%',
        alignItems: 'center',
    },
    codeLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0C4A6E',
        marginBottom: 5,
    },
    codeValue: {
        fontSize: 32,
        fontWeight: 'extrabold',
        color: '#1E40AF', 
        letterSpacing: 5,
        marginBottom: 5,
    },
    codeHint: {
        fontSize: 10,
        color: '#4B5563',
    }
});