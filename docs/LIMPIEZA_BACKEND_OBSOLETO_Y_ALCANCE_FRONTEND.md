# Informe de Limpieza de Backend Obsoleto y Redefinición de Alcance ISO/IEC 27001:2022 (`limpieza-backend-obsoleto`)

> **Proyecto:** Sistema de Información Financiera de Trazabilidad y Competitividad (ALZA / SIFTC) — Repositorio Frontend (`frontend-siftc`)  
> **Rama de trabajo:** `limpieza-backend-obsoleto`  
> **Fecha:** 6 de noviembre de 2026  
> **Alcance de la intervención:** Limpieza de artefactos de backend local obsoletos, actualización de variables de entorno y scripts de diagnóstico hacia Render (`https://siftc.onrender.com`), incorporación del contrato OpenAPI versionado (`docs/api/openapi-v1.json`) y correcciones de alcance/atribución en `docs/LOGIN_CONTEXT.md`. **No se modificó ningún archivo dentro de `src/`.**

---

## 1. Contexto y Objetivo

1. El equipo **Frontend** trabaja exclusivamente sobre este repositorio (`frontend-siftc`). El servicio **Backend** (`SIFTC.Api`, .NET 10) es mantenido y desplegado de forma independiente por otro equipo en Render (`https://siftc.onrender.com`).
2. La copia local ubicada fuera del repositorio (`..\SIFTC`) y los archivos de aprovisionamiento en Docker (`docs/setup-backend/`) habían quedado desactualizados frente al servicio real desplegado, provocando discrepancias en el contrato de autenticación (`email` vs. `usuario`, diferencias de nombres de DTOs y puertos locales).
3. Se estableció **`docs/api/openapi-v1.json`** (especificación **OpenAPI 3.1.1**, descargada de `https://siftc.onrender.com/openapi/v1.json`) como **única fuente de verdad** del contrato de la API para el frontend. El esquema de entrada `AutenticarUsuarioCommand` exige `{ usuario, password }` y la respuesta exitosa `200` devuelve directamente `AuthResponseDto` (`{ token, expiraEn, usuario: { id, nombre, rol } }`), sin sobre `{ exito, datos, mensaje }`.

---

## 2. Resumen de `VERIFICACION_ESTANDARIZACION_AUTH.md` (antes de su eliminación)

Antes de eliminar `VERIFICACION_ESTANDARIZACION_AUTH.md`, se verificó su contenido y se preservaron las decisiones vigentes:

1. **Contraste histórico con copia local:** El documento comparaba el diccionario de datos (`HU-DD-01/03/05`) con la copia local `..\SIFTC`, asumiendo un backend en Docker (`http://localhost:7123`), petición de login con campo `email` y respuesta `AuthResponseDto` plana.
2. **Decisiones de arquitectura frontend vigentes (trasladadas a la Sección 7.3 de `docs/LOGIN_CONTEXT.md`):** Documentaba el catálogo RBAC de 6 roles en `src/constants/roles.js`, la decodificación JWT UTF-8 en `src/utils/jwt.js`, el adaptador `aSesion()` en `src/services/adaptadores.js` y el lector de errores RFC 9457 (`ProblemDetails`) en `src/services/authService.js`.
3. **Secciones obsoletas descartadas:** Incluía instrucciones de instalación de Docker Desktop/WSL2 en Windows y semillas SQL locales que contradecían el contrato real en producción (`docs/api/openapi-v1.json`).

---

## 3. Verificación Previa de Dependencias e Inventario de `scripts/`

### 3.1. Comprobación de dependencias antes de borrar archivos
- **`.github/workflows`:** No existe directorio `.github` en el repositorio.
- **`src/`:** Ningún componente, servicio, contexto ni utilidad dentro de `src/` importaba ni referenciaba archivos de `docs/setup-backend/`, `VERIFICACION_ESTANDARIZACION_AUTH.md` ni `scripts/`.
- **`package.json`:** Ningún comando de `scripts` invocaba `docs/setup-backend/preparar-backend.ps1`.

### 3.2. Revisión individual de la carpeta `scripts/` (conservada sin ejecutar contra Render)

