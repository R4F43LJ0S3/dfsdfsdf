# Diccionario Técnico de Datos y Métricas - SIFTC

> **Fuente Oficial:** Equipo Diccionario de Datos (HU-DD-01, HU-DD-03, HU-DD-05)  
> **Objetivo:** Garantizar 100% de coherencia en nombres de variables, formatos, rangos y umbrales entre Base de Datos, Backend (FastAPI), Mock Data y Frontend (React).

---

## 1. Columnas Oficiales de la Matriz CSV (15 Columnas Estrictas)

Estas son las **15 variables de entrada** que procesa el backend y que deben coincidir exactamente en el modelo de datos:

| Orden | Nombre Técnico (`snake_case`) | Nombre de Negocio | Tipo de Dato | Formato / Regla | Ejemplo | Clasificación |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `codigo_entidad` | Código de la entidad | Texto (6) | `ENT\d{3}` (ENT000 a ENT999) | `ENT001` | Interno |
| **2** | `nombre_entidad` | Nombre de la entidad | Texto (100) | No vacío, máx 100 caracteres | `Energía Andina S.A.` | Público |
| **3** | `sector` | Sector de la entidad | Texto (50) | No vacío, máx 50 caracteres | `Energía`, `Construcción` | Público |
| **4** | `periodo` | Periodo de reporte | Texto (7) | `AAAA-MM` (Mes 01 a 12, no futuro) | `2026-03` | Público |
| **5** | `utilidad_neta` | Utilidad neta | Decimal(16,2) | Punto decimal, puede ser negativo | `150.00` | Confidencial |
| **6** | `patrimonio` | Patrimonio | Decimal(16,2) | Punto decimal, puede ser negativo | `1000.00` | Confidencial |
| **7** | `activos_totales` | Activos totales | Decimal(16,2) | Mayor que 0 | `2500.00` | Confidencial |
| **8** | `ebitda` | EBITDA | Decimal(16,2) | Punto decimal, puede ser negativo | `450.00` | Confidencial |
| **9** | `ingresos` | Ingresos | Decimal(16,2) | $\ge 0$ | `1800.00` | Confidencial |
| **10** | `activo_corriente` | Activo corriente | Decimal(16,2) | $\ge 0$, $\le$ `activos_totales` | `900.00` | Confidencial |
| **11** | `pasivo_corriente` | Pasivo corriente | Decimal(16,2) | $\ge 0$, $\le$ `pasivo_total` | `600.00` | Confidencial |
| **12** | `inventarios` | Inventarios | Decimal(16,2) | $\ge 0$, $\le$ `activo_corriente` | `200.00` | Confidencial |
| **13** | `pasivo_total` | Pasivo total | Decimal(16,2) | $\ge 0$, Balance: `activos_totales = pasivo_total + patrimonio` | `1500.00` | Confidencial |
| **14** | `ebit` | EBIT | Decimal(16,2) | $\le$ `ebitda`, puede ser negativo | `330.00` | Confidencial |
| **15** | `gastos_financieros`| Gastos financieros | Decimal(16,2) | $\ge 0$ | `60.00` | Confidencial |

---

## 2. Catálogo Oficial de Métricas Financieras y Umbrales

Las métricas están agrupadas en **4 dimensiones** para el cálculo del **Índice de Competitividad (IC)**:

