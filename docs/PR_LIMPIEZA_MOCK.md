# Propuesta de Pull Request — `limpieza-mock`

## Título sugerido
`chore(mock): eliminar por completo modo simulado, carpeta src/services/mocks y datos falsos de interfaz`

## Descripción del Pull Request

### Resumen
Este Pull Request elimina de forma completa y definitiva el modo simulado (`USE_MOCK`, `VITE_USE_MOCK`, `FALLBACK_MOCK`, `USA_DATOS_DE_EJEMPLO`), el estado inicial inventado de la gráfica (`FinancialChart.jsx`) y la totalidad del directorio `src/services/mocks/` (`marketMocks.js`, `ohlcMocks.js`, `rankingMocks.js`). Todas las peticiones y pantallas del frontend operan ahora exclusivamente contra el servicio externo desplegado en Render (`https://siftc.onrender.com`), regido por `docs/api/openapi-v1.json`, mostrando estados explícitos de carga o error cuando la API tarda o falla.

---

### ¿Por qué se realizó este cambio?
1. **Decisión del equipo:** El modo simulado y los datos de demostración de la primera entrega ya no se utilizan.
2. **Mitigación de riesgo de seguridad (Control ISO/IEC 27001:2022 A.8.28, A.8.5, A.8.26):**
   En `src/services/api.js`, la condición original `import.meta.env.VITE_USE_MOCK !== 'false'` evaluaba a `true` cuando la variable de entorno no estaba definida (`undefined !== 'false'`). En un despliegue sin `.env` o en CI/CD, `npm run build` compilaba la aplicación en modo mock, emitiendo JWTs falsos y aceptando cualquier credencial sin validación real (Hallazgo **B-12 (FE)** en `docs/LOGIN_CONTEXT.md`).
3. **Integridad de datos en pantalla:** `FinancialChart.jsx` arrancaba con `useState(mockOhlcData)` e `ENTIDAD_INICIAL` (`ENT002 / Entidad Beta`), mostrando velas inventadas si el servidor tardaba o fallaba.

---

### Qué se eliminó exactamente
1. **`src/services/api.js` y `src/components/tablero/IndiceGeneral.jsx`:**
   - Eliminadas las banderas `USE_MOCK`, `FALLBACK_MOCK` y la constante `USA_DATOS_DE_EJEMPLO` junto con su uso en `IndiceGeneral.jsx`.
   - Eliminadas las funciones de login simulado (`crearTokenMock`, `aBase64Url`, `DURACION_SESION_MOCK_SEG`), `respuesta()` y `conRespaldoMock()`.
   - Actualizado el comentario obsoleto de la línea 24 (puerto 7123 / Docker) y eliminados los comentarios que aludían a simulación.
2. **`src/components/charts/FinancialChart.jsx`:**
   - Eliminado el import de `mockOhlcData`, la constante `ENTIDAD_INICIAL` (`Entidad Beta`) y el indicador `serieEsEjemplo`.
   - La gráfica inicia con `serieOhlc = []` y muestra mensajes explícitos de carga (`role="status"`) o de error (`role="alert"`) si `getEntidades()` o `getOhlc()` fallan o devuelven vacío.
3. **Directorio `src/services/mocks/` (eliminado por completo):**
   - `src/services/mocks/rankingMocks.js`
   - `src/services/mocks/ohlcMocks.js`
   - `src/services/mocks/marketMocks.js`
4. **Comentarios obsoletos y variables de entorno:**
   - Limpiados los comentarios con referencias a "Mock" en `src/services/endpoints.js`, `src/services/adaptadores.js`, `src/utils/jwt.js` y `src/utils/format.js`.
   - Removida `VITE_USE_MOCK` de `.env.example`, `.env`, `scripts/diagnostico-api.mjs`, `README.md` y `DESPLIEGUE.md`.
5. **Documentación de seguridad (`docs/LOGIN_CONTEXT.md`):**
   - Registrada en Sección 0 la eliminación del modo mock y en Sección 4.1 el hallazgo **B-12 (FE)**.
   - Documentada en el ítem #2 (inventario y matriz) y en la Sección 4.3 (**B-07b BE**) la evidencia real observada en `POST /api/v1/auth/login` ante credenciales inválidas (`HTTP 401` con `detail: "Token inválido o vencido"` y `code: "auth.unauthorized"`).

---

### Qué quedó pendiente (en Backlog del equipo, fuera de este PR)
- **Rol por defecto en `src/services/adaptadores.js:70,84`:** Se mantiene sin cambios según lo acordado para atenderse en su historia de backlog dedicada (rechazar sesión si ni el JSON ni el JWT traen rol).
- **Forzar mensaje neutro en `src/services/authService.js:18-30` (Hallazgo B-07 FE):** Pendiente en backlog para evitar mostrar `data.detail` crudo del servidor en un `HTTP 401` de login.
- **Catálogo de `dimensiones` cuando `/api/v1/metricas` devuelve 0 filas:** Actualmente `getDimensiones()` deriva las dimensiones de `GET /api/v1/metricas` (si viene vacío, el filtro en `/ranking` se deshabilita). Queda como decisión del equipo si desea reemplazarlo por una constante con las 4 dimensiones documentadas en la descripción de `GET /api/v1/ranking` (`Rentabilidad`, `Liquidez`, `Solvencia`, `Crecimiento`).

---

### Verificación local ejecutada
- [x] `git grep -n -i -E "mock|simulad|modo demo" -- src`: sin resultados (código de salida 1).
- [x] `npm run lint`: 0 errores, 0 advertencias.
- [x] `npm run build`: compilación limpia en `dist/`.
- [x] `npm run dev`: smoke test de arranque en `http://localhost:5173/` verificado.
- [x] No se ejecutaron peticiones contra `https://siftc.onrender.com`.
