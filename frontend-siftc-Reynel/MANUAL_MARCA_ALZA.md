# Manual de Identidad Visual y Guía de Estilos - ALZA (SIFTC)

> **Marca:** ALZA · Datos trazables. Entidades que cotizan.  
> **Lema / Tagline:** *Compara · Decide · Avanza*  
> **Área:** Frontend (HU-FE-09 - Colores institucionales y diseño responsive)  
> **Responsables:** Rafael José Barriga Mejía, Sara Belén Alarcano Rincones, Oscar Andrés Hundelshaussen Barreto y Reinel Alfaro Rosado.

---

## 1. Filosofía y Concepto de Marca

**ALZA** nace como la evolución visual del **Sistema de Información Financiera de Trazabilidad y Competitividad (SIFTC)**. Su propósito es transformar datos contables y financieros dispersos en una experiencia analítica dinámica, inspirada en las terminales bursátiles más modernas.

- **Nombre:** *ALZA* evoca crecimiento, superación de métricas, optimismo financiero y dirección ascendente.
- **Identificador Verbal:** *Datos trazables. Entidades que cotizan.*
- **Lema (Tagline):** *Compara · Decide · Avanza* (resume el flujo de valor para gerentes y analistas: comparar entidades, tomar decisiones estratégicas fundamentadas y avanzar hacia mayor competitividad).
- **Metáfora Visual:** La letra capitular **A** estilizada integra una flecha verde en trayectoria ascendente que atraviesa un histograma de barras financieras, simbolizando el paso de datos brutos a tendencias de alto rendimiento.

---

## 2. Inventario de Logotipos y Reglas de Aplicación

