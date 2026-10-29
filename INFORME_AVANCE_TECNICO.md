# Informe Técnico Consolidado de Avance y Arquitectura - Frontend ALZA (SIFTC)

> **Proyecto:** Sistema de Información Financiera de Trazabilidad y Competitividad (SIFTC)  
> **Nombre Comercial / Marca:** **ALZA** (*Datos trazables. Entidades que cotizan*)  
> **Lema:** *Compara · Decide · Avanza*  
> **Responsable:** Oscar Andrés Hundelshaussen Barreto  
> **Rama de Trabajo:** `Oscar`  
> **Fecha:** Octubre 14, 2026

---

## 1. Resumen Ejecutivo de la Sesión

Durante esta jornada se estableció la base estructural, técnica, visual y arquitectónica completa del cliente web **ALZA**. Además, se ejecutó con éxito una estrategia de integración continua en Git para fusionar y reorganizar el trabajo preliminar de las compañeras del equipo sin generar conflictos ni deuda técnica.

El proyecto pasó de ser una plantilla vacía de Vite + React a una aplicación modularizada, documentada, con identidad de marca oficial, dependencias especializadas instaladas y una prueba de compilación de producción ejecutada en **504 ms con 0 errores**.

---

## 2. Paso a Paso Detallado de lo Realizado

### Fase 1: Análisis de Requerimientos y Comprensión del Entorno
1. **Inspección del Entorno de Ejecución:**
   - Se verificó la naturaleza del entorno de desarrollo Google Antigravity y se conectó la herramienta MCP para integración con prototipos de **Google Stitch** (`C:\Users\oscar\.gemini\config\mcp_config.json`).
2. **Lectura y Desglose de Requerimientos:**
   - Se analizaron los 4 documentos oficiales del proyecto: *Levantamiento de Requerimientos (BRD/SRS)*, *Guía del Frontend*, *Historias de Usuario Detalladas* y *Estructura del Proyecto*.
   - Se extrajo el rol asignado a **Oscar**: Crear la arquitectura modular, definir las rutas y login, preparar los datos simulados (Mock Data) para el Sprint 1 y conectar la API real de FastAPI en el Sprint 2.
