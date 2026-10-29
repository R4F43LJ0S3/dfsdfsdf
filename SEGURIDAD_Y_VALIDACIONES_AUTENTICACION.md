# Estándares de Seguridad, Codificación UTF-8 y Validaciones de Autenticación — ALZA (SIFTC)

> **Proyecto:** Sistema de Información Financiera de Trazabilidad y Competitividad (ALZA / SIFTC)  
> **Módulo:** Seguridad, Autenticación JWT y Sanitización de Entradas (`HU-FE-08` / Estándares transversales)  
> **Normativas aplicadas:** OWASP ASVS v4.0 (Secciones 2.1, 2.2 y 5.1), NIST SP 800-63B (§5.1.1.2), RFC 5321 / RFC 5322 (Correo electrónico), Especificación Criptográfica BCrypt y Diccionario de Datos SIFTC  
> **Fecha:** 27 de octubre de 2026

---

## 1. Visualización UTF-8 (`"Juan P?rez"` → `"Juan Pérez"`) y Buenas Prácticas de Sensibilidad

### 1.1. ¿Por qué aparecía `"Juan P?rez"` en pantalla y cómo se corrigió?
El problema en la interfaz no provenía de React (que usa `<meta charset="UTF-8" />`), sino de **tres puntos en la cadena de datos**:
1. **Codificación en Base de Datos (causa original):** Al cargar inicialmente la semilla SQL desde PowerShell 5.1 por tubería estándar (`|`), Windows transmitió caracteres acentuados en codificación OEM/CP1252 en lugar de UTF-8, guardando literalmente `P?rez` en PostgreSQL. Se corrigió forzando `SET client_encoding = 'UTF8';` y ejecutando el archivo directamente dentro del contenedor (`psql -f`).
2. **Decodificación Base64URL de JWT (`src/utils/jwt.js`):** Los tokens JWT omiten el relleno `=` al final del bloque Base64URL. Cuando un nombre lleva caracteres UTF-8 multibyte (`é`, `ñ`, `ó`), la longitud del payload puede no ser múltiplo de 4, haciendo fallar `atob()` si no se restaura el padding `=` y no se decodifica con `TextDecoder('utf-8')`.
3. **Sesión antigua en caché (`src/context/AuthContext.jsx`):** Aunque PostgreSQL ya devolvía `"Juan Pérez"`, el navegador seguía leyendo el objeto `usuario` guardado horas antes en `localStorage`. Se añadió `tieneTextoCorrupto()` al inicializar `AuthContext`: si detecta el carácter de reemplazo `U+FFFD` o un `?` incrustado entre letras (`P?rez`), repara el nombre desde el JWT UTF-8 o invalida la sesión antigua para obligar una carga limpia.

---

### 1.2. Verificación de Buenas Prácticas: ¿Qué debe ser sensible y qué NO al autenticarse?

De acuerdo con **OWASP Authentication Cheat Sheet**, **NIST SP 800-63B** y **RFC 5321**, quitar la sensibilidad indiscriminadamente en todos los campos sería una mala práctica; la regla correcta en ingeniería de software financiero diferencia estrictamente **identificador** vs. **secreto**:

| Campo / Dato | ¿Sensible a mayúsculas? | ¿Sensible a tildes / `ñ` / símbolos? | Norma y justificación técnica aplicada |
| :--- | :---: | :---: | :--- |
| **Correo o Usuario (`identificador`)** | **No** *(Case-Insensitive)* | **Sí** *(Estricto)* | **Estándar correcto (OWASP / RFC 5321):** `Analista@SIFTC.EDU.CO` y `analista@siftc.edu.co` representan el mismo buzón (el propio backend guarda `email.Trim().ToLowerInvariant()`). Sin embargo, **no** se eliminan tildes ni se transforma `ñ` → `n`. |
| **Contraseña (`password`)** | **Sí** *(100% Case-Sensitive)* | **Sí** *(100% Estricto)* | **Estándar obligatorio (NIST SP 800-63B §5.1.1.2):** Reducir mayúsculas o alterar acentos en contraseñas disminuye la entropía criptográfica. `"Alza2026!"` ≠ `"alza2026!"` y `"Año2026"` ≠ `"Ano2026"`. Solo se aplica forma canónica Unicode `NFC` sin modificar ningún carácter visible. |
| **Rol de autorización (`usuario.rol`)** | **Sí** *(Exacto)* | **Sí** *(Exacto)* | **Estándar RBAC (OWASP ASVS 4.1):**En `src/constants/roles.js` se compara de forma exacta (`NFC` + `trim()`) contra el catálogo oficial de los 6 roles de `seguridad.roles`. |

---

## 2. Control de Intentos de Inicio de Sesión y Protección contra Sobrecarga (Máximo 10 Intentos)

