# Auditoría de Estandarización: Diccionario de Datos vs. Backend (`SIFTC`) vs. Frontend (`ALZA`)

> **Proyecto:** Sistema de Información Financiera de Trazabilidad y Competitividad (SIFTC - ALZA)  
> **Repositorios auditados:**  
> - **Frontend:** `d:\Universidad\SISTEMA INFO\Proyectos\frontend-siftc` (Rama `Oscar`)  
> - **Backend:** `d:\Universidad\SISTEMA INFO\Proyectos\SIFTC` (Ramas `master` y `feat_entidades`)  
> - **Diccionario de Datos:** `HU-DD-01` (Diccionario), `HU-DD-03` (Fichas de métricas), `HU-DD-05` (Matriz CSV y Reglas de Calidad)

---

## 1. Arquitectura Real del Backend Encontrada

Al clonar e inspeccionar el repositorio `https://github.com/Jramosd-lang/SIFTC`, se identificó que el equipo de Backend adoptó una **arquitectura dividida**:

1. **API Principal de Seguridad y Consultas (`SIFTC.API` en C# / .NET 10):**
   - Implementada con **Clean Architecture** (`Domain`, `Application`, `Infrastructure`, `API`), **CQRS con MediatR**, **Entity Framework Core 9/10** y **PostgreSQL 15 (`Npgsql`)**.
   - Todos los endpoints públicos viven bajo el prefijo `/api/v1`, responden en JSON `camelCase` y reportan errores bajo el estándar **RFC 9457 (`application/problem+json`)**.
   - **Puertos configurados:**
     - Con **Docker Compose** (`docker-compose.yml`): `http://localhost:7123/api/v1` (PostgreSQL en `localhost:5432`).
     - Con **ejecución nativa** (`dotnet run`): `http://localhost:5057/api/v1`.
2. **Microservicio Python (separado):**
   - Limitado exclusivamente al cargue y validación de la matriz `.CSV` hacia el esquema `cruda` de PostgreSQL.

---

## 2. Comparativa de Estandarización: Autenticación y Usuarios

| Concepto / Campo | Diccionario de Datos (`HU-DD-01`) | Backend Real (`SIFTC` - PostgreSQL y C#) | Frontend Actual (`frontend-siftc`) | Estandarización a Aplicar |
| :--- | :--- | :--- | :--- | :--- |
| **Identificador de acceso** | `usuario` · `Texto(50)`, único, restringido | Columna `seguridad.usuarios.email` (`VARCHAR(120)`). Endpoint recibe `email` | Input `usuario` que envía `{ usuario, email: usuario, password }` | Usar `email` como identificador principal hacia el Backend, manteniendo soporte amigable en el formulario (`Correo electrónico`). |
| **Contraseña** | `contrasena_hash` · `Texto(100)`, Hash `bcrypt` | Columna `seguridad.usuarios.password_hash` (`VARCHAR(100)`), `BCrypt.Net` (`WorkFactor = 12`). Recibe `password` en login | Envía `password` por POST | **100% compatible.** El Frontend envía `{ email, password }` y jamás almacena contraseñas. |
| **Nombre del usuario** | No desglosado en `HU-DD-01` | Columnas `primer_nombre`, `segundo_nombre`, `primer_apellido`, `segundo_apellido`. Devuelve `nombreCompleto` | `Layout.jsx` lee `usuario?.nombre ?? usuario?.usuario` | Normalizar el objeto de sesión en Frontend con `{ idUsuario, email, nombreCompleto, nombre, rol }` para compatibilidad total con `Layout.jsx`. |
| **Rol del usuario (`rol`)** | `rol` · `Texto(20)` (`Analista`, `Consulta` + 6 perfiles en Sprint 3) | Tabla `seguridad.roles.nombre` (`VARCHAR(30)`). Valores autorizados en controladores: `"Administrador"`, `"Analista financiero"`, `"Gerente"`, `"Data Steward"`, `"Auditor"`, `"Usuario móvil"` | Mock devuelve fijo `'Gerente'` | Crear catálogo constante `ROLES` con los nombres exactos de `seguridad.roles` y permitir probar distintos roles en modo Mock. |
| **Respuesta de Login (`POST /api/v1/auth/login`)** | Token JWT + datos del perfil | **`AuthResponseDto` (JSON plano):** `{ idUsuario, email, nombreCompleto, rol, token }` | **DESAJUSTE CRÍTICO:** `AuthContext.jsx` lee `datos.usuario` (que en el backend real NO existe, viene plano) | Crear adaptador `aSesion(datos)` que transforme la respuesta plana de `.NET` (y el mock) a una estructura única `{ token, usuario }`. |
| **Claims del Token JWT** | Token firmado con expiración y rol | Claims incluidos en `JwtTokenGenerator.cs`: `sub` (`IdUsuario`), `email`, `name`, `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`, `jti`, `exp` (`480 min` por defecto) | Guarda `token` crudo en `localStorage` sin validar `exp` | Añadir utilidad `jwt.js` para decodificar el payload Base64URL, verificar expiración (`exp`) al iniciar la app y cerrar sesión automáticamente si venció. |
| **Manejo de Errores HTTP** | Rechazo de acceso no autorizado | **RFC 9457 (`application/problem+json`):** `{ type, title, status, detail, instance, code }` (`401`, `403`, `422`) | Muestra siempre `"Usuario o contraseña incorrectos"` incluso si el backend está apagado | Leer `err.response?.data?.detail` y diferenciar `401` (credenciales inválidas), `422` (validación), `403` (sin permisos de rol) y error de red (`ERR_NETWORK`). |

---

## 3. Comparativa de Variables de Negocio (Diccionario CSV vs. Backend vs. Frontend)

Se verificaron también las **15 columnas de la matriz CSV (`HU-DD-05`)** y las **10 métricas (`HU-DD-03`)** contra las configuraciones de Entity Framework Core del Backend (`ModeloDatosConfiguration.cs` y `EntidadDto.cs`):

1. **Capa Cruda (`cruda.ext_matriz_financiera_entidades`):**
   - **Coincidencia del 100%:** Las 15 columnas tienen exactamente los mismos nombres técnicos en `snake_case` del Diccionario (`codigo_entidad`, `nombre_entidad`, `sector`, `periodo`, `utilidad_neta`, `patrimonio`, `activos_totales`, `ebitda`, `ingresos`, `activo_corriente`, `pasivo_corriente`, `inventarios`, `pasivo_total`, `ebit`, `gastos_financieros`).
2. **Capa Limpia y Analítica (`limpia.tbl_entidades` y `GET /api/v1/entidades` en rama `feat_entidades`):**
   - En base de datos limpia, `codigo_entidad` pasa a llamarse `ticker` (`VARCHAR(10)`) y `nombre_entidad` pasa a `nombre` (`VARCHAR(80)`).
   - El endpoint `GET /api/v1/entidades` devuelve `EntidadDto`:
     ```json
     {
       "id": "uuid",
       "codigo": "ENT001",
       "nombre": "Energía Andina S.A.",
       "sector": "Energía",
       "ic": 78.5,
       "variacion": 1.2,
       "variacionPct": 1.55
     }
     ```
   - Nuestro archivo `src/services/adaptadores.js` ya mapea `codigo -> codigo_entidad`, `nombre -> nombre_entidad`, `ic -> indice_competitividad` y `variacionPct -> variacion_porcentual`. **Único ajuste preventivo:** `ic`, `variacion` y `variacionPct` son `decimal?` (anulables en C# si una entidad aún no tiene cotización), por lo que aseguraremos valores por defecto seguros (`?? 0`) en el adaptador.
3. **Paginación en `/api/v1/entidades`:**
   - El controlador `EntidadesController` soporta `?sector=...&page=1&size=100&sort=ic&dir=desc` y devuelve el total en el header `X-Total-Count`.

---

## 4. Endpoints de Autenticación y Usuarios Disponibles en el Backend

### 4.1 `POST /api/v1/auth/login` (Público)
- **Request Body (`application/json`):**
  ```json
  {
    "email": "analista@siftc.edu.co",
    "password": "TuPassword123*"
  }
  ```
- **Response `200 OK` (`AuthResponseDto`):**
  ```json
  {
    "idUsuario": "01966f2a-4c3b-7a10-9e21-8b3d4c5e6f70",
    "email": "analista@siftc.edu.co",
    "nombreCompleto": "Juan Pérez",
    "rol": "Analista financiero",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Response `401 Unauthorized` (`application/problem+json`):**
  ```json
  {
    "type": "https://siftc.local/problems/auth.unauthorized",
    "title": "No autorizado",
    "status": 401,
    "detail": "El usuario o la contraseña son incorrectos.",
    "instance": "/api/v1/auth/login",
    "code": "auth.unauthorized"
  }
  ```

### 4.2 `POST /api/v1/usuarios/registrar` (Protegido: Rol `"Administrador"`)
- **Headers:** `Authorization: Bearer <token>`
- **Request Body (`application/json`):**
  ```json
  {
    "email": "nuevo@siftc.edu.co",
    "password": "PasswordSeguro123!",
    "primerNombre": "Oscar",
    "primerApellido": "Hundelshaussen",
    "idRol": "00000000-0000-0000-0000-000000000001"
  }
  ```
- **Response `200 OK`:** `"01966f2a-..."` (GUID del usuario creado).
- **Response `409 Conflict`:** `"El correo ya está registrado."` (`code: "usuario.duplicado"`).
- **Response `422 Unprocessable Entity`:** Error de validación de dominio (correo vacío, nombre vacío o rol inválido).

---

## 5. Estado de Dependencias e Infraestructura Local (Backend + Docker)

1. **.NET 10 SDK (`10.0.1326`) y `dotnet-ef` (`10.0.14`):** **Instalados y verificados.** La solución `SIFTC.slnx` restauró todos sus paquetes NuGet y compiló con **0 errores** en la rama más reciente (`feat_entidades`).
2. **Docker Desktop (`4.97.0`):** Instalación lanzada vía `winget`.
   - **Nota importante de Windows/WSL2:** Windows reportó que el subsistema WSL aún no está activado (`REGDB_E_CLASSNOTREG`). Al finalizar el instalador de Docker Desktop (requiere aceptar el cuadro de administrador de Windows), Windows pedirá habilitar WSL2 (`wsl --install`) y **reiniciar el equipo** una vez para que el motor de contenedores arranque.
3. **Advertencia sobre la Base de Datos en Docker (`REVISION_BACKEND_SPRINT2.md`):**
   - El propio documento del equipo Backend advierte que la migración `InitialCreate` de EF Core está obsoleta y que la base PostgreSQL se crea con los scripts SQL del equipo de Datos/BD (`esquemas seguridad, cruda, limpia, analitica`).
   - Además, `docker-compose.yml` exige definir un archivo `.env` en `..\SIFTC` con `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_ISSUER` y `JWT_AUDIENCE`. Podemos generar tanto ese `.env` local como un script SQL semilla (`init-seguridad.sql`) con usuarios de prueba cifrados con `bcrypt` para probar el login extremo a extremo en cuanto inicie Docker.

---

## 6. Plan de Implementación de Autenticación en Frontend (Listo para Ejecutar)

1. **`src/utils/jwt.js`**: Decodificador seguro de JWT (Base64URL + UTF-8), extracción de claims (`sub`, `email`, `name`, `role`, `exp`) y validador `esTokenVigente(token)`.
2. **`src/constants/roles.js`**: Catálogo oficial de los 6 roles (`Administrador`, `Analista financiero`, `Gerente`, `Data Steward`, `Auditor`, `Usuario móvil`) y helpers de autorización por rol.
3. **`src/services/authService.js` y `src/services/adaptadores.js`**:
   - Adaptador `aSesion(dto)` que unifica la respuesta plana de `AuthResponseDto` del Backend C# y el modo Mock.
   - Extractor de mensajes RFC 9457 (`extraerMensajeError(err)`) para `application/problem+json`.
   - Servicio `login({ email, password })` y `registrarUsuario(...)`.
4. **`src/services/api.js` y `.env.example`**:
   - Configuración limpia de URL por defecto apuntando al puerto del Backend `.NET` (`http://localhost:7123` para Docker / `http://localhost:5057` para `dotnet run`) con `VITE_API_PREFIX=/api/v1`.
   - Interceptor de request que valida vigencia del JWT y adjunta `Authorization: Bearer <token>`.
   - Interceptor de response que maneja `401` emitiendo un evento limpio de sesión expirada sin recargas bruscas innecesarias.
5. **`src/context/AuthContext.jsx` y `src/routes/ProtectedRoute.jsx`**:
   - Hidratación inicial verificando que el token en `localStorage` no haya expirado.
   - Soporte opcional de restricción por roles (`<ProtectedRoute rolesPermitidos={[...]} />`).
6. **`src/pages/Login.jsx`**:
   - Estandarización del campo `email` (permitiendo correo institucional o usuario en modo demo), estado de carga (`Ingresando...` con botón deshabilitado para evitar doble envío) y visualización clara de errores RFC 9457 o de conexión.