| Archivo en `scripts/` | Estado previo | Acción aplicada |
| :--- | :--- | :--- |
| `scripts/diagnostico-api.mjs` | Tenía fallback `'http://localhost:7123'` en la línea 53. | **Actualizado** el fallback a `'https://siftc.onrender.com'` y la ayuda en consola. |
| `scripts/explorar-api.mjs` | Tenía fallback `'http://localhost:7123'` y contraseña semilla literal en las líneas 34–38. | **Actualizado** el fallback a `'https://siftc.onrender.com'` y parametrizada la clave mediante `process.env.SIFTC_TEST_PASSWORD`. |
| `scripts/audit-api-contract.mjs` | Ya apuntaba a `https://siftc.onrender.com`. | **Conservado sin cambios.** |
| `scripts/inspect-openapi.mjs` | Ya apuntaba a `https://siftc.onrender.com/openapi/v1.json`. | **Conservado sin cambios.** |
| `scripts/test-endpoints.mjs` | Ya apuntaba a `https://siftc.onrender.com`. | **Conservado sin cambios.** |

---

## 4. Auditoría de Contraseñas Semilla en el Historial de Git (`git log -S`, solo lectura)

Se realizó una búsqueda en modo de solo lectura sobre todo el historial y ramas del repositorio (`git log --all -S <cadena> --oneline`) para localizar en qué commits aparecían contraseñas semilla literales o secretos de configuración local (sin reescribir el historial):

| Secreto / semilla buscada | Commits donde se introdujo o modificó | Archivos afectados en el historial | Estado actual en `limpieza-backend-obsoleto` |
| :--- | :--- | :--- | :--- |
| Contraseña semilla de `init-seguridad.sql` (`alza...`) | `a7ea194` (*feat(siftc): unificar modulos de equipo...*)<br>`b9ee961` (*Add files via upload* en `origin/Rafael`)<br>`ee9beca` (*feat(login): nuevo diseno del login...* en `origin/Reynel`)<br>`06af96f` (*docs(login): redefinir alcance a frontend...*) | `README.md`<br>`SEGURIDAD_Y_VALIDACIONES_AUTENTICACION.md`<br>`docs/setup-backend/init-seguridad.sql`<br>`docs/setup-backend/preparar-backend.ps1`<br>`docs/LOGIN_CONTEXT.md` | **Eliminada** por completo del árbol de trabajo (`0fecfc9`, `42098ea` y `ba204e9`). |
| Contraseña semilla de `DbInitializer.cs` (`Admin...`) | `06af96f` (*docs(login): redefinir alcance a frontend...*) | `docs/LOGIN_CONTEXT.md` | **Eliminada** del árbol de trabajo (`ba204e9`). |
| Secretos de variables de entorno locales de `.env.backend.example` | `a7ea194`, `b9ee961`, `ee9beca` | `docs/setup-backend/.env.backend.example` | **Eliminado** el archivo en `0fecfc9`. |

---

## 5. Estado del Repositorio Externo `..\SIFTC` (Solo Lectura)

De acuerdo con las instrucciones, la carpeta `..\SIFTC` (fuera de este repositorio) **no fue borrada ni modificada**. El diagnóstico en solo lectura arrojó:

- **Remoto (`git remote -v`):** `https://github.com/Jramosd-lang/SIFTC`
- **Rama actual:** `main` (sincronizada con `origin/main` en el commit `bc2aa26` — *"estructura limpia del proyecto SIFTC"*).
- **Cambios locales sin commitear (`git status -s` y `git diff`):**
  - `M dockerfile`: corrección de mayúsculas en el ENTRYPOINT de `["dotnet", "SIFTC.API.dll"]` a `["dotnet", "SIFTC.Api.dll"]` (para coincidir con el nombre del binario generado). `SIFTC.API/Program.cs` no presenta modificaciones.
  - Archivos sin seguimiento: `?? .env`, `?? .env.example`, `?? docker-compose.yml`, `?? init-seguridad.sql`, `?? package-lock.json`.
- **Variables presentes en `.env` de `..\SIFTC` (solo nombres):**
  `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_EXPIRY_MINUTES`.