En portales de análisis financiero, permitir intentos ilimitados desde un mismo cliente expone el sistema a ataques de **fuerza bruta / *credential stuffing*** y **sobrecarga de CPU en el servidor** (dado que el backend ejecuta hashing **BCrypt WorkFactor 12** en cada intento).

Se implementó el módulo [`src/utils/controlIntentosLogin.js`](./src/utils/controlIntentosLogin.js) integrado en [`src/pages/Login.jsx`](./src/pages/Login.jsx):

1. **Tope estricto de 10 intentos fallidos (`SEGURIDAD_LOGIN.MAX_INTENTOS = 10`):**
   - Cada respuesta de credenciales inválidas incrementa el contador persistido en `localStorage` (`siftc_seguridad_intentos_login`), evitando que recargar la página con `F5` reinicie el conteo.
2. **Advertencia preventiva gradual (desde el intento 7):**
   - A partir del séptimo fallo muestra cuántos intentos quedan: *(ej. `"El usuario o la contraseña son incorrectos. (Quedan 3 intentos)."`).*
3. **Bloqueo temporal activo con cuenta regresiva (`05:00`):**
   - Al alcanzar `10/10` fallos, el formulario entra en bloqueo durante **5 minutos** (`300 s`) con temporizador en vivo segundo a segundo (`mm:ss`).
   - Mientras está bloqueado, **los campos y el botón quedan deshabilitados** y `handleSubmit` corta la ejecución inmediatamente: **cero peticiones HTTP salen hacia el backend**.
4. **Anti-ráfaga (*Cooldown* de `800 ms`) y exclusión de fallos de red:**
   - Impide envíos automatizados en milisegundos consecutivos.
   - Si el servidor está apagado (`ERR_NETWORK`), informa el problema de conexión sin descontar intentos de credenciales del usuario.
   - Al iniciar sesión correctamente o cumplirse la ventana de enfriamiento, el registro se limpia automáticamente.

---

## 3. Norma General de Longitud de Campos (`n` Caracteres) y Detención Exacta del Cursor

Se creó el archivo maestro [`src/constants/validaciones.js`](./src/constants/validaciones.js) con el objeto inmutable `LIMITES_CAMPOS` para estandarizar todos los formularios actuales y futuros del portal:

| Constante Global | Mínimo | Máximo (`n`) | Norma General y Justificación Técnica |
| :--- | :---: | :---: | :--- |
| `EMAIL_MAX` | `3` | **`120`** | Subconjunto institucional de **RFC 5321** (con tope de `64` en parte local antes de `@`) y **coincidencia exacta 1:1** con `VARCHAR(120)` de `seguridad.usuarios.email` en PostgreSQL (`UsuarioConfiguration.cs`). |
| `USUARIO_ALIAS_MAX` | `3` | **`50`** | Coincidencia exacta con `Texto(50)` definido en el Diccionario de Datos (`HU-DD-01`) cuando se ingresa solo el alias sin `@`. |
| `PASSWORD_MAX` | `6` | **`64`** | **Estándar OWASP ASVS v4.0 (2.1.2) para BCrypt:** El algoritmo Blowfish/BCrypt del backend trunca silenciosamente a `72 bytes` y es vulnerable a denegación de servicio (DoS) si procesa textos enormes. Fijar `n = 64` garantiza seguridad criptográfica total (incluso con caracteres de 2 bytes como `ñ` o tildes) y protege la CPU del servidor. |
| `NOMBRE_MAX` | `2` | **`30`** | Alineado con `VARCHAR(30)` de `primer_nombre` y `primer_apellido` en PostgreSQL. |
| `BUSQUEDA_MAX` | `1` | **`80`** | Alineado con `VARCHAR(80)` de `nombre_entidad`. |
| `CODIGO_ENTIDAD_MAX` | `2` | **`10`** | Alineado con `VARCHAR(10)` de `ticker` / `codigo_entidad`. |

### ¿Cómo se detiene el cursor exactamente en `n` caracteres?
Se aplicó **doble candado simultáneo** en [`Login.jsx`](./src/pages/Login.jsx):
1. **Nivel navegador (HTML5 nativo):** Atributo `maxLength={120}` en usuario/correo y `maxLength={64}` en contraseña — el cursor se detiene físicamente en la posición `n` al teclear o pegar texto.
2. **Nivel estado React (`onChange`):** `limitarEntradaIdentificador()` y `limitarEntradaPassword()` aplican `.slice(0, n)` antes de actualizar el estado, impidiendo que autocompletados o manipulaciones del DOM inyecten más caracteres. Además, cuando el usuario se acerca al límite, aparece un contador discreto (`105/120`, `54/64`).

---

## 4. Validación Estricta de Símbolos en Tiempo Real por Estándar (OWASP + RFC 5322)