3. **Generación del Documento Maestro de Contexto:**
   - Se creó [`DOC_PROYECTO_FRONTEND.md`](file:///d:/Universidad/SISTEMA%20INFO/Proyectos/frontend-siftc/DOC_PROYECTO_FRONTEND.md) con el resumen de alcance, roles, criterios de aceptación DoR/DoD y el glosario de términos financieros bursátiles (Ticker, IC, OHLC, Velas Japonesas, Top Gainers/Losers).

---

### Fase 2: Diseño de la Arquitectura Modular y Selección de Librerías
1. **Definición de la Estructura Modular por Dominio:**
   - Se descartó la estructura genérica plana y se adoptó una arquitectura por características (*Feature-Driven*), separando las carpetas según las Historias de Usuario de cada miembro del equipo (`charts/`, `ticker/`, `dashboard/`, `ranking/`, `common/`, `layout/`, `services/mocks/`).
2. **Evaluación y Justificación de Dependencias:**
   - Se creó el documento [`LIBRERIAS.md`](file:///d:/Universidad/SISTEMA%20INFO/Proyectos/frontend-siftc/LIBRERIAS.md) justificando la selección de:
     - `lightweight-charts`: Librería nativa en Canvas de TradingView para renderizar series financieras interactivas (HU-FE-02).
     - `axios`: Cliente HTTP para manejo de interceptores JWT y control centralizado de errores 401.
     - `lucide-react`: Iconografía SVG ligera y optimizada para cumplir la regla de accesibilidad obligatoria ($\blacktriangle$ y $\blacktriangledown$).
3. **Instalación:**
   - Se ejecutó `npm install lightweight-charts axios lucide-react` actualizando de forma limpia el árbol de dependencias.

---

### Fase 3: Estandarización con el Diccionario de Datos
1. **Alineación con el Equipo de Datos:**
   - Se procesaron las fichas técnicas (`HU-DD-01`, `HU-DD-03`, `HU-DD-05`).
   - Se identificaron las **15 columnas estrictas** de la matriz CSV (`codigo_entidad`, `nombre_entidad`, `sector`, `periodo`, `utilidad_neta`, `patrimonio`, etc.).
   - Se mapearon las 10 métricas financieras, fórmulas y umbrales semafóricos (Verde, Amarillo, Rojo), así como casos de excepción (denominadores en cero o patrimonio negativo).
2. **Documento Técnico de Contrato de Datos:**
   - Se redactó [`DICCIONARIO_DATOS_FRONTEND.md`](file:///d:/Universidad/SISTEMA%20INFO/Proyectos/frontend-siftc/DICCIONARIO_DATOS_FRONTEND.md) con las interfaces TypeScript/JS de los modelos `MarketEntity`, `OHLCBar` y `RankingItem`.
3. **Actualización de Seguridad en Git:**
   - Se actualizó el archivo [`.gitignore`](file:///d:/Universidad/SISTEMA%20INFO/Proyectos/frontend-siftc/.gitignore) protegiendo variables de entorno (`.env*`), logs y temporales.

---

### Fase 4: Identidad de Marca y Sistema de Diseño "ALZA"
1. **Extracción y Despliegue de Activos:**
   - Se procesó el paquete comprimido recibido y se extrajeron los logos oficiales a [`src/assets/`](file:///d:/Universidad/SISTEMA%20INFO/Proyectos/frontend-siftc/src/assets):
     - `LOGO COMPLETO .png`: Imagotipo con la A ascendente y lema para el Login.
     - `ALSA LOGO (BLANCO).png`: Versión para superficies oscuras (Navbar/Ticker).
     - `ALSA LOGO (NEGRO).png`: Versión para fondos claros.
2. **Configuración de Variables CSS:**
   - Se construyó [`src/styles/variables.css`](file:///d:/Universidad/SISTEMA%20INFO/Proyectos/frontend-siftc/src/styles/variables.css) con la paleta cromática exacta:
     - **Azul Noche** (`#151D33`): Fondos oscuros, Navbar, títulos de alto contraste.
     - **Azul Acero** (`#264E7A`): Color primario para botones, enlaces y gráficas continuas.
     - **Verde Alza** (`#24A460`): Color de acento, indicador de subidas ($\blacktriangle$) y botones de acción.
     - **Blanco Hueso** (`#F6F5F3`): Lienzo base de la interfaz (60% del espacio) para evitar la fatiga visual.
     - **Semáforo Financiero**: Tokens `--color-bullish`, `--color-bearish` (`#E03E3E` con $\blacktriangledown$) y `--color-warning` (`#E5A11A`).
3. **Manual de Marca Oficial:**
   - Se generó [`MANUAL_MARCA_ALZA.md`](file:///d:/Universidad/SISTEMA%20INFO/Proyectos/frontend-siftc/MANUAL_MARCA_ALZA.md) detallando la filosofía, reglas de uso, regla de distribución armónica 60-25-10-5, tipografía (`Inter` + `JetBrains Mono` con números tabulares) y breakpoints responsivos (360px, 768px, 1280px).

---

### Fase 5: Estrategia Git y Fusión Limpia de Cambios de Belén
1. **Guardado del Trabajo Propio:**
   - Se realizó el cambio a la rama asignada (`git checkout Oscar`).
   - Se realizó el commit de la estructura base y estilos (`commit 6576726`) y se envió al repositorio remoto (`git push origin Oscar`).
2. **Aislamiento en Subrama de Integración:**
   - Se creó la rama temporal `feature/merge-belen` para no comprometer la estabilidad de la rama principal ante posibles conflictos.
3. **Fusión y Resolución de Conflictos:**
   - Se trajeron los cambios de Belén (`git merge origin/Belen`).
   - Se resolvió el conflicto en `package.json` unificando las dependencias de ambas ramas sin perder ninguna librería.
   - Se regeneró `package-lock.json` mediante `npm install` garantizando un árbol íntegro.
4. **Reorganización y Refactorización del Código Integrado:**
   - El componente de gráficas de Belén (`GraficaEntidad.jsx`) fue trasladado a la ubicación estándar [`src/components/charts/FinancialChart.jsx`](file:///d:/Universidad/SISTEMA%20INFO/Proyectos/frontend-siftc/src/components/charts/FinancialChart.jsx).
   - Sus estilos fueron migrados a `FinancialChart.css` y vinculados correctamente.
   - Los datos simulados de prueba fueron trasladados a [`src/services/mocks/ohlcMocks.js`](file:///d:/Universidad/SISTEMA%20INFO/Proyectos/frontend-siftc/src/services/mocks/ohlcMocks.js).
   - Se eliminaron archivos `.js` vacíos obsoletos (`file.js`, `tablero.js`, `ticker.js`, `ranking.js`, `layout.js`).
   - Se actualizaron las referencias en `Dashboard.jsx` y `AppRouter.jsx`.
5. **Merge Definitivo y Limpieza:**
   - Se conmutó de vuelta a `Oscar`, se aplicó un *Fast-forward merge* de la subrama (`commit 6fe7892`) y se envió a GitHub (`git push origin Oscar`).
   - Se eliminó la rama temporal `feature/merge-belen`.
6. **Prueba de Verificación Final:**
   - Se ejecutó `npm run build` en Vite, logrando un empaquetado exitoso en solo **504 ms**.

---

## 3. Estado Actual del Repositorio

```
frontend-siftc/ (Rama: Oscar)
├── DICCIONARIO_DATOS_FRONTEND.md     # Fichas técnicas, 15 campos CSV y métricas
├── DOC_PROYECTO_FRONTEND.md          # Especificaciones del proyecto y glosario
├── LIBRERIAS.md                      # Justificación de dependencias técnicas
├── MANUAL_MARCA_ALZA.md              # Manual de identidad visual y guía de estilos
├── package.json                      # React 19, Vite, Lightweight Charts, Axios, Lucide
├── src/
│   ├── assets/                       # Logos oficiales ALZA (blanco, negro, completo)
│   ├── components/
│   │   ├── charts/
│   │   │   ├── FinancialChart.jsx    # Gráfica interactiva de velas y líneas (HU-FE-02)
│   │   │   └── FinancialChart.css    # Estilos del componente financiero
│   │   ├── common/                   # Componentes atómicos reutilizables
│   │   ├── dashboard/                # Módulo para Ticker y Top 5 (HU-FE-01)
│   │   ├── layout/                   # Navbar, Footer y Layout
│   │   └── ranking/                  # Módulo para tabla con filtros (HU-FE-04)
│   ├── pages/
│   │   ├── Dashboard.jsx             # Vista de demostración de mercado
│   │   └── Login.jsx                 # Pantalla de acceso ALZA con validaciones
│   ├── routes/
│   │   └── AppRouter.jsx             # Enrutador con rutas /login, /dashboard, /grafica
│   ├── services/
│   │   ├── api.js                    # Cliente HTTP base
│   │   └── mocks/
│   │       └── ohlcMocks.js          # Serie de datos OHLC diaria
│   └── styles/
│       ├── index.css                 # Reset global y badges semafóricos (▲ / ▼)
│       ├── Login.css                 # Estilos del Login responsive
│       └── variables.css             # Paleta cromática oficial de ALZA
```

---

## 4. Próximos Pasos Recomendados (Continuación Sprint 1)

1. **Implementar `AuthContext.jsx` y `ProtectedRoute.jsx`:**
   - Manejar el estado global del usuario logueado, roles (`Analista`, `Consulta`/`Directivo`) y proteger las rutas privadas.
2. **Completar los Mocks de Datos en `src/services/mocks/`:**
   - `marketMocks.js`: Lista de 10 entidades con variación porcentual, IC y sector para el Ticker y Top 5 (apoyo a Rafael).
   - `rankingMocks.js`: Lista completa con dimensiones para la tabla con ordenación y filtros (apoyo a Reinel).
3. **Construir el `MainLayout.jsx`:**
   - Diseñar la barra superior con el logo blanco de ALZA, selector de usuario y contenedor global adaptativo (360px a 1280px).
