# Reglas de Proyecto — ALZA (SIFTC)

## Estándares Obligatorios de Código, Permisos y Diseño Visual
1. **Contrato de Backend:** La fuente única de verdad es `docs/api/openapi-v1.json` contra `https://siftc.onrender.com/api/v1`. Cero mocks, cero invenciones de campos.
2. **Matriz de Permisos por Rol y Sensibilidad del Dato (HU-FE-07 CA 1):**
   - La fuente oficial es [`docs/seguridad/matriz-permisos-roles.md`](./docs/seguridad/matriz-permisos-roles.md) y [`src/constants/permisos.js`](./src/constants/permisos.js).
   - Los 6 roles canónicos son: `Administrador`, `Data Steward`, `Analista financiero`, `Gerente / Directivo`, `Auditor`, `Usuario móvil`.
   - **Decisión D1 (Ranking para Gerente):** El Gerente / Directivo ve el ranking pero **sin posición ni cambio de posición** (`posicion: null`, `cambioPosicion: null`). Las columnas de posición se ocultan para este rol y el badge `#puesto / total` en gráficas no se muestra.
   - **Decisión D2 (Watchlist):** Exclusivamente el `Usuario móvil` puede agregar o quitar de su watchlist. Los demás roles que intenten escribir reciben `HTTP 403`.
   - **Acceso a Ranking y Comparador:** El `Usuario móvil` NO tiene acceso a `/ranking` ni a `/comparar` (recibe 403). El navbar y las rutas deben ocultar y proteger estas vistas.
   - **Manejo de HTTP 403 Forbidden:** Los perfiles sin permiso sobre un recurso reciben 403 (no datos vacíos). El frontend debe capturarlo limpiamente y presentar mensajes institucionales sin caerse.
3. **Lectura Obligatoria de la Skill de Diseño Visual:**
   - Antes de crear, modificar o refactorizar cualquier archivo `.jsx` o `.css`, el agente **DEBE** leer y aplicar todas las métricas cuantitativas y reglas de [`.agent/skills/clean-financial-design/SKILL.md`](./.agent/skills/clean-financial-design/SKILL.md).
4. **Resumen de Métricas Visuales Inquebrantables:**
   - **Cero cajas anidadas y bordes de 1px:** `border-radius: 8px`, `border: 1px solid rgba(0,0,0,0.08)`, sin sombras pesadas ni `translateY` en hover.
   - **Cero prosa explicativa (Zero Instructional Copy):** Prohibidos subtítulos redundantes debajo de `<h1>`, textos tutoriales de cómo hacer clic o filtrar, etiquetas repetidas en cada tarjeta y banners promocionales internos.
   - **Controles y barras compactas:** Inputs/selects/botones de `36px` de alto (`font-size: 13px`), barras de progreso `hairline` de `3px–4px`, y datos numéricos en `.mono-num` alineados a la derecha.
   - **Adaptabilidad Multi-Pantalla (`360px` a `1440px+`):** Uso obligatorio de `clamp()`, rejillas `auto-fit`/`auto-fill` y `ResizeObserver` en todas las gráficas.