- **Servicios en `docker-compose.yml` de `..\SIFTC`:**
  - `db` (`postgres:15`, puerto `5432:5432`).
  - `api-csharp` (puerto `7123:8080`, mapea variables `ConnectionStrings__DefaultConnection` y `JwtSettings__*`).
- **Estado de eliminación autorizada:** El usuario solicitó validar antes de borrar si el remoto era `https://github.com/oscarpolo04/SIFTC.git`. Dado que el remoto real es `https://github.com/Jramosd-lang/SIFTC`, la carpeta **NO se eliminó** en cumplimiento estricto de la regla de seguridad del usuario.

---

## 6. Correcciones Aplicadas a `docs/LOGIN_CONTEXT.md`

Se aplicaron las 7 correcciones solicitadas sobre `docs/LOGIN_CONTEXT.md` (y su copia sincronizada en `D:\Universidad\SISTEMA INFO\Proyectos\Documentacion\LOGIN_CONTEXT.md`):

1. **(a) Eliminación de contraseñas semilla literales:** Se retiraron todas las contraseñas literales en las secciones 2, 4 y 7, reemplazándolas por la expresión *"contraseñas semilla de laboratorio"*. También se reemplazó el ejemplo literal en `SEGURIDAD_Y_VALIDACIONES_AUTENTICACION.md:27`.
2. **(b) Diferenciación entre Login y Registro para longitud de contraseña (Sección 7.1 y B-04 FE):**
   - El mínimo de 8 caracteres (`PASSWORD_MIN_REGISTRO = 8`, NIST SP 800-63B §5.1.1.2) aplica **únicamente al crear o cambiar una contraseña** en el flujo de registro (`registrarUsuario()`).
   - El formulario de **login** (`validarPasswordAcceso()`) **no** debe exigir longitud mínima ni revelar reglas de composición (ISO/IEC 27002:2022 §8.5); solo debe verificar que la contraseña no esté vacía y que no supere el tope superior de `72 bytes UTF-8` (`new TextEncoder().encode(password).length <= 72`).
3. **(c) Retiro del log de eventos en `sessionStorage` (B-11 FE y Paso 2):** Se eliminó de la propuesta de frontend el registro de eventos de seguridad en `sessionStorage` porque un atacante con el navegador abierto o con XSS puede borrarlo o manipularlo. El control **B-11 (FE)** quedó enfocado exclusivamente en el auto-ocultamiento del campo de contraseña tras `10 segundos`.
4. **(d) Reformulación de recomendaciones de Backend como preguntas de verificación (Sección 4.3):** Se eliminó toda cita de archivos y líneas de la copia local externa, reformulando cada punto como una pregunta técnica de control para el equipo Backend con base en el contrato OpenAPI 3.1.1 y las normas ISO/IEC 27001/27002.
5. **(e) Expiración del JWT como valor por confirmar:** En el ítem `#8`, la matriz de la sección 3, **B-06 (FE)** y **B-05 (BE)**, la expiración de `8 horas (28 800 s / 480 min)` quedó marcada explícitamente como *"valor observado en la copia local, a verificar con la respuesta real del login (`datos.expiracion` / claim `exp`)"*.
6. **(f) Aclaración metodológica del porcentaje de cumplimiento (Sección 3.1):** Se añadió una nota explicando que el paso de `50,0 %` (`7,5 / 15`) a `53,6 %` (`7,5 / 14`) obedece únicamente al cambio de alcance (exclusión del ítem `#5` del denominador del frontend por ser 100 % responsabilidad del backend), y **no** a una mejora en el código.
7. **(g) Actualización del ítem `#14` tras eliminar `docs/setup-backend/`:** Se actualizó el ítem `#14` en el inventario y en la matriz para reflejar que `docs/setup-backend/` ya fue eliminado en la rama `limpieza-backend-obsoleto`. Con ello, el control **A.8.24 (Uso de criptografía)** pasa a `100,0 %` (`1,0 / 1` por el ítem `#7`), mientras que el ítem `#14` permanece en estado `Parcial` (`0,5`) bajo **A.8.28** y **A.5.34** debido a la persistencia de PII en `localStorage` y la ausencia de aviso de privacidad, manteniendo el cumplimiento global del frontend en **`53,6 %` (`7,5 / 14`)**. Asimismo, **B-09 (FE)** quedó marcado como *"Pendiente: depende de la decisión del líder"*.

