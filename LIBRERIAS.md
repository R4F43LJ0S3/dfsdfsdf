# Justificación y Catálogo de Librerías - Frontend SIFTC

> **Sistema de Información Financiera de Trazabilidad y Competitividad (SIFTC)**  
> **Framework Base:** React 19 + Vite  
> **Corte:** Momento 2 (Sprints 1 y 2)

Este documento detalla cada una de las librerías seleccionadas para el proyecto, explicando de forma precisa **para qué sirve**, **por qué fue elegida frente a otras alternativas** y **en qué requerimiento específico se utiliza**.

---

## 1. Librerías Principales a Instalar

### 1.1 `lightweight-charts` (TradingView)
- **¿Para qué sirve?**  
  Es la biblioteca especializada de alto rendimiento desarrollada por TradingView para renderizar gráficos financieros interactivos (velas japonesas/candlestick, líneas, áreas y barras de volumen).
- **¿Por qué se elige?**  
  - **Requisito explícito del proyecto:** La guía del proyecto Frontend y el documento de requerimientos exigen específicamente *Lightweight Charts* para la Historia **HU-FE-02** ("Gráficas de velas y líneas").
  - **Rendimiento:** Está construida en HTML5 Canvas nativo, optimizada para responder en milisegundos con miles de puntos de datos sin congelar la interfaz.
  - **Interactividad bursátil nativa:** Trae de fábrica soporte para scroll, zoom temporal, escalas de precios y tiempos, tooltips y formateo financiero.
- **Alternativas descartadas:**  
  - *Chart.js*: Aunque es popular, no está especializada en trading y el soporte para velas japonesas requiere plugins externos inestables.
  - *ApexCharts / Recharts*: Tienen un rendimiento notablemente más lento cuando se manejan series históricas largas con navegación fluida.

---

### 1.2 `axios`
- **¿Para qué sirve?**  
  Es un cliente HTTP basado en promesas para realizar peticiones (GET, POST, etc.) a la API REST construida por el equipo de Backend (FastAPI).
- **¿Por qué se elige?**  
  - **Interceptores de petición y respuesta:** Permite inyectar de forma centralizada y automática el header `Authorization: Bearer <TOKEN>` en cada consulta sin repetir código en cada componente.
  - **Gestión centralizada de errores (401/403):** Permite capturar automáticamente cuando un token JWT ha expirado o no es válido, cerrando la sesión y redirigiendo al usuario al login.
  - **Transformación de datos y timeouts:** Manejo más predecible de respuestas JSON y tiempos de espera en comparación con la API nativa `fetch`.
- **Alternativas descartadas:**  
  - *Fetch nativo de JavaScript*: Requiere escribir lógica manual repetitiva para manejo de cabeceras, serialización JSON y captura de códigos de estado HTTP de error.

---

### 1.3 `lucide-react`
- **¿Para qué sirve?**  
  Es una colección completa y moderna de iconos SVG limpios, accesibles y optimizados para React.
- **¿Por qué se elige?**  
  - **Requisito de accesibilidad (HU-FE-09 y HU-FE-01):** El documento exige que las variaciones de mercado **nunca dependan solo del color**, sino que siempre vayan acompañadas de símbolos obligatorios ($\blacktriangle$ / $\blacktriangledown$).
  - **Iconos necesarios en el proyecto:** Flechas de subida/bajada (`TrendingUp`, `TrendingDown`), filtros (`Filter`, `SlidersHorizontal`), ordenamiento de columnas (`ArrowUpDown`, `ChevronUp`, `ChevronDown`), navegación (`LayoutDashboard`, `Trophy`, `LogOut`, `User`).
  - **Cero impacto en peso (Tree-shaking):** Solo se incluyen en el empaquetado final los iconos que realmente importamos, manteniendo el peso del bundle mínimo para cumplir la meta de carga `< 3 segundos`.
- **Alternativas descartadas:**  
  - *FontAwesome*: Muy pesada y requiere configuraciones complejas de fuentes o paquetes gigantes.
  - *React Icons*: Paquete con dependencias pesadas e inconsistencia de diseño entre librerías heterogéneas.

---

## 2. Dependencias Ya Instaladas en el Proyecto

### 2.1 `react` y `react-dom` (v19)
- **¿Para qué sirve?**  
  Núcleo de la interfaz basada en componentes declarativos y renderizado reactivo del DOM.
- **¿Por qué se utiliza?**  
  Es el estándar moderno de la industria para desarrollo web modular y la base solicitada para el cliente web del SIFTC.

### 2.2 `react-router-dom` (v7)
- **¿Para qué sirve?**  
  Enrutamiento dinámico en aplicaciones de una sola página (SPA).
- **¿Por qué se utiliza?**  
  - Permite navegar entre `/login`, `/dashboard` y `/ranking` sin recargar la página completa.
  - Soporta **Query Parameters** para cumplir el requerimiento de la historia **HU-FE-04** (guardar filtros de sector, dimensión y periodo en la URL para compartir o recargar).
  - Facilita la creación de rutas protegidas mediante componentes de orden superior (`ProtectedRoute`).

### 2.3 `vite`
- **¿Para qué sirve?**  
  Servidor de desarrollo ultrarrápido y empaquetador para producción (bundler).
- **¿Por qué se utiliza?**  
  Ofrece recarga en caliente instantánea (*Hot Module Replacement - HMR*), tiempos de compilación casi inmediatos y genera archivos estáticos optimizados para la evaluación final ante el docente.

---

## 3. Resumen de Dependencias del Proyecto

```json
{
  "dependencies": {
    "axios": "^1.7.x",
    "lightweight-charts": "^4.2.x",
    "lucide-react": "^0.475.x",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "react-router-dom": "^7.18.4"
  }
}
```