Todos los archivos gráficos originales se encuentran en [`src/assets/`](file:///d:/Universidad/SISTEMA%20INFO/Proyectos/frontend-siftc/src/assets):

### 2.1 `LOGO COMPLETO .png` (Versión Primaria / Hero)
- **Descripción:** Imagotipo completo compuesto por el isotipo (letra A con gráfico de barras y flecha ascendente verde) + la palabra **ALZA** en tipografía geométrica estilizada + el lema *COMPARA · DECIDE · AVANZA* en la parte inferior.
- **Fondos permitidos:** Fondo Blanco hueso (`#F6F5F3`) o Blanco puro (`#FFFFFF`).
- **Casos de uso:**
  - Pantalla principal de **Inicio de Sesión (`LoginPage.jsx`)**.
  - Portadas de reportes o dashboards ejecutivos descargables.
  - Vistas de bienvenida o estados vacíos (*empty states*).
- **Prohibiciones:** No deformar su proporción ni colocarlo sobre fondos oscuros sin el contraste adecuado.

### 2.2 `ALSA LOGO (BLANCO).png` (Versión Negativa / Modo Noche)
- **Descripción:** Versión monocromática clara del imagotipo y logotipo en blanco de alto brillo sobre fondo transparente.
- **Fondos permitidos:** Fondo Azul noche (`#151D33`) o cualquier superficie oscura superior al 70% de opacidad.
- **Casos de uso:**
  - Barra de navegación principal (**Navbar** oscuro en el layout global).
  - Ticker de cotizaciones superior.
  - Pie de página institucional (**Footer**).
- **Prohibiciones:** Nunca colocar sobre fondos claros o con colores de bajo contraste.

### 2.3 `ALSA LOGO (NEGRO).png` (Versión Positiva / Modo Claro)
- **Descripción:** Versión en contraste oscuro (Azul noche / Negro) sobre fondo transparente.
- **Fondos permitidos:** Fondos claros, Blanco hueso (`#F6F5F3`) o tarjetas en blanco puro.
- **Casos de uso:**
  - Versiones de navegación con Navbar claro.
  - Membretes, documentos de exportación o impresiones.
  - Paneles laterales colapsables con fondo claro.

---

## 3. Paleta Oficial de Colores: Especificación y Usos Detallados

La paleta cromática de ALZA combina la sobriedad y seriedad del sector bancario/financiero con el dinamismo y frescura de los mercados en crecimiento.

```
+-----------------------------------------------------------------------------------------+
|                                    PALETA OFICIAL ALZA                                  |
|                                                                                         |
|   [ #151D33 ]           [ #264E7A ]           [ #24A460 ]           [ #F6F5F3 ]         |
|   Azul Noche            Azul Acero            Verde Alza            Blanco Hueso        |
|   (Fondos/Títulos)      (Primario/Acciones)   (Acento/Subidas ▲)    (Superficies/Base)  |
+-----------------------------------------------------------------------------------------+
```

### 3.1 Color 01: Azul Noche (`#151D33`)
- **Especificaciones Técnicas:**
  - **HEX:** `#151D33`
  - **RGB:** `21, 29, 51`
  - **HSB:** `223°, 58%, 20%`
  - **CMYK:** `100, 87, 47, 61`
  - **Variable CSS:** `--color-azul-noche`
- **Significado Psicológico:** Transmite solidez institucional, rigor analítico, confidencialidad, prestigio y autoridad técnica.
- **Usos Específicos en la Interfaz:**
  - Fondo de la barra superior (**Navbar**) para enmarcar la aplicación y generar contraste profesional.
  - Fondo de la cinta horizontal del **Ticker de Cotizaciones** (`TickerTape`).
  - Color de tipografía para **títulos principales (H1, H2)** y textos de alto énfasis sobre fondo claro.
  - Bordes oscuros y líneas divisorias de tablas complejas.

### 3.2 Color 02: Azul Acero (`#264E7A`)
- **Especificaciones Técnicas:**
  - **HEX:** `#264E7A`
  - **RGB:** `38, 78, 122`
  - **HSB:** `210°, 68%, 47%`
  - **CMYK:** `92, 67, 28, 13`
  - **Variable CSS:** `--color-azul-acero`
  - **Variante Hover:** `#1E3D60` (`--color-azul-acero-hover`)
  - **Variante Fondo Tenue:** `#EBF2F9` (`--color-azul-acero-light`)
- **Significado Psicológico:** Confianza, dinamismo corporativo, serenidad y precisión analítica.
- **Usos Específicos en la Interfaz:**
  - **Color primario de interacción:** Botones de acción principal (Ingresar, Aplicar Filtros, Descargar).
  - Enlaces de navegación activos y pestañas seleccionadas (*Tabs*).
  - Línea principal de tendencia en la gráfica interactiva cuando se visualiza en modo continuo (*Line Chart*).
  - Anillos de foco y estados activos de campos de texto (`inputs` y `selects`).

### 3.3 Color 03: Verde Alza (`#24A460`)
- **Especificaciones Técnicas:**
  - **HEX:** `#24A460`
  - **RGB:** `36, 164, 96`
  - **HSB:** `146°, 78%, 64%`
  - **CMYK:** `78, 5, 78, 0`
  - **Variable CSS:** `--color-verde-alza` / `--color-bullish`
  - **Variante Fondo Badges:** `#E8F7EF` (`--color-verde-alza-bg`)
  - **Variante Bordes:** `#A3E0BF` (`--color-bullish-border`)
- **Significado Psicológico:** Crecimiento económico, competitividad sobresaliente, éxito, salud financiera y dirección alcista.
- **Usos Específicos en la Interfaz:**
  - **Indicador de Variación Positiva (Alcista / Bullish):** Siempre acompañado obligatoriamente del símbolo $\blacktriangle$ o icono `TrendingUp`.
  - Color de las **velas verdes alcistas** en la gráfica de `lightweight-charts`.
  - Tarjeta de **Top 5 Ganadores** (resaltando los valores con mayor rendimiento del corte).
  - Estado de éxito (*Success*) en operaciones y mensajes de confirmación.

### 3.4 Color 04: Blanco Hueso (`#F6F5F3`)
- **Especificaciones Técnicas:**
  - **HEX:** `#F6F5F3`
  - **RGB:** `246, 245, 243`
  - **HSB:** `39°, 1%, 96%`
  - **CMYK:** `4, 4, 5, 0`
  - **Variable CSS:** `--color-blanco-hueso`
- **Significado Psicológico:** Calidez, sofisticación editorial, legibilidad prolongada y descanso visual (evita la fatiga ocular producida por el blanco puro `#FFFFFF`).
- **Usos Específicos en la Interfaz:**
  - **Lienzo de fondo global (Background)** de toda la aplicación web.
  - Fondos de tarjetas secundarias, contenedores de filtros y zonas de lectura analítica.
  - Color de texto para elementos informativos colocados sobre el Azul noche.

---

## 4. Colores de Soporte y Semáforo Financiero (Reglas HU-FE-09 y HU-FE-01)

Por normativa de accesibilidad (accesibilidad financiera y personas con daltonismo), **el color nunca viaja solo**:

```
+-----------------------------------------------------------------------------------------+
|                              SEMÁFORO DE VARIACIÓN Y ALERTAS                            |
|                                                                                         |
|   ▲ Alcista / Saludable         ▼ Bajista / Alerta Crítica      ◆ Atención / Umbral     |
|   #24A460 (Verde Alza)          #E03E3E (Rojo Mercado)          #E5A11A (Ámbar Alerta)  |
|   Fondo: #E8F7EF                Fondo: #FDF0F0                  Fondo: #FEF8EC          |
+-----------------------------------------------------------------------------------------+
```

| Estado Financiero | Color Principal | Color de Fondo | Borde | Símbolo Requerido | Contexto de Aplicación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Alcista / Subida** | `#24A460` | `#E8F7EF` | `#A3E0BF` | $\blacktriangle$ | Entidades con $\Delta > 0\%$, ROE $\ge 10\%$, Razón Corriente $\ge 1.5$. |
| **Bajista / Caída** | `#E03E3E` | `#FDF0F0` | `#F5B5B5` | $\blacktriangledown$ | Entidades con $\Delta < -5\%$, ROE $< 0\%$, Endeudamiento $> 70\%$, Top 5 Perdedores. |
| **Alerta / Intermedio** | `#E5A11A` | `#FEF8EC` | `#F9DE9E` | $\bullet$ o $\blacktriangleright$ | Ratios en zona de atención (ej. Margen EBITDA entre $5\%$ y $15\%$). |

---

## 5. Proporción Armónica de Uso (Regla 60 - 25 - 10 - 5)

Para mantener una interfaz limpia, legible y sin sobrecarga visual, se establece la siguiente distribución de área en cada pantalla:

```
[==================== Blanco Hueso 60% ====================][==== Azul Noche 25% ====][= Acero 10% =][= Verde 5% =]
```

1. **60% Blanco Hueso (`#F6F5F3`):**  
   Domina el espacio. Es el fondo que envuelve el tablero, los espacios en blanco (*white-space*) y las áreas que permiten que las tablas y métricas respiren sin saturación.
2. **25% Azul Noche (`#151D33`):**  
   Estructura la arquitectura visual. Define el Navbar, la cabecera del Ticker, los títulos principales y los marcos de las tarjetas de mando.
3. **10% Azul Acero (`#264E7A`):**  
   Focaliza la interacción. Botones primarios, selects activos, líneas de la gráfica y elementos con los que el usuario interactúa.
4. **5% Verde Alza (`#24A460`):**  
   Focaliza la atención analítica. Únicamente reservado para indicadores de ganancia, badges alcistas, la flecha de identidad y micro-acentos de éxito.

---

## 6. Tipografía y Estilo de Números

### 6.1 Fuente para Interfaz: `Inter`
- **Familia:** `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Pesos:**
  - `Regular (400)`: Textos secundarios, descripciones y tablas.
  - `Medium (500)`: Etiquetas de filtros, menús y botones.
  - `SemiBold (600)`: Nombres de entidades, subtítulos y cabeceras de columnas.
  - `Bold (700)`: Cifras destacadas del Índice de Competitividad (IC) y títulos H1/H2.

### 6.2 Fuente para Datos Numéricos y Ratios: `JetBrains Mono` / Tabular Nums
- **Familia:** `'JetBrains Mono', 'Fira Code', 'Courier New', monospace`
- **Uso:** Ratios financieros, valores de apertura/cierre de velas OHLC y porcentajes de variación.
- **Justificación:** Al tener números monoespaciados con ancho fijo (*tabular figures*), las cifras en tablas y tickers nunca "bailan" ni se descuadran verticalmente al ordenar o refrescar.

---

## 7. Responsividad y Puntos de Quiebre (*Breakpoints*)

El diseño debe ajustarse rigurosamente a las resoluciones exigidas en el criterio de aceptación de **HU-FE-09**:

- **Mobile (360px - 767px):**
  - Ticker colapsado a visualización compacta horizontal con scroll táctil continuo.
  - Tablas con scroll horizontal interno (`overflow-x: auto`), sin desbordar el viewport.
  - Menú hamburguesa superior y navegación vertical.
- **Tablet (768px - 1279px):**
  - Grilla de 2 columnas para tarjetas de Top Ganadores y Top Perdedores.
  - Gráficas con controles temporales compactos.
- **Desktop (1280px en adelante):**
  - Vista completa tipo terminal de bolsa: Tarjeta del Índice General a la izquierda, Top 5 al centro/derecha y gráfica amplia con selector de periodo extendido.