---

## 7. Historial de Commits en `limpieza-backend-obsoleto`

```text
ba204e9 docs(login): aplicar correcciones de alcance, atribucion, bytes UTF-8 y limpieza de contrasenas semilla en LOGIN_CONTEXT.md
42098ea docs(env): limpiar referencias a Docker y localhost en README, .env.example y scripts
0fecfc9 chore(clean): eliminar docs/setup-backend y VERIFICACION_ESTANDARIZACION_AUTH.md obsoletos
06af96f docs(login): redefinir alcance a frontend y contrato OpenAPI (docs/api/openapi-v1.json)
```

---

## 8. Verificación de Construcción y Ejecución (`npm run build` y `npm run dev`)

### 8.1. Salida real de `npm run build`
```text
> frontend-siftc@0.0.0 build
> vite build

vite v8.3.4 building client environment for production...
transforming...
✓ 2031 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                         0.67 kB │ gzip:   0.43 kB
dist/assets/logo-alza-oscuro-Baac6uyH.png              70.77 kB
dist/assets/logo-alza-Dpq2qVef.png                     78.82 kB
dist/assets/logo-alza-horizontal-XNDSJ2wp.png          85.58 kB
dist/assets/logo-alza-horizontal-oscuro-B4oh4OHJ.png   86.18 kB
dist/assets/login-fondo-oficina-DD9u-Ucc.jpg          117.91 kB
dist/assets/Ranking-C9BsbvBJ.css                        3.78 kB │ gzip:   1.08 kB
dist/assets/Dashboard-CbrH_E9d.css                      3.90 kB │ gzip:   1.05 kB
dist/assets/FinancialChart-DSCI0PnI.css                 4.67 kB │ gzip:   1.25 kB
dist/assets/index-B5YzctAs.css                         16.54 kB │ gzip:   4.38 kB
dist/assets/Variacion-D3uSXJmn.js                       0.25 kB │ gzip:   0.22 kB
dist/assets/Dashboard-Dx7Oh85j.js                       5.20 kB │ gzip:   1.73 kB
dist/assets/Ranking-BjGm1xUI.js                         6.83 kB │ gzip:   2.53 kB
dist/assets/FinancialChart-PGR_fOcw.js                176.13 kB │ gzip:  57.22 kB
dist/assets/index-Ca57X5o6.js                         348.80 kB │ gzip: 114.16 kB

✓ built in 1.38s
```

### 8.2. Salida real de `npm run dev`
```text
HTTP Status: 200

> frontend-siftc@0.0.0 dev
> vite

  VITE v8.3.4  ready in 645 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## 9. Plantilla Lista para el Pull Request (`limpieza-backend-obsoleto`)

### Título sugerido
`chore(clean): eliminar artefactos de backend local obsoletos y alinear documentación con API en Render`

### Descripción sugerida
```markdown
## Resumen
Este PR limpia del repositorio frontend (`frontend-siftc`) los scripts y guías de aprovisionamiento de base de datos/Docker local que quedaron desactualizados frente al servicio real desplegado por el equipo Backend en Render (`https://siftc.onrender.com`), y establece `docs/api/openapi-v1.json` como única fuente de verdad del contrato de la API. No modifica código funcional dentro de `src/`.

## ¿Qué se eliminó y por qué?
- `docs/setup-backend/` (`preparar-backend.ps1`, `init-seguridad.sql`, `.env.backend.example`): contenían aprovisionamiento de PostgreSQL en Docker (`localhost:5433`), parches sobre un repositorio hermano (`..\SIFTC`) y semillas SQL cuyo esquema de login (`email` + `AuthResponseDto` sin token con expiraEn) contradecía el contrato publicado en OpenAPI 3.1.1 (`AutenticarUsuarioCommand` con `{ usuario, password }` y respuesta directa `AuthResponseDto` con `{ token, expiraEn, usuario: { id, nombre, rol } }`).
- `VERIFICACION_ESTANDARIZACION_AUTH.md`: documento de diagnóstico antiguo basado en el backend local en `localhost:7123`. Las decisiones de arquitectura frontend que siguen vigentes (catálogo RBAC de 6 roles, decodificador JWT UTF-8, adaptador `aSesion()` en `src/services/adaptadores.js` y manejo de errores RFC 9457) se trasladaron a la sección 7.3 de `docs/LOGIN_CONTEXT.md`.

