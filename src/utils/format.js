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

// Porcentaje de un valor que YA viene expresado en porcentaje.
// Es el caso de variacionPct (DAT-46: "Cambio porcentual del cierre frente al anterior").
export function pct(valor, decimales = 2) {
  const signo = valor > 0 ? '+' : ''
  return `${signo}${num(valor, decimales)} %`
}

// Porcentaje de un valor que viene como PROPORCIÓN (0.0634 -> "6,34 %").
// Es el caso del valor de las métricas (DAT-39: "Se guarda como proporción").
export function pctProporcion(valor, decimales = 2) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return '—'
  return `${num(Number(valor) * 100, decimales)} %`
}

// Valor de una métrica formateado según su unidad del diccionario de datos.
// Sin unidad conocida se muestra el número crudo, sin inventarle sufijo.
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
  return texto ? texto.split('-').reverse().join('/') : ''
}
