// HU-DD-08: Servicio del Diccionario de Datos y Glosario Oficial SIFTC
// Fuente oficial: exportación validada del equipo de Diccionario de Datos (src/data/diccionario_glosario_busqueda.csv)
// Filtrado estricto por rol y clasificación de sensibilidad del dato (HU-FE-07 CA 1).

import csvOficial from '../data/diccionario_glosario_busqueda.csv?raw'
import { puedeVerSensibilidad, normalizarSensibilidad } from '../constants/permisos'
import { claveComparacion as sinTildes } from '../utils/texto'

export const TIPOS_ENTRADA = Object.freeze([
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'Métrica', etiqueta: 'Métricas' },
  { id: 'Término', etiqueta: 'Términos' },
  { id: 'Atributo', etiqueta: 'Datos y campos' },
])

let catalogoCache = null

function partirLineaCsv(linea, sep = ';') {
  const campos = []
  let actual = ''
  let enComillas = false

  for (let i = 0; i < linea.length; i += 1) {
    const c = linea[i]
    if (c === '"') {
      if (enComillas && linea[i + 1] === '"') {
        actual += '"'
        i += 1
      } else {
        enComillas = !enComillas
      }
    } else if (c === sep && !enComillas) {
      campos.push(actual.trim())
      actual = ''
    } else {
      actual += c
    }
  }
  campos.push(actual.trim())
  return campos
}

function partirLista(texto) {
  if (!texto) return []
  return String(texto)
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function normalizarTermino(Crudo) {
  const id = Crudo.id || Crudo.codigo || Crudo.nombre
  const clasificacion = Crudo.clasificacion || 'Público'
  const sinonimos = Array.isArray(Crudo.sinonimos) ? Crudo.sinonimos : partirLista(Crudo.sinonimos)
  const relacionados = Array.isArray(Crudo.terminos_relacionados)
    ? Crudo.terminos_relacionados
    : partirLista(Crudo.terminos_relacionados)

  const indiceBusqueda = sinTildes(
    [
      Crudo.id,
      Crudo.codigo,
      Crudo.nombre,
      Crudo.nombre_tecnico,
      Crudo.descripcion,
      sinonimos.join(' '),
      Crudo.variables,
      Crudo.usado_en,
      Crudo.equipo_dueno,
    ]
      .filter(Boolean)
      .join(' '),
  )

  return {
    id: String(id ?? '').trim(),
    tipo: String(Crudo.tipo || 'Término').trim(),
    codigo: String(Crudo.codigo ?? '').trim(),
    nombre: String(Crudo.nombre ?? '').trim(),
    nombreTecnico: String(Crudo.nombre_tecnico ?? '').trim(),
    descripcion: String(Crudo.descripcion ?? '').trim(),
    sinonimos,
    formula: String(Crudo.formula ?? '').trim(),
    variables: String(Crudo.variables ?? '').trim(),
    unidad: String(Crudo.unidad ?? '').trim(),
    frecuencia: String(Crudo.frecuencia ?? '').trim(),
    umbrales: String(Crudo.umbrales ?? '').trim(),
    ejemplo: String(Crudo.ejemplo ?? '').trim(),
    relacionados,
    clasificacion: String(clasificacion).trim(),
    nivelSensibilidad: normalizarSensibilidad(clasificacion),
    equipoDueno: String(Crudo.equipo_dueno ?? '').trim(),
    usadoEn: String(Crudo.usado_en ?? '').trim(),
    estado: String(Crudo.estado ?? '').trim(),
    _busqueda: indiceBusqueda,
  }
}

export function cargarCatalogoLocal() {
  if (catalogoCache) return catalogoCache
  const lineas = String(csvOficial ?? '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)

  if (lineas.length < 2) {
    catalogoCache = []
    return catalogoCache
  }

  const encabezados = partirLineaCsv(lineas[0]).map((h) => sinTildes(h).replace(/\s+/g, '_'))
  const filas = []

  for (let i = 1; i < lineas.length; i += 1) {
    const valores = partirLineaCsv(lineas[i])
    if (valores.length < 2) continue
    const obj = {}
    encabezados.forEach((clave, idx) => {
      obj[clave] = valores[idx] ?? ''
    })
    const termino = normalizarTermino(obj)
    if (termino.nombre) filas.push(termino)
  }

  catalogoCache = filas
  return catalogoCache
}

function puntajeCoincidencia(termino, consultaLimpia) {
  if (!consultaLimpia) return 1
  const nombre = sinTildes(termino.nombre)
  const codigo = sinTildes(termino.codigo)
  const id = sinTildes(termino.id)
  const tecnico = sinTildes(termino.nombreTecnico)
  const sinonimos = termino.sinonimos.map(sinTildes)

  if (codigo && codigo === consultaLimpia) return 100
  if (id && id === consultaLimpia) return 95
  if (nombre === consultaLimpia || tecnico === consultaLimpia) return 90
  if (codigo && codigo.startsWith(consultaLimpia)) return 85
  if (nombre.startsWith(consultaLimpia)) return 80
  if (sinonimos.some((s) => s === consultaLimpia || s.startsWith(consultaLimpia))) return 75
  if (nombre.includes(consultaLimpia) || tecnico.includes(consultaLimpia)) return 65
  if (sinonimos.some((s) => s.includes(consultaLimpia))) return 55

  const palabras = consultaLimpia.split(/\s+/).filter(Boolean)
  if (palabras.length > 0 && palabras.every((p) => termino._busqueda.includes(p))) return 40

  return 0
}

export function buscarEnLista(terminos, { q = '', tipo = 'todos', usuario = null } = {}) {
  const consulta = sinTildes(q)
  const tipoFiltro = tipo && tipo !== 'todos' ? sinTildes(tipo) : null

  return terminos
    .filter((t) => puedeVerSensibilidad(usuario, t.clasificacion))
    .filter((t) => (!tipoFiltro ? true : sinTildes(t.tipo) === tipoFiltro))
    .map((t) => ({ termino: t, puntaje: puntajeCoincidencia(t, consulta) }))
    .filter((item) => item.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje || a.termino.nombre.localeCompare(b.termino.nombre, 'es'))
    .map((item) => item.termino)
}

export async function buscarTerminos({ q = '', tipo = 'todos', usuario = null } = {}) {
  const base = cargarCatalogoLocal()
  const resultados = buscarEnLista(base, { q, tipo, usuario })
  const totalVisible = base.filter((t) => puedeVerSensibilidad(usuario, t.clasificacion)).length

  return {
    items: resultados,
    totalVisible,
    totalCatalogo: base.length,
  }
}

export function encontrarTermino(referencia, usuario = null) {
  if (!referencia) return null
  const buscado = sinTildes(referencia)
  const base = cargarCatalogoLocal().filter((t) => puedeVerSensibilidad(usuario, t.clasificacion))

  return (
    base.find((t) => sinTildes(t.id) === buscado) ||
    base.find((t) => t.codigo && sinTildes(t.codigo) === buscado) ||
    base.find((t) => sinTildes(t.nombre) === buscado) ||
    base.find((t) => t.nombreTecnico && sinTildes(t.nombreTecnico) === buscado) ||
    base.find((t) => t.sinonimos.some((s) => sinTildes(s) === buscado)) ||
    base.find((t) => sinTildes(t.nombre).startsWith(buscado)) ||
    null
  )
}
