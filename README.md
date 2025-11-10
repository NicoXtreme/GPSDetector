# 🚀 Características Principales

## 🛡️ 1. Sistema de Autenticación y Seguridad

- **Registro por Teléfono:**  
  Proceso de registro de dispositivos utilizando un número de teléfono, con simulación de envío de código de verificación (OTP).

- **Autenticación JWT:**  
  Implementación de **JSON Web Tokens (JWT)** con **JTI (JWT ID)** para la autenticación de dispositivos y administradores, permitiendo la **revocación de tokens**.

- **Hash de Contraseñas:**  
  Uso de **bcrypt** para el almacenamiento seguro de contraseñas de administradores.

- **Middleware de Protección:**  
  Rutas protegidas para:
  - Dispositivos → `authMiddleware`
  - Administradores → `authAdminMiddleware`

---

## 📍 2. Rastreo y Geofencing

- **Captura en Segundo Plano (Mobile):**  
  La aplicación móvil (**Expo/React Native**) utiliza  
  `expo-task-manager` y `expo-location` para capturar y enviar la ubicación del dispositivo al backend a intervalos regulares, incluso cuando la aplicación está cerrada.

- **Registro Geoespacial:**  
  Uso de la extensión **PostGIS** en **PostgreSQL** para almacenar las ubicaciones como objetos `GEOMETRY(Point, 4326)`, optimizando las **consultas espaciales**.

- **Geofencing Asíncrono:**  
  Servicio de fondo (`geofencingService.js`) que calcula de manera asíncrona si la nueva ubicación capturada resulta en un evento de **ENTRADA** o **SALIDA** de una zona definida.

- **Historial de Alertas:**  
  Almacenamiento de alertas generadas por Geofencing en la tabla **`Alertas_Historial`**.

---

## 🖥️ 3. Panel de Administración (Web)

- **Gestión de Zonas:**  
  Endpoints para la **creación, actualización, listado y eliminación** de zonas de Geofencing (`Zonas_Geofencing`).

- **Visualización en Vivo:**  
  Rutas para consultar la **última ubicación** de todos los dispositivos activos:  
