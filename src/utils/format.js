// Formato para pantalla: coma decimal y fechas dd/mm/aaaa.
// Los datos de la API viajan con punto decimal.
import { UNIDADES, unidadDeMetrica } from '../constants/unidadesMetricas'

export function num(valor, decimales = 1) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return '—'

  // Se redondea antes de formatear para no imprimir "-0,00" cuando el valor es
  // un negativo muy pequeño (p. ej. -0.0004 con 2 decimales).
  const factor = 10 ** decimales
  const redondeado = Math.round(Number(valor) * factor) / factor
  const limpio = redondeado === 0 ? 0 : redondeado

  return limpio.toLocaleString('es-CO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })
}

// Porcentaje de un valor que YA viene expresado en porcentaje (ej. variacionPct).
export function pct(valor, decimales = 2) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return '—'

  const factor = 10 ** decimales
  const redondeado = Math.round(Number(valor) * factor) / factor
  const signo = redondeado > 0 ? '+' : ''
  return `${signo}${num(redondeado, decimales)} %`
}

// Porcentaje de un valor que viene como PROPORCIÓN (0.0634 -> "6,34 %").
export function pctProporcion(valor, decimales = 2) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return '—'
  return `${num(Number(valor) * 100, decimales)} %`
}

// Valor de una métrica formateado según su unidad oficial del diccionario de datos.
export function valorMetrica(metrica) {
  const valor = metrica?.valor
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return '—'

  switch (unidadDeMetrica(metrica)) {
    case UNIDADES.PROPORCION:
      return pctProporcion(valor)
    case UNIDADES.VECES:
      return `${num(valor, 2)} veces`
    case UNIDADES.PUNTOS:
      return `${num(valor, 1)} pts`
    default:
      return num(valor, 2)
  }
}

export function fechaIso(texto) {
  if (!texto) return ''
  const iso = String(texto).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : String(texto)
}
