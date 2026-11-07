# Documento de Contexto y Auditoría de Seguridad del Módulo de Login — SIFTC (ALZA)

> **Marco normativo principal:** ISO/IEC 27001:2022 (Anexo A, Control **A.8.5 Autenticación segura**) e ISO/IEC 27002:2022 (Numeral **8.5 Autenticación segura** y controles relacionados: **5.15**, **5.16**, **5.17**, **5.34**, **8.15**, **8.24**, **8.26**, **8.28**, **8.29**).  
> **Nota obligatoria sobre normas ISO:** Dado que ISO/IEC 27001:2022 e ISO/IEC 27002:2022 son estándares sujetos a derechos de autor sin copia oficial incrustada en este proyecto, **todo requisito atribuido a ISO/IEC 27001/27002 en este documento debe verificarse contra la copia oficial licenciada de la norma**.  
> **Guías técnicas abiertas complementarias (separadas explícitamente de ISO):** NIST SP 800-63B, OWASP ASVS v4.0.3 y especificación algorítmica de Blowfish/BCrypt.  
> **Estado del documento:** **Alcance Frontend + Contrato OpenAPI (`docs/api/openapi-v1.json`) — Actualizado con pruebas manuales y estado real de ramas** (Revisión técnica 6 de noviembre de 2026).  
> **Última actualización:** 6 de noviembre de 2026.

---

## 0. Alcance y Limitaciones de la Auditoría e Implementación

1. **Alcance exclusivo de Frontend (`frontend-siftc`):** Este documento audita y propone mejoras únicamente sobre el módulo de inicio de sesión y gestión de sesión del **Frontend**.
2. **Backend como servicio externo:** El servidor de la API es mantenido y desplegado de forma independiente por otro equipo en **Render (`https://siftc.onrender.com`)**. El equipo de Frontend no tiene acceso ni participación en ese despliegue.
3. **Eliminación y exclusión definitiva del backend local y diccionarios externos:** El backend local (`..\SIFTC`) y sus artefactos de aprovisionamiento en Docker fueron descartados y eliminados del análisis del equipo Frontend. No existe backend local ni diccionario de datos en este trabajo. La **única fuente oficial de verdad** para cualquier verificación o integración con la API es [`docs/api/openapi-v1.json`](./api/openapi-v1.json) (contrato OpenAPI 3.1.1 provisto por el servicio desplegado en Render). Los puntos de la **Sección 4.3** se formulan como preguntas de verificación y expectativas normativas para el equipo de Backend, sin afirmar la implementación interna del servidor.
4. **Fuente única de verdad del contrato de la API:** Toda verificación contra la API se rige por [`docs/api/openapi-v1.json`](./api/openapi-v1.json) (especificación OpenAPI 3.1.1 del servicio desplegado). Si cualquier documento antiguo contradice ese archivo, prevalece `docs/api/openapi-v1.json`.
5. **Restricción estricta sobre pruebas:** Todas las pruebas del Frontend son **100 % locales con datos reales o comprobaciones estructurales**. No se ejecutan pruebas de fuerza bruta, carga ni inyección contra `https://siftc.onrender.com`.
6. **Eliminación del modo simulado (mock):** El modo mock de datos y login simulado (`VITE_USE_MOCK`, `USE_MOCK`) de la primera entrega fue completamente eliminado de `src/services/api.js` y de los componentes en `main2`. Todas las llamadas del Frontend se dirigen exclusivamente contra el servicio externo en Render (`https://siftc.onrender.com`), gobernado por [`docs/api/openapi-v1.json`](./api/openapi-v1.json).

---

## 1. Resumen del Módulo de Login

### 1.1. Arquitectura y Tecnologías (Vista desde el Frontend)
* **Frontend (SPA):** React 19 + Vite 8 + React Router v7 + Axios (`src/`).
* **Servicio Backend Externo:** API REST `SIFTC.Api | v1` desplegada en `https://siftc.onrender.com/`, cuyo contrato público está definido en [`docs/api/openapi-v1.json`](./api/openapi-v1.json) y cuyas respuestas de error siguen el formato **RFC 9457 (`application/problem+json`, esquema `ProblemDetails`)**.
* **Mecanismo de Sesión:** Autenticación basada en **JWT (JSON Web Token - RFC 7519)** enviado en la cabecera HTTP `Authorization: Bearer <token>` y control de acceso basado en roles (**RBAC**) en las rutas del cliente (`src/constants/roles.js`, `src/routes/ProtectedRoute.jsx`).

### 1.2. Flujo Paso a Paso de Autenticación en el Frontend
1. **Despertar preventivo (`src/main.jsx:10` → `src/services/api.js:88-99`):** Al cargar la SPA, `despertarBackend()` envía un `GET /health` (`docs/api/openapi-v1.json:275-288`) con reintento ante arranque en frío de Render.
2. **Captura y sanitización en cliente (`src/pages/Login.jsx` → `src/constants/validaciones.js:51-248`):** Se eliminan caracteres invisibles de control (`REGEX_CONTROL_E_INVISIBLES`) y se limita la entrada a `120` caracteres para usuario/correo y `64` para contraseña.
3. **Verificación local anti-fuerza bruta (`src/pages/Login.jsx` → `src/utils/controlIntentosLogin.js:45-60`):** Consulta en `localStorage` (`siftc_seguridad_intentos_login`) si la interfaz está bloqueada temporalmente (5 min tras 10 fallos) o en enfriamiento entre clics (`800 ms`).
4. **Normalización y petición HTTP (`src/services/api.js:102-115` → `src/utils/texto.js:4-11`):**
   * El identificador se normaliza en `NFC`, sin espacios extremos y en minúsculas (`normalizarIdentificador`).
   * La contraseña se normaliza únicamente en forma canónica `NFC` sin alterar mayúsculas ni símbolos (`normalizarPassword`).
   * Se envía `POST /api/v1/auth/login` con el cuerpo JSON `{ usuario, password }`.
