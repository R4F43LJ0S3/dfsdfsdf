// HU-FE-05 · Funciones puras del comparador (sin React ni red: se pueden probar aisladas).
import { MAX_ENTIDADES } from '../constants/comparador'

// "ent001, ENT004,,ent001" -> ['ENT001', 'ENT004']  (mayúsculas, sin vacíos ni repetidos, conserva el orden)
export function leerCodigos(texto) {
  if (texto === null || texto === undefined) return []
  const vistos = new Set()
  const codigos = []
  for (const parte of String(texto).split(',')) {
    const codigo = parte.trim().toUpperCase()
    if (codigo && !vistos.has(codigo)) {
      vistos.add(codigo)
      codigos.push(codigo)
    }
  }
  return codigos
}

export const escribirCodigos = (codigos) => codigos.join(',')

// Deja solo los códigos que existen y como máximo MAX_ENTIDADES.
// Devuelve también lo descartado para poder avisarle al usuario.
export function sanearSeleccion(codigos, codigosValidos, max = MAX_ENTIDADES) {
  const validos = new Set(codigosValidos)
  const existentes = codigos.filter((c) => validos.has(c))
  return {
    seleccion: existentes.slice(0, max),
    excedentes: existentes.slice(max),
    desconocidos: codigos.filter((c) => !validos.has(c)),
  }
}

// CA 1: nunca deja pasar de MAX_ENTIDADES; el motivo del rechazo permite mostrar el aviso.
export function agregarCodigo(seleccion, codigo, max = MAX_ENTIDADES) {
  if (seleccion.includes(codigo)) return { seleccion, rechazo: 'repetida' }
  if (seleccion.length >= max) return { seleccion, rechazo: 'limite' }
  return { seleccion: [...seleccion, codigo], rechazo: null }
}

export const quitarCodigo = (seleccion, codigo) => seleccion.filter((c) => c !== codigo)

// Acepta 'mensual', 'MENSUAL' o 'Mensual' y devuelve el id oficial ('Mensual').
export function normalizarPeriodo(valor, periodos, porDefecto) {
  if (!valor) return porDefecto
  const buscado = String(valor).trim().toLowerCase()
  const encontrado = periodos.find((p) => p.id.toLowerCase() === buscado || p.nombre.toLowerCase() === buscado)
  return encontrado ? encontrado.id : porDefecto
}

// Lectura y escritura tolerantes a fallos (modo privado, cuota llena, JSON corrupto).
export function leerAlmacen(almacen, clave) {
  try {
    const dato = JSON.parse(almacen?.getItem(clave) ?? 'null')
    return {
      entidades: Array.isArray(dato?.entidades) ? leerCodigos(dato.entidades.join(',')) : [],
      periodo: typeof dato?.periodo === 'string' ? dato.periodo : null,
    }
  } catch {
    return { entidades: [], periodo: null }
  }
}

export function guardarAlmacen(almacen, clave, datos) {
  try {
    almacen?.setItem(clave, JSON.stringify(datos))
    return true
  } catch {
    return false
  }
}

// Convierte números que la API puede mandar como texto ("78.5"). null/'' -> null.
export function aNumeroONulo(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  const n = Number(valor)
  return Number.isFinite(n) ? n : null
}

// Códigos con el mejor valor de una columna (incluye empates).
// Si hay menos de 2 valores o todos son iguales, no hay "mejor": devuelve un Set vacío.
export function mejoresDeColumna(filas, clave, mejor = 'mayor') {
  const conValor = filas
    .map((f) => ({ codigo: f.codigo, valor: aNumeroONulo(f.valores?.[clave]) }))
    .filter((f) => f.valor !== null)
  if (conValor.length < 2) return new Set()
  const valores = conValor.map((f) => f.valor)
  const max = Math.max(...valores)
  const min = Math.min(...valores)
  if (max === min) return new Set()
  const objetivo = mejor === 'menor' ? min : max
  return new Set(conValor.filter((f) => f.valor === objetivo).map((f) => f.codigo))
}

// Serie OHLC -> serie de línea con el cierre (IC) de cada fecha.
// lightweight-charts exige fechas 'YYYY-MM-DD' únicas y en orden ascendente: si llegan
// repetidas se conserva la última, y se descartan fechas o valores inválidos.
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/
export function aSerieLinea(ohlc) {
  if (!Array.isArray(ohlc)) return []
  const porFecha = new Map()
  for (const punto of ohlc) {
    const valor = aNumeroONulo(punto?.close)
    const fecha = typeof punto?.time === 'string' ? punto.time.slice(0, 10) : null
    if (valor !== null && fecha && FECHA_ISO.test(fecha)) porFecha.set(fecha, valor)
  }
  return [...porFecha.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, value]) => ({ time, value }))
}

// Búsqueda sin tildes ni mayúsculas: "energia" encuentra "Energía Andina".
export const sinTildes = (texto) =>
  String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
