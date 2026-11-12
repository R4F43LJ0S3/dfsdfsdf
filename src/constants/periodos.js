// Periodos y dimensiones documentados en el contrato oficial (docs/api/openapi-v1.json).
// - GET /api/v1/entidades/{id}/ohlc, GET /api/v1/ranking y GET /api/v1/metricas admiten periodo en minúsculas: 'diario' | 'mensual' | 'trimestral'
// - GET /api/v1/ranking admite dimension: 'Rentabilidad' | 'Liquidez' | 'Solvencia' | 'Crecimiento'

export const PERIODOS = [
  { id: 'diario', nombre: 'Diaria' },
  { id: 'mensual', nombre: 'Mensual' },
  { id: 'trimestral', nombre: 'Trimestral' },
]

export const PERIODO_POR_DEFECTO = 'mensual'

export const nombrePeriodo = (id) =>
  PERIODOS.find(
    (p) =>
      p.id === id ||
      p.id === String(id).toLowerCase() ||
      p.nombre.toLowerCase() === String(id).toLowerCase(),
  )?.nombre ?? id

export const DIMENSIONES_RANKING = [
  { id: 1, nombre: 'Rentabilidad' },
  { id: 2, nombre: 'Liquidez' },
  { id: 3, nombre: 'Solvencia' },
  { id: 4, nombre: 'Crecimiento' },
]