5. **Recepción y adaptación de la sesión (`src/services/adaptadores.js:57-93`, `src/context/AuthContext.jsx:76-118`):**
   * El servicio externo responde `HTTP 200` con el esquema `AuthResponseDto`: `{ token, expiraEn, usuario: { id, nombre, rol } }` (donde `usuario` corresponde al esquema `AuthUsuarioDto`).
   * El frontend valida la existencia de token y rol en modo *fail-closed*. Si ni la respuesta ni el token contienen un rol verificado, la sesión es rechazada. Se almacena `token` y `usuario` en `localStorage`.
6. **Autorización y expiración en el cliente (`src/services/api.js:29-56`, `src/routes/ProtectedRoute.jsx:5-24`):**
   * Antes de cada petición HTTP y al recuperar el foco de la ventana (`AuthContext.jsx:64-74`), `esTokenVigente(token)` verifica estructuralmente el token y el claim `exp`.
   * Si el token expiró o si cualquier endpoint protegido responde `HTTP 401`, el cliente limpia `localStorage` y redirige a `/login`.

### 1.3. Evidencia del Contrato OpenAPI (`docs/api/openapi-v1.json`): Qué Confirma y Qué No Confirma

* **Lo que `docs/api/openapi-v1.json` SÍ confirma:**
  1. **Únicos endpoints de identidad publicados:** Solo existen `POST /api/v1/auth/login` ([`openapi-v1.json:666-725`](./api/openapi-v1.json#L666-L725)) y `POST /api/v1/usuarios/registrar` ([`openapi-v1.json:727-825`](./api/openapi-v1.json#L727-L825)).
  2. **Inexistencia de endpoints de cierre, renovación, recuperación o MFA:** El contrato confirma que **NO existen** endpoints para `logout` (revocación de token), `refresh`, recuperación/restablecimiento de contraseña, ni segundo factor (`MFA`).
  3. **Contrato de Login (`POST /api/v1/auth/login`):**
     * Entrada (`AutenticarUsuarioCommand`, [`L829-843`](./api/openapi-v1.json#L829-L843)): `{ usuario: string, password: string }`.
     * Salida (`AuthResponseDto`, [`L844-887`](./api/openapi-v1.json#L844-L887)): `{ token: string, expiraEn: int32, usuario: AuthUsuarioDto { id: uuid, nombre: string, rol: string } }`.
     * Códigos HTTP documentados ([`L693-724`](./api/openapi-v1.json#L693-L724)): **únicamente `200 OK` y `401 Unauthorized` (`application/problem+json`, esquema `ProblemDetails`)**. No documenta `429 Too Many Requests`.
  4. **Contrato de Registro (`POST /api/v1/usuarios/registrar`):**
     * Seguridad y descripción ([`L733, 819-823`](./api/openapi-v1.json#L733)): Exige token `Bearer` y documenta *"Requiere rol Administrador. Devuelve el identificador UUID del usuario creado"*.
     * Entrada (`CrearUsuarioCommand`, [`L888-915`](./api/openapi-v1.json#L888-L915)): `{ email, password, primerNombre, primerApellido, idRol }` (declarados como `type: string` sin restricciones de longitud o patrón en el esquema; `idRol` con `format: uuid`).
     * Salida: `string (format: uuid)` con el identificador del usuario creado.
* **Lo que `docs/api/openapi-v1.json` NO confirma ni descarta (No verificable desde el Frontend):**
  1. Si el servidor desplegado aplica *rate limiting* interno o bloqueo de cuentas.
  2. Si el backend verifica el estado de la cuenta (`activo`/`inactivo`/`bloqueado`) antes de emitir el JWT.
  3. Si el backend registra una bitácora de auditoría de intentos exitosos y fallidos de login.
  4. Qué configuración interna de hash de contraseñas emplea el servidor en producción, si aplica *dummy hash* o qué reglas internas de complejidad ejecuta al registrar usuarios.
  5. Cuál es el catálogo formal de roles (el campo `rol` en `AuthUsuarioDto` es texto libre, no un `enum`).

### 1.4. Atribución Normativa Exacta: ISO/IEC 27001 y 27002 vs. NIST, OWASP y BCrypt

| Fuente normativa / técnica | Qué aporta exactamente cada fuente |
| :--- | :--- |
| **ISO/IEC 27001:2022 (Anexo A: A.8.5, A.5.15, A.5.16, A.5.17, A.5.34, A.8.15, A.8.24, A.8.26, A.8.28, A.8.29) e ISO/IEC 27002:2022 (§8.5, §5.17)**<br>*(Verificar contra la copia oficial de la norma)* | • **§8.5:** No mostrar los caracteres de la contraseña al ingresarla; validar las credenciales solo después de haber ingresado todos los datos de entrada; no mostrar mensajes de error que revelen qué parte de los datos de autenticación es correcta o incorrecta; limitar el número de intentos fallidos de inicio de sesión (bloqueo, retardos o controles adicionales); registrar intentos exitosos y fallidos; generar eventos/alertas de seguridad ante posibles ataques; desconectar sesiones tras un periodo definido de inactividad; aplicar MFA según criticidad *(verificar contra la copia oficial de la norma)*.<br>• **§5.17:** Proteger la información secreta de autenticación en tránsito y almacenamiento; exigir contraseñas de calidad acordes a la política organizacional, impedir la reutilización reciente y verificar la identidad antes de restablecer claves *(verificar contra la copia oficial de la norma)*. |
| **NIST SP 800-63B (§5.1.1.2 Memorized Secret Verifiers)** *(Estándar abierto, no ISO)* | • Fija el umbral numérico específico de **mínimo 8 caracteres** para contraseñas nuevas y soporte de al menos **64 caracteres**.<br>• Exige **comparar las nuevas contraseñas contra listas negras de contraseñas comunes, de diccionario o filtradas en brechas previas**.<br>• Exige **permitir todos los caracteres ASCII imprimibles, espacios y caracteres Unicode** sin bloquear símbolos especiales. |
| **OWASP ASVS v4.0.3** *(Estándar abierto, no ISO)* | • **V2.1.1 / V2.1.2:** Mínimo 12 caracteres recomendados (8 como mínimo aceptable) y permitir al menos 64 caracteres **sin truncamiento silencioso** (*no password truncation*).<br>• **V2.1.4:** Permitir cualquier carácter Unicode imprimible, incluidos espacios.<br>• **V2.1.7:** Validar que la contraseña nueva no figure en listas de claves comprometidas/comunes.<br>• **V2.2.1:** Controles anti-automatización contra fuerza bruta.<br>• **V3.3.1 / V3.3.2:** Invalidación de sesión al cerrar sesión y cierre por inactividad (*idle timeout*).<br>• **V3.4.1–V3.4.3:** Atributos `Secure`, `HttpOnly` y `SameSite` en cookies.<br>• **V14.4.1–V14.4.7:** Cabeceras HTTP de seguridad (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`). |
| **Especificación algorítmica de Blowfish / BCrypt** *(Limitación criptográfica, no ASVS ni ISO)* | • El algoritmo Blowfish subyacente en BCrypt procesa internamente **un máximo de 72 bytes UTF-8** y descarta silenciosamente cualquier byte adicional. Validar en el cliente que la contraseña no supere los **72 bytes UTF-8** evita el truncamiento silencioso (cumpliendo OWASP ASVS V2.1.2). |

---

## 2. Inventario de Validaciones y Controles Actuales

> **Equivalencia unificada de estados:** `Implementado` = `Cumple` · `Parcial` = `Parcial` · `No implementado` = `No cumple` · `No verificable desde el frontend` = Excluido del cálculo del Frontend por depender íntegramente del servidor externo.

| # | Control técnico evaluado | Dónde está (`archivo:línea` en Frontend u OpenAPI) | Qué hace en el Frontend / qué confirma el OpenAPI | Estado |
| :- | :--- | :--- | :--- | :---: |
| **1** | **Ocultamiento de contraseña al escribirla** | [`src/pages/Login.jsx`](../src/pages/Login.jsx) | **ISO 27002 §8.5 *(verificar contra la copia oficial de la norma)*:** `<input id="login-password">` inicia con `type="password"` (`mostrarPassword = false`) y `placeholder="••••••••"`, con botón de alternancia (`tabIndex={-1}`). Previene *shoulder surfing*. | **Implementado** |
| **2** | **Mensajes de error neutros en login (anti-enumeración)** | [`src/services/authService.js:20-31`](../src/services/authService.js#L20-L31), [`src/pages/Login.jsx`](../src/pages/Login.jsx), [`docs/api/openapi-v1.json:714-723, 1134-1170`](./api/openapi-v1.json#L714-L723) | **ISO 27002 §8.5 *(verificar contra la copia oficial de la norma)*:** Ante un `HTTP 401`, en `main2` se muestra el mensaje extraído o fallback. **Evidencia real en Render:** al intentar login con credenciales inventadas (y usuario real con clave errónea, verificado por el usuario), el servidor responde `HTTP 401` con `detail: "Token inválido o vencido"`, `code: "auth.unauthorized"`. En la rama `fix-login-mensaje-backend`, el frontend muestra dicho `detail` tal cual lo emite el backend (sin reemplazarlo artificialmente). Se mantiene como **Parcial** porque el texto del backend describe un problema de token/sesión en vez de credenciales. | **Parcial** |
| **3** | **Validación de credenciales solo al completar todos los datos de entrada** | [`src/pages/Login.jsx`](../src/pages/Login.jsx), [`docs/api/openapi-v1.json:666-692, 829-843`](./api/openapi-v1.json#L666-L692) | **ISO 27002 §8.5 *(verificar contra la copia oficial de la norma)*:** `handleSubmit` envía las credenciales a `POST /api/v1/auth/login` únicamente cuando ambos campos (`usuario` y `password`) han sido completados y validados. | **Implementado** |
| **4** | **Protección contra fuerza bruta (límite de intentos, bloqueo temporal, retardo)** | [`src/constants/validaciones.js:17-23`](../src/constants/validaciones.js#L17-L23), [`src/utils/controlIntentosLogin.js:1-96`](../src/utils/controlIntentosLogin.js#L1-L96), [`src/pages/Login.jsx`](../src/pages/Login.jsx), [`docs/api/openapi-v1.json:693-724`](./api/openapi-v1.json#L693-L724) | **ISO 27002 §8.5 *(verificar contra la copia oficial de la norma)* + OWASP ASVS V2.2.1:** El Frontend bloquea el formulario por `5 min` tras `10` intentos fallidos y aplica un *cooldown* fijo de `800 ms` en `localStorage`. Limitaciones: sin retardo progresivo (*backoff*) ni `429` en el contrato OpenAPI. | **Parcial** |
| **5** | **Registro (log) de intentos exitosos y fallidos en servidor sin guardar contraseñas** | [`src/pages/Login.jsx`](../src/pages/Login.jsx) *(solo `console.error` de diagnóstico local)* | **ISO 27002 §8.5 / A.8.15 *(verificar contra la copia oficial de la norma)*:** La bitácora de auditoría de autenticación debe residir en el servidor. Ni desde el Frontend ni desde `docs/api/openapi-v1.json` es posible verificar si el servicio en Render registra los intentos. | **No verificable desde el frontend** |
| **6** | **Alerta o evento de seguridad cuando se detecta un posible ataque** | [`src/pages/Login.jsx`](../src/pages/Login.jsx) | **ISO 27002 §8.5 / A.8.15 *(verificar contra la copia oficial de la norma)*:** El Frontend muestra advertencia visual desde el intento 7 (`UMBRAL_ADVERTENCIA`) y bloqueo en el intento 10. Las alertas de servidor hacia administradores no están expuestas en OpenAPI. | **Parcial** |
| **7** | **Contraseñas nunca en texto plano en el cliente ni en tránsito (HTTPS)** | [`.env`](../.env), [`src/services/api.js`](../src/services/api.js), [`src/pages/Login.jsx`](../src/pages/Login.jsx), [`docs/api/openapi-v1.json:5-9`](./api/openapi-v1.json#L5-L9) | **ISO 27002 §5.17 / §8.5 / A.8.24 *(verificar contra la copia oficial de la norma)*:** Todas las peticiones viajan por **HTTPS** (`https://siftc.onrender.com`) y *"Recordarme"* almacena únicamente el identificador (`alza_usuario_recordado`), jamás la contraseña. | **Implementado** |
| **8** | **Cierre de sesión por inactividad y tiempo máximo de sesión** | [`src/utils/jwt.js:46-55`](../src/utils/jwt.js#L46-L55), [`src/context/AuthContext.jsx:63-74`](../src/context/AuthContext.jsx#L63-L74), [`docs/api/openapi-v1.json:855-862`](./api/openapi-v1.json#L855-L862) | **ISO 27002 §8.5 / A.5.15 *(verificar contra la copia oficial de la norma)* + OWASP ASVS V3.3.2:** El Frontend verifica el tiempo máximo leyendo el claim numérico `exp` del JWT. **No implementa cierre por inactividad (*idle timeout*)**: si la pestaña queda inactiva, la sesión permanece abierta hasta que venza `exp`. | **Parcial** |
| **9** | **Gestión segura de sesión/token y control de acceso por rol (RBAC)** | [`src/context/AuthContext.jsx:13-61, 88-118`](../src/context/AuthContext.jsx#L88-L118), [`src/services/api.js:28-56`](../src/services/api.js#L28-L56), [`src/services/adaptadores.js:57-93`](../src/services/adaptadores.js#L57-L93), [`src/routes/ProtectedRoute.jsx:5-24`](../src/routes/ProtectedRoute.jsx#L5-L24) | **ISO 27002 §8.5 / A.5.15 / A.8.26 *(verificar contra la copia oficial de la norma)* + OWASP ASVS V3.3.1:** **Endurecido en `main2`:** 1) `AuthContext.jsx` opera en modo *fail-closed*, eliminando el rol por defecto `'Analista financiero'` y rechazando cualquier sesión sin rol verificado; 2) `jwt.js` rechaza tokens sin 3 partes, sin firma o con `alg: none`. Se mantiene como **Parcial** porque persiste en `localStorage` y no hay sincronización multi-pestaña ni endpoint de `logout` en el backend. | **Parcial** |
| **10** | **Política de calidad de contraseñas en el Frontend** | [`src/constants/validaciones.js:10-11, 221-248`](../src/constants/validaciones.js#L10-L11), [`src/services/authService.js:52-61`](../src/services/authService.js#L52-L61), [`docs/api/openapi-v1.json:888-915`](./api/openapi-v1.json#L888-L915) | **ISO 27002 §5.17 *(verificar contra la copia oficial de la norma)* + NIST SP 800-63B / OWASP ASVS V2.1.1, V2.1.2:** En login aplica longitud mínima de 6 caracteres; en registro (`CrearUsuarioCommand`) aún falta validar límite de 72 bytes UTF-8 antes del POST. | **Parcial** |
| **11** | **Autenticación multifactor (MFA)** | [`src/pages/Login.jsx`](../src/pages/Login.jsx), [`docs/api/openapi-v1.json`](./api/openapi-v1.json) | **ISO 27002 §8.5 *(verificar contra la copia oficial de la norma)*:** Confirmado tanto en la interfaz del Frontend como en `docs/api/openapi-v1.json` que no existe segundo factor de autenticación. | **No implementado** |
| **12** | **Recuperación / restablecimiento seguro de contraseña** | [`src/pages/Login.jsx`](../src/pages/Login.jsx), [`docs/api/openapi-v1.json`](./api/openapi-v1.json) | **ISO 27002 §5.17 / §8.5 *(verificar contra la copia oficial de la norma)*:** `docs/api/openapi-v1.json` confirma que no existe endpoint de recuperación por token de un solo uso; `Login.jsx` delega el restablecimiento al Administrador del sistema evitando flujos inseguros. | **Parcial** |
| **13** | **Validación de entradas en cliente, protección XSS/CSRF y cabeceras del Frontend** | [`src/constants/validaciones.js:27-248`](../src/constants/validaciones.js#L27-L248), [`src/services/authService.js:52-61`](../src/services/authService.js#L52-L61), [`index.html`](../index.html), [`vercel.json`](../vercel.json) | **ISO 27001 A.8.26 / A.8.28 *(verificar contra la copia oficial de la norma)* + NIST SP 800-63B + OWASP ASVS V2.1.4 y V14.4:** Sanitiza `identificador`, usa cabecera `Bearer`. Pendiente liberar símbolos especiales en contraseña y configurar cabeceras de hosting. | **Parcial** |
| **14** | **Secretos fuera del código y privacidad de datos personales en cliente** | [`.gitignore`](../.gitignore), [`.env.example`](../.env.example), [`src/context/AuthContext.jsx:108-111`](../src/context/AuthContext.jsx#L108-L111) | **ISO 27001 A.8.28 / A.5.34 *(verificar contra la copia oficial de la norma)*:** `.env` excluido en `.gitignore`. Cumple en código sin secretos. Parcial por almacenamiento de datos personales en `localStorage` y falta de aviso de privacidad. | **Parcial** |
| **15** | **Pruebas de seguridad en desarrollo y aceptación (Frontend)** | [`package.json`](../package.json) | **ISO 27001 A.8.29 *(verificar contra la copia oficial de la norma)*:** El Frontend no cuenta todavía con suite automatizada de pruebas de seguridad (`node --test`). | **No implementado** |

---

## 3. Matriz de Cumplimiento ISO/IEC 27001:2022 (Recalculada)

> **Metodología:** Cada ítem técnico verificable recibe: **`Cumple` = 1,0**, **`Parcial` = 0,5**, **`No cumple` = 0,0**. El ítem `#5` se excluye por residir 100 % en el servidor externo.
> $$\text{\% Cumplimiento} = \frac{(3 \times 1{,}0) + (9 \times 0{,}5) + (2 \times 0{,}0)}{14} \times 100 = \frac{7{,}5}{14} \times 100 = \mathbf{53{,}6\ \%}$$

### 3.1. Resumen Cuantitativo: Antes vs. Después de las Mejoras en `main2`

| Control ISO/IEC 27001:2022 | Nombre del Control *(verificar contra copia oficial)* | Ítems Verificables | Cumple (`1,0`) | Parcial (`0,5`) | No cumple (`0,0`) | Estado Anterior | Estado Actual (`main2`) | Justificación del Estado Conservador |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **A.8.5** | **Autenticación segura** | **10** | 3 | 6 | 1 | 60,0 % *(6,0/10)* | **60,0 %** *(6,0/10)* | Se endureció el rol (fail-closed) y filtrado de token en #9, pero se mantiene `Parcial` por persistencia en `localStorage` sin `logout` en API. |
| **A.5.15** | **Control de acceso** | **3** | 0 | 3 | 0 | 50,0 % *(1,5/3)* | **50,0 %** *(1,5/3)* | Sin cambio de puntaje: RBAC endurecido en cliente pero sin *idle timeout*. |
| **A.5.16** | **Gestión de identidades** | **1** | 0 | 1 | 0 | 50,0 % *(0,5/1)* | **50,0 %** *(0,5/1)* | Bloqueo por intentos en cliente activo; validación de cuenta activa en servidor no verificable. |
| **A.5.17** | **Información de autenticación** | **4** | 2 | 2 | 0 | 75,0 % *(3,0/4)* | **75,0 %** *(3,0/4)* | Ocultamiento (#1) y transporte HTTPS (#7) cumplen; calidad de clave (#10) y restablecimiento (#12) parciales. |
| **A.5.34** | **Privacidad y protección de PII** | **1** | 0 | 1 | 0 | 50,0 % *(0,5/1)* | **50,0 %** *(0,5/1)* | PII en `localStorage` pendiente de migrar a `sessionStorage`. |
| **A.8.15** | **Registro de eventos (*Logging*)** | **1** | 0 | 1 | 0 | 50,0 % *(0,5/1)* | **50,0 %** *(0,5/1)* | Alertas visuales en cliente; log en servidor no verificable. |
| **A.8.24** | **Uso de criptografía** | **1** | 1 | 0 | 0 | 100,0 % *(1,0/1)* | **100,0 %** *(1,0/1)* | Transporte HTTPS y ausencia de contraseñas en cliente cumplen 100 %. |
| **A.8.26** | **Requisitos de seguridad de aplicaciones** | **2** | 0 | 2 | 0 | 50,0 % *(1,0/2)* | **50,0 %** *(1,0/2)* | Sin cambios en cabeceras de hosting. |
| **A.8.28** | **Codificación segura** | **2** | 0 | 2 | 0 | 50,0 % *(1,0/2)* | **50,0 %** *(1,0/2)* | Código mock eliminado por completo (**B-12 FE** mitigado), pero ítem #13 y #14 conservan aspectos parciales. |
| **A.8.29** | **Pruebas de seguridad** | **1** | 0 | 0 | 1 | 0,0 % *(0,0/1)* | **0,0 %** *(0,0/1)* | Suite automatizada pendiente para el siguiente sprint. |
| **GLOBAL** | **Consolidado de Controles Verificables** | **14** | **3 (21,4 %)** | **9 (64,3 %)** | **2 (14,3 %)** | **53,6 %** *(7,5/14)* | **53,6 %** *(7,5/14)* | **Criterio conservador:** el porcentaje numérico se mantiene idéntico (7,5 / 14 puntos) para no sobrestimar el cumplimiento hasta que se migren tokens a `sessionStorage` y se creen las pruebas automatizadas. |

---

## 4. Brechas y Plan de Mejora

### 4.1. Brechas Identificadas en el Frontend (`frontend-siftc`)

| ID | Severidad | Brecha y Riesgo en el Frontend | Control ISO *(verificar copia oficial)* + Ref. Técnica | Solución en Frontend | Estado |
| :-: | :---: | :--- | :--- | :--- | :---: |
| **B-04 (FE)** | **ALTO** | **Política de contraseñas nuevas sin medición en bytes UTF-8 y ausencia de validación previa en `registrarUsuario()`.** | **A.5.17** · **A.8.5** · **A.8.28** *(NIST SP 800-63B / OWASP ASVS V2.1.2)* | Validar mínimo 8 caracteres y máximo 72 bytes UTF-8 en registro; en login exigir solo campo no vacío y ≤ 72 bytes. | Propuesto en backlog |
| **B-05 (FE)** | **ALTO** | **Persistencia de sesión en `localStorage` en equipos compartidos y sin sincronización entre pestañas.** | **A.8.5** · **A.5.15** · **A.8.26** *(OWASP ASVS V3.3.1)* | Migrar a `sessionStorage` y sincronizar cierre con `BroadcastChannel`. | Propuesto en backlog |
| **B-06 (FE)** | **MEDIO** | **Falta de cierre automático de sesión por inactividad (*Idle Timeout*).** | **A.8.5** · **A.5.15** *(OWASP ASVS V3.3.2)* | Implementar temporizador de 15 min de inactividad que ejecute `logout()`. | Propuesto en backlog |
| **B-07 (FE)** | **MEDIO** | **Mensaje del 401 del login dependiente del backend y cooldown fijo sin backoff.** | **A.8.5** *(OWASP ASVS V2.2.1)* | Mostrar detail del servidor o neutro; añadir backoff progresivo. | **Atendido en rama `fix-login-mensaje-backend`** |
| **B-08 (FE)** | **MEDIO** | **Restricción indebida de símbolos especiales en la contraseña en cliente.** | **A.5.17** · **A.8.28** *(NIST SP 800-63B / OWASP ASVS V2.1.4)* | Permitir cualquier carácter Unicode imprimible y espacios en la contraseña. | Propuesto en backlog |
| **B-09 (FE)** | **MEDIO** | **Ausencia de cabeceras HTTP de seguridad en el hosting del Frontend.** | **A.8.26** · **A.8.28** *(OWASP ASVS V14.4)* | Configurar cabeceras de seguridad en la plataforma que defina el líder. | Pendiente decisión del líder |
| **B-10 (FE)** | **MEDIO** | **Ausencia de pruebas automatizadas de seguridad en el Frontend.** | **A.8.29** Pruebas de seguridad | Crear suite con `node --test` para validar login y reglas criptográficas. | Propuesto en backlog |
| **B-11 (FE)** | **BAJO** | **Contraseña visible indefinidamente al activar "Mostrar contraseña".** | **A.8.5** · **A.5.17** | Ocultar contraseña automáticamente al perder foco o tras 10 segundos. | Propuesto en backlog |
| **B-12 (FE)** | **MEDIO** | **Hallazgo B-12 confirmado: Modo simulado activo por defecto cuando `VITE_USE_MOCK` no está definida.** | **A.8.28** · **A.8.5** · **A.8.26** | **Confirmado:** En las ramas `Oscar` y `main`, `USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'` evaluaba a `true` al no existir la variable en `.env`, provocando que el login aceptara cualquier credencial y que los tokens `.mock` en `localStorage` siguieran siendo válidos. **Corrección aplicada en `main2`:** eliminación de código mock, rechazo de tokens sin firma y validación fail-closed de sesión. *(Aviso: las ramas `main` y `Oscar` conservan ese comportamiento hasta integrarse la limpieza).* | **Mitigado / Cerrado en `main2`** |

---

### 4.2. Recomendaciones para el Equipo Backend (Preguntas de Verificación)

| ID Ref. | Pregunta de verificación para el equipo Backend | Riesgo asociado | Control ISO *(verificar copia oficial)* |
| :-: | :--- | :--- | :---: |
| **B-01 (BE)** | ¿`POST /api/v1/auth/login` valida que la cuenta del usuario esté en estado activo antes de emitir el JWT? | Emisión de sesiones a cuentas inactivas o suspendidas. | **A.8.5** · **A.5.15** · **A.5.16** |
| **B-02 (BE)** | Dado que [`openapi-v1.json:693-724`](./api/openapi-v1.json#L693-L724) no documenta `429`, ¿cuenta el backend con Rate Limiting ante ataques de fuerza bruta? | Ataques automatizados contra la API sin restricción en servidor. | **A.8.5** |
| **B-03 (BE)** | ¿Registra el backend en bitácora auditable cada intento de login exitoso y fallido sin guardar contraseñas? | Falta de trazabilidad forense ante incidentes. | **A.8.15** · **A.8.5** |
| **B-04 (BE)** | En [`openapi-v1.json:888-915`](./api/openapi-v1.json#L888-L915), `CrearUsuarioCommand` no declara restricciones; ¿valida el servidor longitud y formato? | Persistencia de contraseñas débiles o superiores a 72 bytes. | **A.5.17** · **A.8.28** |
| **B-05 (BE)** | ¿Se prevé algún mecanismo de revocación de tokens antes de su vencimiento? | Token robado mantiene validez hasta su tiempo de expiración. | **A.8.5** · **A.8.26** |
| **B-07 (BE)** | ¿Se ejecuta verificación con hash constante (*dummy hash*) cuando el usuario no existe para prevenir *timing attacks*? | Enumeración de usuarios por diferencias de tiempo de respuesta. | **A.8.5** |
| **B-07b (BE)** | ¿Puede el login devolver un mensaje específico de credenciales (ej: `"Usuario o contraseña incorrectos"`) en lugar de `detail: "Token inválido o vencido"`? | El mensaje actual confunde al usuario describiendo un error de sesión/token en vez de credenciales. | **A.8.5** |
| **B-09 (BE)** | ¿Qué orígenes exactos admite CORS en producción y qué cabeceras de seguridad inyecta el servidor? | Exposición a peticiones cruzadas indebidas. | **A.8.26** · **A.8.28** |

---

## 5. Mejoras Implementadas (6 de noviembre de 2026)

Con base en el historial verificado con `git log` y `git diff`, se registran las siguientes mejoras funcionales y de seguridad aplicadas en `main2` y en la rama `fix-login-mensaje-backend`:

1. **Eliminación total del modo simulado (mock):**
   * *Commits:* `07393ef`, `ebf0aff`, `a3f8f15`, `cbf9d50`, `dd1c796`.
   * *Archivos:* `src/services/api.js`, `.env.example`, scripts de diagnóstico, y eliminación física del directorio `src/services/mocks/`.
   * *Control ISO:* **A.8.28** Codificación segura, **A.8.5** Autenticación segura.
   * *Descripción:* Se eliminaron las constantes `USE_MOCK`, `FALLBACK_MOCK` y `USA_DATOS_DE_EJEMPLO`. Todas las consultas van exclusivamente al servicio de Render (`https://siftc.onrender.com/api/v1`).
2. **Rol obligatorio sin valor por defecto (*Fail-Closed*):**
   * *Commit:* `0baa291`.
   * *Archivos:* [`src/services/adaptadores.js:70,84`](../src/services/adaptadores.js#L70), [`src/context/AuthContext.jsx:88-118`](../src/context/AuthContext.jsx#L88-L118).
   * *Control ISO:* **A.8.5** Autenticación segura, **A.5.15** Control de acceso.
   * *Descripción:* Se retiró la asignación por defecto `rol: u.rol ?? 'Analista financiero'`. Si la respuesta del backend y el JWT carecen de rol válido, `AuthContext.login` lanza una excepción y no guarda la sesión.
3. **Filtro de tokens mal formados o con `alg: none` en `jwt.js` (Comprobación Estructural):**
   * *Commit:* `0baa291`.
   * *Archivos:* [`src/utils/jwt.js:18-55`](../src/utils/jwt.js#L18-L55).
   * *Control ISO:* **A.8.5** Autenticación segura, **A.8.28** Codificación segura.
   * *Descripción:* `decodificarJwt` y `esTokenVigente` exigen exactamente 3 segmentos, rechazan encabezados con `alg: 'none'` y descartan tokens sin firma (tercer segmento < 8 caracteres). **Se aclara expresamente que es una comprobación estructural de sanidad en el cliente, NO una verificación criptográfica de firma: la firma criptográfica solo la verifica el servidor**.
4. **Catálogo de dimensiones acotado al límite del OpenAPI:**
   * *Commit:* `0baa291`.
   * *Archivos:* [`src/services/api.js:202-207`](../src/services/api.js#L202-L207).
   * *Control ISO:* **A.8.28** Codificación segura.
   * *Descripción:* Se corrigió `getMetricas({ size: 500 })` a `size: 100`, cumpliendo la restricción `1..100` del parámetro `size` en `GET /api/v1/metricas` ([`openapi-v1.json:373`](./api/openapi-v1.json#L373)) que causaba error HTTP 400.
5. **Pantalla de login fija en tema claro sin botón de alternancia:**
   * *Commit:* `6d002fd`.
   * *Archivos:* [`src/pages/Login.jsx`](../src/pages/Login.jsx), [`src/styles/Login.css`](../src/styles/Login.css), [`src/styles/tema.css`](../src/styles/tema.css).
   * *Control ISO:* **A.8.28** Codificación segura.
   * *Descripción:* El panel del formulario de inicio de sesión se fijó en tema claro (`background-color: #FFFFFF`), se removió el componente flotante `<BotonTema />` de `/login` y se purgaron las reglas de tema oscuro para `.login-*` en `tema.css`.
6. **Gráfica financiera sin datos falsos:**
   * *Commit:* `cc52e23`, `0baa291`.
   * *Archivos:* [`src/components/charts/FinancialChart.jsx`](../src/components/charts/FinancialChart.jsx).
   * *Control ISO:* **A.8.28** Codificación segura.
   * *Descripción:* Inicia con `serieOhlc = []` (sin `mockOhlcData`) y presenta estados explícitos de carga y error si la consulta al servidor no devuelve datos históricos.
7. **Exposición del detalle real en error HTTP 401 (Rama `fix-login-mensaje-backend`):**
   * *Commit:* `3eac167` (rama `fix-login-mensaje-backend`, pendiente de integración a `main2`).
   * *Archivos:* [`src/services/authService.js:20-31`](../src/services/authService.js#L20-L31), [`src/pages/Login.jsx:219`](../src/pages/Login.jsx#L219).
   * *Control ISO:* **A.8.5** Autenticación segura.
   * *Descripción:* Cuando `POST /api/v1/auth/login` responde `HTTP 401`, la función `extraerMensajeError` muestra el texto `data.detail` tal cual lo emite el backend (ProblemDetails), sin sobreescribirlo con `"Usuario o contraseña incorrectos."` ni comparar `"Token inválido o vencido"`.

---

## 6. Pruebas Realizadas y Resultados Reales

### 6.1. Verificaciones Automatizadas Ejecutadas por el Agente
* **Análisis estático de código:** `npm run lint` → **0 errores** (`EXIT_LINT=0`).
* **Compilación de producción:** `npm run build` → **0 errores**, compilación limpia por Vite en 844 ms (`dist/` generado correctamente).
* **Búsqueda de residuos de simulación:** `git grep -n -i -E "mock|simulad|localhost|7123|USE_MOCK" -- src` → **0 resultados** (`EXIT_GREP=1`).

### 6.2. Pruebas Manuales Funcionales (6 de noviembre de 2026)
*Las siguientes pruebas fueron ejecutadas manualmente por el usuario (Oscar) contra el servicio desplegado en Render:*

1. **Login con usuario real (ejecutada por el usuario):** Ingreso exitoso; la sesión se inicia correctamente, se recibe el token y se redirige al tablero.
2. **Credenciales inventadas (ejecutada por el usuario):** Rechazadas por el servidor; la interfaz muestra el error de autenticación y registra el intento fallido.
3. **Usuario real con contraseña equivocada (ejecutada por el usuario):** Rechazada por el servidor con `HTTP 401`.
4. **Tablero, ranking y gráficas (ejecutada por el usuario):** Realizan peticiones HTTP reales a Render; los datos mostrados en pantalla coinciden exactamente con las respuestas inspeccionadas en las herramientas de red del navegador.
5. **Comportamiento sin conexión (ejecutada por el usuario):** Al simular pérdida de red o servidor no disponible, la interfaz informa correctamente que no se pudo conectar con el servidor para cargar las entidades.
6. **Mensaje 401 y Comparador (ejecutada por el usuario):** Se comprobó que el mensaje del 401 de la rama `fix-login-mensaje-backend` y el comparador integrado en `main2` funcionan de forma correcta.

> **Observación del usuario aún sin diagnosticar:** En la gráfica OHLC, solo el periodo trimestral se visualiza adecuadamente; en diario y otros periodos se observan líneas casi invisibles. La causa permanece sin determinar (hipótesis pendiente de verificar con la respuesta cruda del servidor: velas donde apertura, máximo, mínimo y cierre tienen valores idénticos).

---

## 7. Decisiones de Diseño y Pendientes

1. **Tema claro definitivo en Login:**
   * La pantalla de inicio de sesión queda fijada en tema claro sin botón de alternancia de tema, garantizando legibilidad y consistencia de marca.
2. **Manejo de respuestas HTTP 401 en Login:**
   * Ante un 401 el login muestra el mensaje `detail` que entrega el backend. Hoy el servidor responde `"Token inválido o vencido"` ante credenciales incorrectas, texto que describe una sesión y no credenciales: queda como pregunta pendiente para el equipo backend si pueden emitir un mensaje específico de credenciales.
3. **Regla arquitectural de nombres de campo:**
   * Regla oficial del proyecto: el frontend debe utilizar exactamente los mismos nombres de campo que el OpenAPI. Hoy `src/services/adaptadores.js` renombra campos a snake_case; el cambio queda como tarea técnica del siguiente sprint, coordinado con los componentes consumidores y el comparador.
4. **Catálogo formal de roles:**
   * La lista real de roles y sus identificadores UUID en Render debe solicitarse formalmente al equipo backend, ya que el OpenAPI no contiene una lista enumerada de roles.

### 7.1. Integración de la Rama Reynel (Pendiente)
Tras una inspección técnica en solo lectura de la rama `origin/Reynel` frente a `main2`, se establecen los siguientes hallazgos y plan de acción:

* **Conflictos detectados (5 archivos):** [`src/components/layout/Layout.jsx`](../src/components/layout/Layout.jsx), [`src/pages/Login.jsx`](../src/pages/Login.jsx), [`src/routes/AppRouter.jsx`](../src/routes/AppRouter.jsx), [`src/styles/Login.css`](../src/styles/Login.css), [`src/styles/tema.css`](../src/styles/tema.css).
* **Dependencia de simulación:** `src/services/adminService.js` mantiene `USE_MOCK` activo por defecto (`true` si no existe la variable) y utiliza datos demo persistidos en `localStorage`.
* **Discrepancia con el contrato OpenAPI:** Únicamente `crearUsuario` (`POST /api/v1/usuarios/registrar`) existe en el OpenAPI. No existen los endpoints `GET /api/v1/usuarios`, `PUT /api/v1/usuarios/{id}`, `PATCH /api/v1/usuarios/{id}/estado` ni `GET/PUT /api/v1/parametros/pesos` (en el OpenAPI solo existe `POST /api/v1/parametros/actualizar-umbral`, para umbrales, sin cuerpo documentado).
* **Roles y UUIDs locales:** `src/constants/roles.js` en su rama introduce 6 UUIDs fijos tomados de un script SQL de base de datos local que no coinciden con Render.
* **Archivo `.env` versionado:** Su rama versionó erróneamente el archivo `.env`, a pesar de que `main2` lo tiene ignorado en `.gitignore`.
* **Login:** Su `Login.jsx` conserva el mensaje fijo de error y la validación estricta de símbolos.
* **Plan de integración propuesto:**
  1. Pedir a Reynel que retire `.env` del seguimiento (`git rm --cached .env`), elimine la lógica de mock y `USE_MOCK` de `adminService.js` y remueva los UUIDs locales inventados.
  2. Tomar primero los artefactos visuales limpios (`RutaPendiente.jsx`, `Admin.css`, validaciones puras de usuario) y habilitar la creación real de usuarios con `POST /api/v1/usuarios/registrar`.

---

## 8. Pendientes para el Siguiente Sprint

* [ ] Renombrar campos al nombre del OpenAPI en `adaptadores.js` y componentes consumidores (**A.8.28**).
* [ ] Integrar rama `fix-login-mensaje-backend` y consultar al backend por mensaje neutro de credenciales (**A.8.5**).
* [ ] Implementar cierre automático de sesión por inactividad (*idle timeout* de 15 min) (**A.8.5**, **A.5.15**).
* [ ] Migrar almacenamiento de sesión a `sessionStorage` y sincronizar cierre con `BroadcastChannel` (**A.8.5**, **A.5.15**, **A.8.26**).
* [ ] Ajustar política de contraseña en registro (mínimo 8 y máximo 72 bytes UTF-8) y liberar símbolos permitidos (**A.5.17**, **A.8.28**).
* [ ] Configurar cabeceras de seguridad HTTP una vez el líder defina el hosting definitivo (**A.8.26**, **A.8.28**).
* [ ] Construir suite de pruebas automatizadas locales de seguridad en el frontend con `node --test` (**A.8.29**).
* [ ] Diagnosticar causa de visualización de velas en gráficas diaria y mensual (**A.8.28**).
* [ ] Confirmar con el equipo backend la lista oficial de roles y sus UUIDs en Render (**A.8.5**, **A.5.16**).
* [ ] Ejecutar plan de integración por pasos de la rama Reynel (**A.8.28**, **A.8.5**).

---

## 9. Glosario Breve de Términos de Seguridad

* **BCrypt y límite de 72 bytes:** Función de hashing de contraseñas basada en Blowfish. Procesa únicamente los primeros **72 bytes UTF-8** de una contraseña; longitudes superiores se truncan silenciosamente.
* **BroadcastChannel API:** Interfaz nativa del navegador para comunicar mensajes entre distintas pestañas del mismo origen.
* **CSRF (*Cross-Site Request Forgery*):** Ataque que fuerza al navegador a enviar peticiones no deseadas valiéndose de credenciales automáticas.
* **Enumeración de usuarios:** Comportamiento que revela si una cuenta existe o no mediante mensajes de error dispares o diferencias temporales.
* **Fail-Closed:** Principio de diseño de seguridad en el que, ante cualquier fallo de validación o dato faltante, el acceso se deniega por defecto.
* **Idle Timeout:** Cierre automático de sesión tras un periodo configurado sin actividad del usuario.
* **JWT (*JSON Web Token* - RFC 7519):** Estándar de token firmado que transmite claims codificados en Base64URL.
* **NFC (*Normalization Form Canonical Composition*):** Forma canónica Unicode que garantiza consistencia de representación binaria para caracteres acentuados y la letra `ñ`.
* **RBAC (*Role-Based Access Control*):** Control de acceso determinado por el rol asignado al usuario.
* **RFC 9457 (*Problem Details for HTTP APIs*):** Estándar de la API para devolver detalles estructurados de error HTTP (`type`, `title`, `status`, `detail`, `instance`).
