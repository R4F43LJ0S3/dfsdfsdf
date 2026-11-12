# Matriz de Permisos por Rol y Sensibilidad del Dato
**Proyecto:** SIFTC (ALZA) — Sistema de Información Financiera de Trazabilidad y Competitividad  
**Historia:** HU-FE-07 Control de acceso por rol y sensibilidad del dato  
**Corte:** Sprint 4 · Criterio CA 1  
**Versión:** 1.0 (Definición cerrada según documento oficial Backend / Diccionario de datos)  
**Fecha:** 2026-11-08 / Actualizado: 2026-11-12

---

## 1. Propósito
Definir qué puede ver o hacer cada uno de los seis perfiles del sistema según el recurso y su nivel de sensibilidad. Esta matriz es la referencia de control de acceso para el filtrado del backend (.NET y PostgreSQL) y para el frontend web (React / ALZA).

---

## 2. Perfiles Oficiales del Sistema

| Perfil | Nombre Canónico | Descripción |
| :--- | :--- | :--- |
| **Administrador** | `Administrador` | Gestiona usuarios, roles y parámetros del sistema. Control total. |
| **Data Steward** | `Data Steward` | Mantiene el diccionario de datos y las reglas de calidad. |
| **Analista financiero** | `Analista financiero` | Calcula, valida y publica métricas; gestiona umbrales y cargas. |
| **Gerente / Directivo** | `Gerente / Directivo` | Consulta rankings agregados y toma decisiones estratégicas. |
| **Auditor** | `Auditor` | Revisa linaje, bitácora y parámetros sin permisos de edición. |
| **Usuario móvil** | `Usuario móvil` | Consulta cotizaciones de mercado y mantiene su watchlist personal. |

---

## 3. Niveles de Sensibilidad del Dato

| Nivel | Criterio | Ejemplos |
| :--- | :--- | :--- |
| **Pública** | Puede verse sin restricción dentro del sistema. | Nombre y sector de la entidad, series históricas OHLC. |
| **Interna** | Usuarios autenticados con acceso al sistema. | Código de entidad, IC, valores de métricas, pesos del IC, bitácora. |
| **Confidencial** | Datos financieros detallados y posición competitiva. | Utilidad, patrimonio, activos, ingresos, posición en ranking general y sectorial. |
| **Restringida** | Identidad, credenciales y acceso de usuarios. | Usuario, rol, contraseña cifrada (bcrypt), datos personales. |

> **Regla fundamental:** Si un recurso contiene campos de varios niveles de sensibilidad, se le asigna el nivel más alto.

---

## 4. Matriz de Permisos (RBAC)

**Leyenda:**  
- **L:** Lectura  
- **E:** Escritura, carga o decisión  
- **SA:** Sin acceso (el backend responde `403 Forbidden`)

| Recurso | Sensibilidad | Administrador | Data Steward | Analista financiero | Gerente / Directivo | Auditor | Usuario móvil | Endpoint / Mapeo Backend |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Catálogo de entidades** | Interna | **L** | **L** | **L** | **L** | **L** | **L** | `GET /api/v1/entidades`, `GET /api/v1/entidades/{id}` |
| **Series OHLC** | Pública | **L** | **L** | **L** | **L** | **L** | **L** | `GET /api/v1/entidades/{id}/ohlc` |
| **IC y valores de métricas** | Interna | **L** | **L** | **L** | **L** | **L** | **L** | `GET /api/v1/metricas` |
| **Ranking general o por dimensión (sin posición)** | Interna | **L** | **L** | **L** | **L** | **L** | **SA** | `GET /api/v1/ranking` |
| **Posición en el ranking** | Confidencial | **L** | **L** | **L** | **SA** | **L** | **SA** | `GET /api/v1/ranking` (`posicion`, `cambioPosicion`) |
| **Watchlist personal ver** | Interna | **L** | **L** | **L** | **L** | **L** | **L** | `GET /api/v1/watchlist` |
| **Watchlist personal agregar o quitar** | Interna | **SA** | **SA** | **SA** | **SA** | **SA** | **E** | `POST/DELETE /api/v1/watchlist/{idEntidad}` |
| **Matriz financiera cruda carga** | Confidencial | **E** | **L** | **E** | **SA** | **L** | **SA** | `POST /api/v1/cargas` |
| **Datos financieros detallados** | Confidencial | **L** | **L** | **L** | **SA** | **L** | **SA** | Vistas analíticas detalladas |
| **Aprobación de cálculos bandeja y decisión** | Interna | **L** | **L** | **E** | **SA** | **L** | **SA** | `GET/POST /api/v1/aprobaciones/**` |
| **Parámetros del sistema** | Interna | **E** | **SA** | **E** | **SA** | **L** | **SA** | `GET/POST /api/v1/ic/configuracion/**`, `/parametros/**` |
| **Auditoría** | Interna | **L** | **SA** | **SA** | **SA** | **L** | **SA** | Bitácora y eventos críticos |
| **Gestión de usuarios y roles** | Restringida | **E** | **SA** | **SA** | **SA** | **SA** | **SA** | `POST /api/v1/usuarios/registrar` |

---

## 5. Decisiones de Diseño D1 a D5

- **D1 (Posición en el ranking para Gerente / Directivo):**
  - **Resultado: D1 = B.** El Gerente / Directivo ve el ranking (entidades, sector, IC y variación), pero **sin posición ni cambio de posición** (`posicion: null`, `cambioPosicion: null`). La posición competitiva es confidencial para este rol en este corte.
- **D2 (Operación de Watchlist):**
  - **Resultado: D2 = A.** Exclusivamente el **Usuario móvil** puede agregar o quitar entidades de la watchlist. Los demás roles que intenten escribir reciben `403 Forbidden`.
- **D3 (Lectura de parámetros por Auditor):**
  - **Resultado: D3 = A acotada.** Lectura de pesos, fórmulas y frecuencias, sin secretos y sin permisos de escritura.
- **D4 (Implementación de Auditoría):**
  - **Resultado: D4 = C mínima.** Registro de eventos críticos y consulta para Administrador y Auditor, sin inmutabilidad en este corte.
- **D5 (Clasificación de Auditoría y Watchlist):**
  - **Resultado: D5 = Interna** para ambos recursos.

---

## 6. Observaciones Técnicas de Integración Frontend
1. **Códigos de estado:** Un perfil sin permiso sobre un recurso recibe `HTTP 403 Forbidden` (no datos vacíos ni `200`). El frontend debe capturar el 403 y mostrar un mensaje limpio de acceso restringido en lugar de reintentos infinitos o pantallas en blanco.
2. **Navegación adaptativa:** Los enlaces del navbar y drawer móvil a `/ranking` y `/comparar` deben ocultarse si el usuario tiene rol `Usuario móvil`.
3. **Columna de posición confidencial:** Si el usuario es `Gerente / Directivo`, las columnas "Pos." y "Cambio" en `RankingTabla.jsx` y la columna "Posición" en `TablaComparativa.jsx` deben ocultarse o no renderizarse.
4. **Ficha de entidad:** En `FinancialChart.jsx`, el badge `#puesto / total` no debe mostrarse a `Gerente / Directivo` ni a `Usuario móvil`, y nunca deducirse por cliente si el rol no tiene acceso a datos confidenciales.
