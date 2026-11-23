// HU-DD-08 / HU-FE-07 CA 1: Servicio del Diccionario de Datos 100 % contra la API real SIFTC.
// Endpoints oficiales (docs/api/openapi-v1.json):
//   GET  /api/v1/diccionario?buscar=...&tipo=metrica|termino|dato
//   GET  /api/v1/diccionario/{codigo}
//   POST /api/v1/diccionario/cargar

import { http, conReintentoDeArranque, limpiarCacheApi } from './api'
import { ENDPOINTS } from './endpoints'
import { normalizarSensibilidad } from '../constants/permisos'
import { claveComparacion } from '../utils/texto'

export const LIMITE_RESULTADOS_API = 20
const BUSCAR_CATALOGO_INICIAL = 'a'

export const TIPOS_ENTRADA = Object.freeze([
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'metrica', etiqueta: 'Métricas' },
  { id: 'termino', etiqueta: 'Términos' },
  { id: 'dato', etiqueta: 'Datos y campos' },
])

export const ETIQUETA_TIPO = Object.freeze({
  metrica: 'Métrica',
  termino: 'Término',
  dato: 'Dato',
})

/** Normaliza variantes de tipo (UI, URL o API) al catálogo aceptado por el backend. */
export function normalizarTipoApi(valor) {
  const limpio = claveComparacion(valor)
  if (limpio === 'metrica' || limpio === 'metricas') return 'metrica'
  if (limpio === 'termino' || limpio === 'terminos') return 'termino'
  if (limpio === 'dato' || limpio === 'datos' || limpio === 'atributo') return 'dato'
  return ''
}

/** Devuelve la etiqueta legible en español para un tipo de entrada del diccionario. */
export function etiquetaTipoEntrada(tipo) {
  const clave = normalizarTipoApi(tipo)
  if (clave && ETIQUETA_TIPO[clave]) return ETIQUETA_TIPO[clave]
  const texto = String(tipo ?? '').trim()
  return texto || 'Término'
}

/** Indica si el error corresponde a una petición abortada intencionalmente. */
export function esErrorCancelacion(err) {
  return Boolean(
    err?.code === 'ERR_CANCELED' ||
      err?.name === 'CanceledError' ||
      err?.name === 'AbortError',
  )
}

function normalizarResultado(dto) {
  const tipo =
    normalizarTipoApi(dto?.tipo) ||
    String(dto?.tipo ?? '').trim().toLowerCase() ||
    'termino'

  return {
    codigo: String(dto?.codigo ?? '').trim(),
    tipo,
    tipoEtiqueta: etiquetaTipoEntrada(tipo),
    nombre: String(dto?.nombre ?? '').trim(),
    definicion: String(dto?.definicion ?? '').trim(),
  }
}

function normalizarFicha(dto) {
  if (!dto || typeof dto !== 'object') return null

  const tipo =
    normalizarTipoApi(dto.tipo) ||
    String(dto.tipo ?? '').trim().toLowerCase() ||
    'termino'
  const clasificacion = String(dto.clasificacion ?? 'Público').trim()
  const formulaLimpia =
    dto.formula === null || dto.formula === undefined ? '' : String(dto.formula).trim()
  const unidadLimpia =
    dto.unidad === null || dto.unidad === undefined ? '' : String(dto.unidad).trim()
  const sinonimos = Array.isArray(dto.sinonimos)
    ? dto.sinonimos.map((s) => String(s ?? '').trim()).filter(Boolean)
    : []

  return {
    codigo: String(dto.codigo ?? '').trim(),
    tipo,
    tipoEtiqueta: etiquetaTipoEntrada(tipo),
    nombre: String(dto.nombre ?? '').trim(),
    definicion: String(dto.definicion ?? '').trim(),
    formula: formulaLimpia || null,
    unidad: unidadLimpia || null,
    sinonimos,
    clasificacion,
    nivelSensibilidad: normalizarSensibilidad(clasificacion),
  }
}

/**
 * Carga inicial automática del diccionario (`GET /api/v1/diccionario?buscar=a`).
 * Evita HTTP 422 (`diccionario.buscar.required`) cuando el buscador está vacío.
 */
export async function obtenerCatalogoInicialDiccionario({ tipo = 'todos', signal } = {}) {
  const params = { buscar: BUSCAR_CATALOGO_INICIAL }
  const tipoApi = tipo && tipo !== 'todos' ? normalizarTipoApi(tipo) : ''
  if (tipoApi) {
    params.tipo = tipoApi
  }

  const res = await conReintentoDeArranque(() => http.get(ENDPOINTS.diccionario, { params, signal }))
  return Array.isArray(res.data) ? res.data.map(normalizarResultado) : []
}

/**
 * Busca términos en el servidor (`GET /api/v1/diccionario`).
 * Si `buscar` está vacío devuelve [] sin consultar para evitar HTTP 422 (`diccionario.buscar.required`).
 */
export async function buscarDiccionario({ buscar = '', tipo = 'todos', signal } = {}) {
  const consulta = String(buscar ?? '').trim()
  if (!consulta) return []

  const params = { buscar: consulta }
  const tipoApi = tipo && tipo !== 'todos' ? normalizarTipoApi(tipo) : ''
  if (tipoApi) {
    params.tipo = tipoApi
  }

  const res = await conReintentoDeArranque(() => http.get(ENDPOINTS.diccionario, { params, signal }))
  return Array.isArray(res.data) ? res.data.map(normalizarResultado) : []
}

/**
 * Obtiene la ficha individual desde el servidor (`GET /api/v1/diccionario/{codigo}`).
 * Ante 404 propaga el error RFC 9457 (código inexistente o restringido por RBAC anti-enumeración).
 */
export async function obtenerFichaDiccionario(codigo, { signal } = {}) {
  const codigoLimpio = String(codigo ?? '').trim()
  if (!codigoLimpio) {
    throw new Error('Código de término inválido o vacío.')
  }

  const res = await conReintentoDeArranque(() =>
    http.get(ENDPOINTS.diccionarioTermino(codigoLimpio), { signal }),
  )
  return normalizarFicha(res.data)
}

/**
 * Sube `diccionario.csv` mediante multipart/form-data (`POST /api/v1/diccionario/cargar`).
 * Roles autorizados en servidor: Administrador y Data Steward (HTTP 403 para el resto).
 */
export async function cargarCsvDiccionario(archivo) {
  if (!archivo) {
    throw new Error('Selecciona un archivo CSV válido antes de cargar.')
  }

  const formData = new FormData()
  formData.append('file', archivo)

  // Anular el Content-Type JSON por defecto de `http` para que el navegador genere el boundary multipart.
  const res = await http.post(ENDPOINTS.diccionarioCargar, formData, {
    headers: { 'Content-Type': undefined },
  })
  limpiarCacheApi()
  return { registros: Number(res.data?.registros ?? 0) }
}
