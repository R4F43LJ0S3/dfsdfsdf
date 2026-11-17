// Unidad de medida de cada métrica del catálogo oficial.
//
// Fuente: DICCIONARIO_DATOS_FRONTEND.md (columna "Unidad") y DAT-50 del glosario
// del diccionario de datos ("unidad_metrica": proporción, veces o puntos del IC).
//
// Por qué existe esta tabla: el contrato del servicio (docs/api/openapi-v1.json,
// esquema MetricaDto) NO expone la unidad; solo manda "valor" descrito como
// "proporción o veces, según la métrica". Sin la unidad, el frontend no puede saber
// si 0.0634 es 6,34 % o 0,06 veces.
//
// Cómo retirarla: cuando el backend agregue "unidad" a MetricaDto, o cuando se
// consuma GET /api/v1/diccionario/{codigo} (DiccionarioFichaDto.unidad), esa unidad
// se usa automáticamente — unidadDeMetrica() ya le da prioridad sobre esta tabla.

export const UNIDADES = Object.freeze({
  PROPORCION: 'proporcion', // se guarda como 0.12 y se muestra como 12,00 %
  VECES: 'veces',           // se muestra como 1,17 veces
  PUNTOS: 'puntos',         // puntos del IC, escala 0 a 100
  DESCONOCIDA: 'desconocida',
})

// Catálogo oficial de métricas del IC (DICCIONARIO_DATOS_FRONTEND.md, sección 2)
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

// Acepta lo que mande el diccionario o el backend en texto libre y lo lleva al catálogo.
function normalizarUnidad(texto) {
  const limpio = String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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

// Unidad de una métrica. Si el servicio alguna vez manda la unidad, esa gana.
export function unidadDeMetrica(metrica) {
  if (!metrica) return UNIDADES.DESCONOCIDA

  const delServicio = normalizarUnidad(metrica.unidad ?? metrica.unidadMetrica)
  if (delServicio) return delServicio

  const codigo = String(metrica.codigoMetrica ?? '').trim().toUpperCase()
  return UNIDAD_POR_CODIGO[codigo] ?? UNIDADES.DESCONOCIDA
}
