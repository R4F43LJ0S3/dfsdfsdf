// HU-FE-05 · Comparar entidades
// Reglas y catálogos del comparador. Si cambia un límite o una columna, se corrige SOLO aquí.

export const MIN_ENTIDADES = 2
export const MAX_ENTIDADES = 4

// La selección se guarda en la URL (?entidades=ENT001,ENT004&periodo=Trimestral)
// y, como respaldo, en localStorage para recuperarla al volver a /comparar sin parámetros.
export const PARAM_ENTIDADES = 'entidades'
export const PARAM_PERIODO = 'periodo'
export const CLAVE_ALMACEN = 'siftc_comparador'

// Cada entidad seleccionada recibe un color Y un patrón de línea, para que nunca
// se distinga solo por color (regla de accesibilidad de HU-FE-09).
// claro / oscuro: tono para cada tema; patron: estilo de línea en gráfica y leyenda.
export const SERIES_COMPARADOR = [
  { claro: '#264E7A', oscuro: '#8DB8E8', patron: 'solida', descripcion: 'línea continua' },
  { claro: '#1E874E', oscuro: '#5FD08F', patron: 'discontinua', descripcion: 'línea discontinua' },
  { claro: '#B7791F', oscuro: '#F2C14E', patron: 'punteada', descripcion: 'línea punteada' },
  { claro: '#6B3FA0', oscuro: '#C3A6F5', patron: 'rayas-largas', descripcion: 'línea de rayas largas' },
]

// Columnas de la tabla comparativa (CA 2: métricas en columnas).
// mejor: 'mayor' | 'menor' indica qué valor se resalta como el mejor de la fila de entidades.
export const COLUMNAS_METRICAS = [
  { clave: 'ic', titulo: 'IC general', detalle: 'Índice de Competitividad (0 a 100)', mejor: 'mayor', tipo: 'indice' },
  { clave: 'variacionPct', titulo: 'Variación', detalle: 'Variación porcentual frente al corte anterior', mejor: 'mayor', tipo: 'variacion' },
  { clave: 'posicion', titulo: 'Posición', detalle: 'Puesto en el ranking general del periodo', mejor: 'menor', tipo: 'posicion' },
  { clave: 'Rentabilidad', titulo: 'Rentabilidad', detalle: 'Puntaje de la dimensión (pesa 35 % del IC)', mejor: 'mayor', tipo: 'dimension' },
  { clave: 'Liquidez', titulo: 'Liquidez', detalle: 'Puntaje de la dimensión (pesa 20 % del IC)', mejor: 'mayor', tipo: 'dimension' },
  { clave: 'Solvencia', titulo: 'Solvencia', detalle: 'Puntaje de la dimensión (pesa 20 % del IC)', mejor: 'mayor', tipo: 'dimension' },
  { clave: 'Crecimiento', titulo: 'Crecimiento', detalle: 'Puntaje de la dimensión (pesa 25 % del IC)', mejor: 'mayor', tipo: 'dimension' },
]

export const DIMENSIONES_COMPARADOR = COLUMNAS_METRICAS.filter((c) => c.tipo === 'dimension').map((c) => c.clave)
