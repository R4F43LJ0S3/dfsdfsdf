// Formato para pantalla: coma decimal y fechas dd/mm/aaaa.
// Los datos (API y mocks) siguen con punto decimal.
export function num(valor, decimales = 1) {
  return Number(valor).toLocaleString('es-CO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })
}

export function pct(valor, decimales = 2) {
  const signo = valor > 0 ? '+' : ''
  return `${signo}${num(valor, decimales)} %`
}

export function fechaIso(texto) {
  return texto ? texto.split('-').reverse().join('/') : ''
}