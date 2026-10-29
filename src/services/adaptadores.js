// Traduce lo que responde el backend (camelCase: codigo, nombre, ic, variacionPct...)
// a los nombres que usan el tablero y el ticker (codigo_entidad, indice_competitividad...).
// Si Backend cambia un nombre de campo, se corrige SOLO en este archivo.

const direccion = (v) => (v > 0 ? 'UP' : v < 0 ? 'DOWN' : 'EQUAL')

export const aEntidad = (e) => ({
  id: e.id,
  codigo_entidad: e.codigo,
  nombre_entidad: e.nombre,
  sector: e.sector,
  indice_competitividad: e.ic,
  variacion: e.variacion,
  variacion_porcentual: e.variacionPct,
  direccion: direccion(e.variacionPct),
})

export const aEntidades = (lista) => lista.map(aEntidad)

// Top 5 ganadores y perdedores a partir de la lista de entidades (el backend no tiene /mercado/top).
export function aTop(entidades) {
  const validas = entidades.filter((e) => e.variacion_porcentual != null)
  const orden = [...validas].sort((a, b) => b.variacion_porcentual - a.variacion_porcentual)
  return { ganadores: orden.slice(0, 5), perdedores: orden.slice(-5).reverse() }
}

const promedio = (xs) => {
  const v = xs.filter((x) => x != null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

// Índice general = promedio del IC de las entidades (el backend no tiene /indice-general).
export function aIndiceGeneral(entidades) {
  return {
    fecha: new Date().toISOString().slice(0, 10),
    valor: promedio(entidades.map((e) => e.indice_competitividad)),
    variacion: promedio(entidades.map((e) => e.variacion_porcentual)),
    puntos: promedio(entidades.map((e) => e.variacion)),
    derivado: true,
  }
}

// OHLC del backend -> formato de lightweight-charts (time, open, high, low, close).
export const aOhlc = (r) => ({
  entidadId: r.entidadId,
  entidad: r.entidad,
  periodo: r.periodo,
  serie: r.serie.map((p) => ({
    time: p.fecha,
    open: Number(p.apertura),
    high: Number(p.maximo),
    low: Number(p.minimo),
    close: Number(p.cierre),
    variacion: p.variacion,
    variacionPct: p.variacionPct,
  })),
})