## ¿Qué se actualizó?
- `.env.example` y `README.md`: apuntan por defecto a `VITE_API_URL=https://siftc.onrender.com` sin requerir Docker ni PostgreSQL local, se removieron contraseñas semilla literales y se añadió advertencia sobre el uso de `scripts/` contra el entorno desplegado.
- `scripts/diagnostico-api.mjs` y `scripts/explorar-api.mjs`: se actualizó el fallback de `http://localhost:7123` a `https://siftc.onrender.com` y se reemplazó la contraseña literal de prueba por la variable de entorno `SIFTC_TEST_PASSWORD`.
- `docs/api/openapi-v1.json`: copia versionada del contrato OpenAPI 3.1.1 del servicio en Render.
- `docs/LOGIN_CONTEXT.md` y `SEGURIDAD_Y_VALIDACIONES_AUTENTICACION.md`: auditoría y matriz ISO/IEC 27001:2022 redefinidas al alcance del equipo Frontend, separación de hallazgos para entregar al equipo Backend y eliminación de contraseñas semilla literales.

## Verificación
- [x] Verificado que ningún archivo en `src/` ni `package.json` dependía de los archivos eliminados.
- [x] `npm run build` compila sin errores (`✓ 2031 modules transformed, built in 1.38s`).
- [x] `npm run dev` levanta Vite en `http://localhost:5173/` y responde `HTTP 200`.
```


---

## 10. Limpieza y Descarte del Modo Simulado (`limpieza-mock`)

En seguimiento a la decisión del equipo, se procedió a eliminar por completo el modo simulado (mock) y todos los datos de prueba de la primera entrega:

1. **Eliminación de la lógica mock en `src/services/api.js` e `IndiceGeneral.jsx`:**
   - Se removió la bandera `USE_MOCK` (`import.meta.env.VITE_USE_MOCK !== 'false'`), la cual presentaba un riesgo de seguridad de activar silenciosamente el modo mock en builds de producción ante la ausencia de la variable de entorno (Control ISO 27001 **A.8.28** y **A.8.5**).
   - Se eliminaron `FALLBACK_MOCK`, `USA_DATOS_DE_EJEMPLO` (y su uso en `IndiceGeneral.jsx`), las funciones de tokens sintéticos (`crearTokenMock`, `aBase64Url`, `DURACION_SESION_MOCK_SEG`), la bifurcación de login simulado y el envoltorio `conRespaldoMock`.
   - Se actualizó el comentario obsoleto del puerto 7123 / Docker y se limpiaron los comentarios de mock en `endpoints.js`, `adaptadores.js`, `jwt.js` y `format.js`.
2. **Eliminación de datos falsos en `FinancialChart.jsx` y del directorio `src/services/mocks/`:**
   - `FinancialChart.jsx` se actualizó para iniciar sin `mockOhlcData` ni `ENTIDAD_INICIAL` (`Entidad Beta`), mostrando estados explícitos de carga (`role="status"`) y error (`role="alert"`).
   - Se eliminó por completo la carpeta `src/services/mocks/` (`rankingMocks.js`, `ohlcMocks.js`, `marketMocks.js`).
3. **Variables de entorno y documentación:**
   - Se removió `VITE_USE_MOCK` de `.env.example`, `.env`, `README.md`, `DESPLIEGUE.md` y `scripts/diagnostico-api.mjs`.
   - Se actualizó `docs/LOGIN_CONTEXT.md` agregando el hallazgo B-12 (FE) y la evidencia real observada en `POST /api/v1/auth/login` (`HTTP 401` con `detail: "Token inválido o vencido"` y `code: "auth.unauthorized"`).
