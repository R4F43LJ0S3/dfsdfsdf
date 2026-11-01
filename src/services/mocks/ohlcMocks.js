// src/services/mocks/ohlcMocks.js
// Serie de datos OHLC diaria (Open, High, Low, Close) para la gráfica de velas y líneas (HU-FE-02)
import { entidades } from './marketMocks'

export const mockOhlcData = [
  { time: '2026-09-01', open: 73.0, high: 74.5, low: 72.8, close: 74.2 },
  { time: '2026-09-02', open: 74.2, high: 75.1, low: 73.9, close: 74.8 },
  { time: '2026-09-03', open: 74.8, high: 76.2, low: 74.5, close: 75.9 },
  { time: '2026-09-04', open: 75.9, high: 76.5, low: 75.0, close: 75.4 },
  { time: '2026-09-05', open: 75.4, high: 77.0, low: 75.2, close: 76.8 },
  { time: '2026-09-06', open: 76.8, high: 77.5, low: 76.0, close: 77.1 },
  { time: '2026-09-07', open: 77.1, high: 78.0, low: 76.5, close: 76.9 },
  { time: '2026-09-08', open: 76.9, high: 78.4, low: 76.8, close: 78.2 },
  { time: '2026-09-09', open: 78.2, high: 79.5, low: 77.9, close: 78.5 },
  { time: '2026-09-10', open: 78.5, high: 79.1, low: 77.0, close: 77.8 },
  { time: '2026-09-11', open: 77.8, high: 78.3, low: 76.4, close: 76.9 },
  { time: '2026-09-12', open: 76.9, high: 77.6, low: 75.8, close: 76.2 },
  { time: '2026-09-15', open: 76.2, high: 78.0, low: 76.0, close: 77.5 },
  { time: '2026-09-16', open: 77.5, high: 79.0, low: 77.2, close: 78.9 },
  { time: '2026-10-07', open: 77.3, high: 79.3, low: 76.8, close: 78.5 },
]

const PUNTOS_POR_PERIODO = {
  '1D': 5,
  '1S': 7,
  '1M': 22,
  '1A': 90,
  MAX: 140,
  'Máx.': 140,
}

const redond = (v) => Math.round(Math.min(99.5, Math.max(5, v)) * 10) / 10

function semillaTexto(str = '') {
  let h = 0
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) % 9973
  }
  return h || 17
}

function diasHabilesHasta(fechaFinIso, cantidad) {
  const [y, m, d] = fechaFinIso.split('-').map(Number)
  const cursor = new Date(Date.UTC(y, m - 1, d))
  const fechas = []
  while (fechas.length < cantidad) {
    const dia = cursor.getUTCDay()
    if (dia !== 0 && dia !== 6) {
      fechas.push(cursor.toISOString().slice(0, 10))
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return fechas.reverse()
}

// Genera una serie OHLC determinística alineada con el IC y variación de cada entidad
export function obtenerOhlcMock(idEntidad = 'ENT002', periodo = '1M') {
  const buscado = String(idEntidad).trim().toUpperCase()
  const normalizado = buscado.replace('-', '')
  const entidad =
    entidades.find(
      (e, idx) =>
        e.codigo_entidad.toUpperCase() === buscado ||
        e.codigo_entidad.toUpperCase() === normalizado ||
        String(idx + 1) === String(idEntidad).trim(),
    ) ?? entidades[1]

  const totalPuntos = PUNTOS_POR_PERIODO[periodo] ?? 22
  const fechas = diasHabilesHasta('2026-10-07', totalPuntos)
  const semilla = semillaTexto(entidad.codigo_entidad)
  const cierreFinal = entidad.indice_competitividad
  const aperturaUltimoDia = redond(cierreFinal / (1 + entidad.variacion_porcentual / 100))

  // Construimos cierres hacia atrás desde el cierre actual para que el último punto coincida exacto
  const cierres = new Array(totalPuntos)
  cierres[totalPuntos - 1] = cierreFinal
  cierres[totalPuntos - 2] = aperturaUltimoDia

  for (let i = totalPuntos - 2; i >= 1; i -= 1) {
    const onda = Math.sin((i + semilla) * 0.65) * 0.85 + Math.cos((i * 2 + semilla) * 0.35) * 0.45
    cierres[i - 1] = redond(cierres[i] - onda * 0.7)
  }

  return fechas.map((time, idx) => {
    const close = cierres[idx]
    const open = idx === 0 ? redond(close - 0.4) : cierres[idx - 1]
    const mechaSup = 0.4 + ((semilla + idx * 7) % 9) * 0.12
    const mechaInf = 0.35 + ((semilla + idx * 5) % 8) * 0.11
    const high = redond(Math.max(open, close) + mechaSup)
    const low = redond(Math.min(open, close) - mechaInf)
    return { time, open, high, low, close }
  })
}

export default mockOhlcData