Cada campo valida tecla por tecla (`onChange`) mediante `validarIdentificadorTiempoReal` y `validarPasswordTiempoReal`. **En el instante exacto en que se ingresa un carácter o secuencia no permitida**, el campo se marca en rojo (`.login-input-error`, etiqueta `.login-label-error` y mensaje `.login-field-error` con `aria-invalid="true"`) sin esperar a presionar *"Ingresar"*, y limpia el estado rojo automáticamente en cuanto se corrige el carácter. Además, ninguna petición viaja al servidor si contiene simbología fuera de estándar:

### 4.1. Reglas de Símbolos en Correo / Usuario (`validarIdentificadorTiempoReal` + `validarIdentificadorAcceso`)
- **Permitidos:**
  - Formato correo (`con @`): letras ASCII (`a-z`, `A-Z`), dígitos (`0-9`) y separadores estándar RFC 5322 (`._+-` en parte local sin puntos dobles ni extremos; `.-` en dominio con TLD alfabético de 2 a 24 letras).
  - Formato alias (`sin @`): exclusivamente `a-z`, `A-Z`, `0-9`, `.`, `_` y `-`.
- **Detección inmediata en rojo al teclear (`onChange`):**
  - Espacios en blanco, tildes o `ñ` en el correo/alias, doble `@`, inicio con símbolo, dos separadores seguidos (`..`, `__`), símbolos prohibidos en el dominio después de `@` (`_`, `+`), y cualquier delimitador de inyección o símbolo fuera de estándar (`< > " ' \` ; \ / | ? * ! # $ % ^ & ( ) [ ] { } = ~ , :` o emojis UTF-16).
  - Caracteres de control ASCII e invisibles (`\x00-\x1F`, `\x7F-\x9F`, *Zero-Width* / *Trojan Source*) se sanean automáticamente.

### 4.2. Reglas de Símbolos en Contraseña (`validarPasswordTiempoReal` + `validarPasswordAcceso`)
- **Permitidos (Lista blanca OWASP):**
  - Letras mayúsculas y minúsculas (`a-z`, `A-Z`, incluyendo `ñ`, `Ñ` y vocales acentuadas `áéíóúÁÉÍÓÚüÜ`), números (`0-9`) y el conjunto estándar seguro de símbolos imprimibles: `! @ # $ % ^ & * ( ) _ + - = . , : ? ~ /`.
- **Detección inmediata en rojo al teclear (`onChange`):**
  - Marca el campo en rojo al instante si se ingresa un espacio en blanco, emojis fuera del BMP (`[\uD800-\uDFFF]`), corchetes o delimitadores peligrosos de marcado/escape/inyección: comillas (`'`, `"`, `` ` ``), `<`, `>`, punto y coma (`;`), barra invertida (`\`) y *pipe* (`|`).
  - Bytes nulos y caracteres de control invisibles se eliminan automáticamente.

---

## 5. Resumen de Archivos Creados y Actualizados

| Archivo | Acción | Descripción |
| :--- | :---: | :--- |
| `src/constants/validaciones.js` | **Nuevo** | Norma general `LIMITES_CAMPOS`, `SEGURIDAD_LOGIN`, validadores instantáneos tecla por tecla (`validarIdentificadorTiempoReal`, `validarPasswordTiempoReal`) y validadores completos RFC 5322 / OWASP. |
| `src/utils/controlIntentosLogin.js` | **Nuevo** | Controlador de máximo 10 intentos fallidos, bloqueo temporal de 5 min, *cooldown* anti-ráfaga y formateador `mm:ss`. |
| `src/pages/Login.jsx` | **Actualizado** | Marcado en rojo en tiempo real (`onChange` + `onBlur`), `maxLength`, corte en `n`, contador de caracteres y bloqueo visual por intentos. |
| `src/styles/Login.css` / `tema.css` | **Actualizado** | Estilos de error inmediato en rojo (`.login-input-error`, `.login-label-error`, `.login-field-error`), `.login-lockout` y soporte completo en modo claro y oscuro. |
| `src/context/AuthContext.jsx` | **Actualizado** | Detección y autorreparación de sesiones antiguas en `localStorage` con codificación corrupta (`P?rez` → UTF-8 limpio). |
| `src/constants/roles.js` | **Actualizado** | Comparación exacta RBAC con normalización canónica `NFC`. |
| `src/utils/jwt.js` | **Actualizado** | Relleno Base64 `=` obligatorio + `TextDecoder('utf-8')` para nombres y roles con `ñ` y tildes. |
| `src/utils/texto.js` | **Actualizado** | Normalización diferenciada entre identificador (*case-insensitive* `NFC`) y contraseña (*case-sensitive* estricto `NFC`). |
