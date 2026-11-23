// Unidad de medida de cada métrica del catálogo oficial SIFTC.
// Fuente: Diccionario de Datos (src/data/diccionario_glosario_busqueda.csv) y contrato OpenAPI (MetricaDto).

export const UNIDADES = Object.freeze({
  PROPORCION: 'proporcion', // se guarda como 0.12 y se muestra como 12,00 %
  VECES: 'veces',           // se muestra como 1,17 veces
  PUNTOS: 'puntos',         // puntos del IC, escala 0 a 100
  DESCONOCIDA: 'desconocida',
})

// Catálogo oficial de métricas del IC
const UNIDAD_POR_CODIGO = Object.freeze({
  'RNT-01': UNIDADES.PROPORCION, // ROE
  'RNT-02': UNIDADES.PROPORCION, // ROA
  'RNT-03': UNIDADES.PROPORCION, // Margen EBITDA
  'LIQ-01': UNIDADES.VECES,      // Razón corriente
  'LIQ-02': UNIDADES.VECES,      // Prueba ácida
  'END-01': UNIDADES.PROPORCION, // Nivel de endeudamiento
  'END-02': UNIDADES.VECES,      // Cobertura de intereses
  'CRE-01': UNIDADES.PROPORCION, // Crecimiento de ingresos
  'CRE-02': UNIDADES.PROPORCION, // Variación de cotización
  'CAL-01': UNIDADES.PROPORCION, // Índice de calidad del dato
})

function normalizarUnidad(texto) {
  const limpio = String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

  if (!limpio) return null
  if (limpio.startsWith('proporcion') || limpio.includes('%') || limpio.startsWith('porcentaje')) {
    return UNIDADES.PROPORCION
  }
  if (limpio.startsWith('veces')) return UNIDADES.VECES
  if (limpio.startsWith('punto')) return UNIDADES.PUNTOS
  return null
}

export function unidadDeMetrica(metrica) {
  if (!metrica) return UNIDADES.DESCONOCIDA

  const delServicio = normalizarUnidad(metrica.unidad ?? metrica.unidadMetrica)
  if (delServicio) return delServicio

  const codigo = String(metrica.codigoMetrica ?? '').trim().toUpperCase()
  return UNIDAD_POR_CODIGO[codigo] ?? UNIDADES.DESCONOCIDA
}