| Código | Métrica | Dimensión | Fórmula Técnica | Unidad | Frecuencia | Umbral Verde | Umbral Amarillo | Umbral Rojo | Casos Especiales en Frontend |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **RNT-01** | **ROE** (Rentabilidad / Patrimonio) | Rentabilidad (35%) | `utilidad_neta / patrimonio` | % | Mensual | $\ge 10\%$ (`0.10`) | $\ge 0\%$ y $< 10\%$ | $< 0\%$ | Si `patrimonio == 0`, mostrar `"No calculable"`. Si es negativo, advertir `"Revisar"`. |
| **RNT-03** | **Margen EBITDA** | Rentabilidad (35%) | `ebitda / ingresos` | % | Mensual | $\ge 15\%$ (`0.15`) | $\ge 5\%$ y $< 15\%$ | $< 5\%$ | Si `ingresos == 0`, no se calcula. |
| **LIQ-01** | **Razón corriente** | Liquidez (20%) | `activo_corriente / pasivo_corriente` | Veces | Mensual | $\ge 1.5$ | $\ge 1.0$ y $< 1.5$ | $< 1.0$ | Si `pasivo_corriente == 0`, no se calcula. |
| **END-01** | **Nivel de endeudamiento** | Solvencia (20%) | `pasivo_total / activos_totales` | % | Mensual | $\le 60\%$ (`0.60`) | $> 60\%$ y $\le 70\%$ | $> 70\%$ | **Lógica inversa:** mayor porcentaje indica mayor riesgo. |
| **CRE-01** | **Crecimiento de ingresos** | Crecimiento (25%) | `(ingresos_t - ingresos_t_1) / ingresos_t_1` | % | Mensual | $\ge 5\%$ (`0.05`) | $\ge 0\%$ y $< 5\%$ | $< 0\%$ | Requiere datos del periodo anterior. |
| **CRE-02** | **Variación de cotización** | Mercado | `(IC_t - IC_t_1) / IC_t_1` | % | Diaria/Mensual | $\ge 0\%$ | $\ge -5\%$ y $< 0\%$ | $< -5\%$ | Alimenta la subida/bajada ($\blacktriangle$ / $\blacktriangledown$) en el Ticker y Tablero. |
| **RNT-02** | **ROA** (Rentabilidad / Activos) | Rentabilidad | `utilidad_neta / activos_totales` | % | Mensual | $\ge 5\%$ (`0.05`) | $\ge 0\%$ y $< 5\%$ | $< 0\%$ | `activos_totales` siempre $> 0$. |
| **LIQ-02** | **Prueba ácida** | Liquidez | `(activo_corriente - inventarios) / pasivo_corriente` | Veces | Mensual | $\ge 1.0$ | $\ge 0.8$ y $< 1.0$ | $< 0.8$ | Si `pasivo_corriente == 0`, no se calcula. |
| **END-02** | **Cobertura de intereses** | Solvencia | `ebit / gastos_financieros` | Veces | Trimestral | $\ge 3.0$ | $\ge 1.5$ y $< 3.0$ | $< 1.5$ | Si `gastos_financieros == 0`, mostrar `"Sin gastos financieros"`. |
| **CAL-01** | **Calidad del dato** | Trazabilidad | `registros_validos / registros_totales` | % | Diaria | $\ge 98\%$ (`0.98`)| $\ge 95\%$ y $< 98\%$ | $< 95\%$ | Calculado por capa analítica. |

> **Nota Crítica para Frontend:**  
> Las fórmulas devuelven proporciones decimales (ejemplo: `0.12`). En pantalla, el frontend debe formatearlo como porcentaje con coma decimal en español (ejemplo: `12,00 %`).

---

## 3. Variables de Salida y Contrato de Datos para el Frontend

Para el **Sprint 1 y 2**, el frontend consumirá entidades procesadas por el motor analítico de Python. Esta es la estructura que adoptarán nuestros mocks y la API real:

### 3.1 Modelo de Entidad para Ticker y Tablero (`MarketItem`)
```typescript
interface MarketEntity {
  codigo_entidad: string;     // ej: "ENT001"
  nombre_entidad: string;     // ej: "Energía Andina S.A."
  sector: string;             // ej: "Energía"
  periodo: string;            // ej: "2026-03"
  indice_competitividad: number; // IC actual (0.00 a 100.00)
  variacion_porcentual: number;  // Variación respecto al corte anterior (ej: +2.45 o -1.20)
  direccion: 'UP' | 'DOWN' | 'EQUAL'; // Para renderizar ▲ verde o ▼ roja
}
```

### 3.2 Modelo de Serie OHLC para Gráficas (`OHLCDataPoint`)
Para la librería `lightweight-charts`:
```typescript
interface OHLCBar {
  time: string;   // Formato "YYYY-MM-DD" o timestamp UNIX
  open: number;   // IC al abrir
  high: number;   // IC máximo del periodo
  low: number;    // IC mínimo del periodo
  close: number;  // IC de cierre
}
```

### 3.3 Modelo de Ranking (`RankingItem`)
```typescript
interface RankingItem {
  posicion: number;               // 1, 2, 3...
  codigo_entidad: string;
  nombre_entidad: string;
  sector: string;
  periodo: string;
  indice_competitividad: number;
  variacion_porcentual: number;
  dimension_rentabilidad: number; // Ponderado de ROE, Margen EBITDA
  dimension_liquidez: number;     // Ponderado de Razón corriente, Prueba ácida
  dimension_solvencia: number;    // Ponderado de Endeudamiento, Cobertura
  dimension_crecimiento: number;  // Ponderado de Crecimiento de ingresos
}
```

---

## 4. Usuarios, Roles y Seguridad en el Diccionario

El diccionario estandariza las variables de sesión del usuario:

- `usuario`: Identificador de inicio de sesión (string, máx 50).
- `rol`: Rol asignado en el sistema. Valores estándar:
  - `Analista`: Rol operativo con permisos de revisión de cálculos.
  - `Consulta` / `Directivo`: Rol con permisos de lectura para tableros ejecutivos y rankings.
  - `Administrador`: Control general.
- `contrasena_hash`: Cifrado mediante algoritmo `bcrypt` (el frontend nunca recibe ni almacena el hash, únicamente envía la contraseña en texto plano por HTTPS durante el POST `/auth/login` y recibe el token `JWT`).
