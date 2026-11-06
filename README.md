# ALZA · Portal Web Frontend (SIFTC)

> **Sistema de Información Financiera de Trazabilidad y Competitividad (SIFTC)**  
> **Identidad Comercial:** **ALZA** (*Datos trazables. Entidades que cotizan* · *Compara, decide, avanza*)  
> **Equipo Frontend:** Oscar Andrés Hundelshaussen Barreto · Rafael José Barriga Mejía · Sara Belén Alarcano Rincones · Reinel Alfaro Rosado

---

## Requisitos Previos

- **Node.js** `20+` y **npm**

---

## Cómo ejecutar el proyecto en tu computadora

### 1. Instalación y configuración de variables de entorno

```powershell
# 1. Instalar dependencias
npm install

# 2. Crear tu archivo .env local a partir de la plantilla
Copy-Item .env.example .env -Force

# 3. Iniciar servidor de desarrollo (http://localhost:5173)
npm run dev
```

### 2. Configuración de entorno (`.env`)

- **Conectado al Backend desplegado en Render (por defecto en `.env.example`):**
  ```env
  VITE_API_URL=https://siftc.onrender.com
  VITE_API_PREFIX=/api/v1
  ```
  El contrato oficial de la API publicada se encuentra documentado en [`docs/api/openapi-v1.json`](./docs/api/openapi-v1.json). El modo simulado (`USE_MOCK` / `VITE_USE_MOCK`) y el directorio `src/services/mocks/` de la primera entrega fueron eliminados por completo; todas las pantallas consultan únicamente la API externa (y muestran estados explícitos de carga o error si el servidor no responde).

---

## Scripts Disponibles

> [!WARNING]
> **Advertencia de seguridad — Scripts de diagnóstico (`scripts/`):** Todos los scripts de diagnóstico y exploración (`npm run diagnostico:api`, `npm run explorar:api`, `npm run ver:parametros`, `npm run probar:filtros`, `npm run ver:ohlc`) apuntan por defecto al backend en producción desplegado en Render (`https://siftc.onrender.com`). **No ejecutes estos scripts sin autorización previa ni los utilices para pruebas destructivas, de carga, inyección o fuerza bruta**, ya que interactúan directamente con el servicio publicado.

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Levanta el servidor local de Vite con HMR en `http://localhost:5173`. |
| `npm run lint` | Ejecuta validación estática ESLint sobre todo el proyecto. |
| `npm run build` | Genera el empaquetado optimizado de producción en `dist/`. |
| `npm run preview` | Sirve localmente el empaquetado de producción compilado. |
| `npm run diagnostico:api` | Verifica la disponibilidad del servicio en Render y contrasta sus rutas OpenAPI con `src/services/endpoints.js`. |
| `npm run explorar:api` | Inspecciona los esquemas de entrada y salida publicados en el OpenAPI del servidor. |
| `npm run ver:parametros` | Lista los parámetros de consulta y enumeraciones declaradas en el OpenAPI. |
| `npm run probar:filtros` | Prueba manualmente la respuesta de filtros del endpoint `/ranking`. |
| `npm run ver:ohlc` | Inspecciona la estructura devuelta por `/entidades/{id}/ohlc`. |

---

## Documentación Técnica del Repositorio

- [`docs/LOGIN_CONTEXT.md`](./docs/LOGIN_CONTEXT.md): Auditoría de seguridad ISO/IEC 27001:2022 (Control A.8.5), matriz de cumplimiento y contexto del módulo de Login.
- [`docs/api/openapi-v1.json`](./docs/api/openapi-v1.json): Especificación OpenAPI 3.1.1 del servicio desplegado (fuente de verdad del contrato de la API).
- [`DOC_PROYECTO_FRONTEND.md`](./DOC_PROYECTO_FRONTEND.md): Contexto funcional, alcance de Sprints y arquitectura.
- [`DICCIONARIO_DATOS_FRONTEND.md`](./DICCIONARIO_DATOS_FRONTEND.md): Contrato de las 15 columnas CSV y 10 métricas núcleo.
- [`MANUAL_MARCA_ALZA.md`](./MANUAL_MARCA_ALZA.md): Paleta cromática, tipografía y reglas de accesibilidad visual.
- [`UNIFICACION_DISCREPANCIAS_EQUIPO.md`](./UNIFICACION_DISCREPANCIAS_EQUIPO.md): Integración de los aportes de Rafael, Reynel, Belén y Oscar.
- [`SEGURIDAD_Y_VALIDACIONES_AUTENTICACION.md`](./SEGURIDAD_Y_VALIDACIONES_AUTENTICACION.md): Estándares de normalización UTF-8, tope de 10 intentos y validaciones de entrada.
