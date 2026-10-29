import { entidades } from './marketMocks'

// datos de prueba del ranking, con el mismo formato que va a mandar backend

// GET /sectores
export const catalogoSectores = [...new Set(entidades.map((e) => e.sector))]
  .sort((a, b) => a.localeCompare(b, 'es'))
  .map((nombre, i) => ({ id: i + 1, nombre }))

// GET /dimensiones
export const catalogoDimensiones = [
  { id: 1, nombre: 'Rentabilidad' },
  { id: 2, nombre: 'Liquidez' },
  { id: 3, nombre: 'Solvencia' },
  { id: 4, nombre: 'Crecimiento' },
]

// GET /periodos
export const catalogoPeriodos = [
  { id: 'diario', nombre: 'Diario' },
  { id: 'mensual', nombre: 'Mensual' },
  { id: 'trimestral', nombre: 'Trimestral' },
]

const ORDENABLES = ['posicion', 'entidad', 'sector', 'ic', 'variacionPct']
const TEXTO = ['entidad', 'sector']

const limitar = (n) => Math.round(Math.min(99, Math.max(1, n)) * 10) / 10
const ajuste = (i, k) => (((i * 7 + k * 3) % 9) - 4) * 1.6

function puntaje(e, i, dimension, periodo) {
  const p = Math.max(0, catalogoPeriodos.findIndex((x) => x.id === periodo))
  const k = Math.max(0, catalogoDimensiones.findIndex((d) => d.nombre === dimension) + 1)
  const base = e.indice_competitividad + p * (((i * 5) % 7) - 3) * 0.6
  return limitar(k ? base + ajuste(i, k) : base)
}

// simula GET /ranking
export function consultarRanking({ sector = '', dimension = '', periodo = 'mensual', orden = 'ic', dir = 'desc' } = {}) {
  const filtradas = entidades
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => !sector || e.sector === sector)

  const p = Math.max(0, catalogoPeriodos.findIndex((x) => x.id === periodo))
  const periodoAnterior = catalogoPeriodos[(p + 1) % catalogoPeriodos.length].id
  const anterior = [...filtradas]
    .sort((a, b) => puntaje(b.e, b.i, dimension, periodoAnterior) - puntaje(a.e, a.i, dimension, periodoAnterior))
    .map(({ e }) => e.codigo_entidad)

  const items = filtradas
    .map(({ e, i }) => ({
      entidadId: i + 1,
      entidad: e.nombre_entidad,
      sector: e.sector,
      ic: puntaje(e, i, dimension, periodo),
      variacionPct: e.variacion_porcentual,
      _codigo: e.codigo_entidad,
    }))
    .sort((a, b) => b.ic - a.ic)
    .map(({ _codigo, ...item }, idx) => ({
      posicion: idx + 1,
      cambioPosicion: anterior.indexOf(_codigo) - idx,
      ...item,
    }))

  const campo = ORDENABLES.includes(orden) ? orden : 'ic'
  const signo = dir === 'asc' ? 1 : -1
  items.sort((a, b) => {
    const x = a[campo]
    const y = b[campo]
    return (TEXTO.includes(campo) ? x.localeCompare(y, 'es') : x - y) * signo
  })

  return { periodo, total: items.length, items }
}
