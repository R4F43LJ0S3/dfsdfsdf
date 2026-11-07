# ALZA · Portal Web Frontend (SIFTC)

> **Sistema de Información Financiera de Trazabilidad y Competitividad (SIFTC)**  
> **Identidad Comercial:** **ALZA** (*Datos trazables. Entidades que cotizan* · *Compara, decide, avanza*)  
> **Equipo Frontend:** Oscar Andrés Hundelshaussen Barreto · Rafael José Barriga Mejía · Sara Belén Alarcano Rincones · Reinel Alfaro Rosado

---

## 1. Arquitectura y Tecnologías

- **Framework & Build:** React 19 + Vite 8 + React Router v7.
- **Gráficos Financieros:** TradingView Lightweight Charts (`lightweight-charts`).
- **Iconografía & Estilos:** Lucide React (`lucide-react`) + CSS Modular con variables de diseño.
- **Servicio Backend:** Desplegado de forma externa e independiente en **Render**:
  - URL Base: `https://siftc.onrender.com`
  - Prefijo de API: `/api/v1`
- **Fuente de Verdad Única:** [`docs/api/openapi-v1.json`](./docs/api/openapi-v1.json) (especificación OpenAPI 3.1.1 provista por el servicio en Render).
- **Entorno Limpio:** **Sin modo simulado (mock) ni backend local**. Toda la aplicación consulta exclusivamente la API externa en Render y maneja estados explícitos de carga, error y datos vacíos.

---

## 2. Requisitos Previos e Instalación

- **Node.js** `20+` y **npm**

```powershell
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno desde la plantilla
Copy-Item .env.example .env -Force

# 3. Iniciar servidor de desarrollo (http://localhost:5173)
npm run dev
```

### Configuración de Entorno (`.env`)

Por defecto, la plantilla `.env.example` apunta directamente al backend oficial en Render:

```env
VITE_API_URL=https://siftc.onrender.com
VITE_API_PREFIX=/api/v1
```

---

## 3. Scripts del Proyecto

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Levanta el servidor local de desarrollo con HMR en `http://localhost:5173`. |
| `npm run build` | Ejecuta la compilación y empaquetado optimizado de producción en `dist/`. |
| `npm run lint` | Ejecuta el análisis estático de código mediante ESLint. |
| `npm run preview` | Sirve localmente el paquete de producción generado en `dist/`. |

---

## 4. Estructura de Documentación del Repositorio

La documentación del proyecto se encuentra estructurada y organizada según su propósito:

### Documentación General en la Raíz
- [`README.md`](./README.md): Visión general, arquitectura, instalación y ejecución.
- [`DESPLIEGUE.md`](./DESPLIEGUE.md): Guía de despliegue en producción (Vercel / Netlify / Render Static).
- [`LIBRERIAS.md`](./LIBRERIAS.md): Catálogo y justificación de dependencias de producción y desarrollo.
- [`MANUAL_MARCA_ALZA.md`](./MANUAL_MARCA_ALZA.md): Guía de identidad visual, paleta cromática, tipografías y reglas de accesibilidad.

### Documentación Técnica y de Auditoría (`docs/`)
- [`docs/api/openapi-v1.json`](./docs/api/openapi-v1.json): Contrato OpenAPI 3.1.1 oficial del backend (fuente de verdad única del servicio).
- [`docs/LOGIN_CONTEXT.md`](./docs/LOGIN_CONTEXT.md): Contexto y auditoría de seguridad del módulo de autenticación bajo controles ISO/IEC 27001:2022 y OWASP ASVS v4.0.3.
- [`docs/auditoria-nombres-api.md`](./docs/auditoria-nombres-api.md): Auditoría de modelos y nombres de campo del frontend contrastados contra el OpenAPI.
- [`docs/LIMPIEZA_BACKEND_OBSOLETO_Y_ALCANCE_FRONTEND.md`](./docs/LIMPIEZA_BACKEND_OBSOLETO_Y_ALCANCE_FRONTEND.md): Registro de saneamiento del backend local previo y redefinición del alcance frontend.
- [`docs/PR_LIMPIEZA_MOCK.md`](./docs/PR_LIMPIEZA_MOCK.md): Descripción técnica de la eliminación integral del modo simulado (mocks).
