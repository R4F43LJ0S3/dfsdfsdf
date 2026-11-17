import axios from 'axios'
import { ENDPOINTS } from './endpoints'
import { PERIODOS, PERIODO_POR_DEFECTO, DIMENSIONES_RANKING } from '../constants/periodos'
import { aEntidad, aEntidades, aSesion, aSerieOhlc } from './adaptadores'
import { esTokenVigente } from '../utils/jwt'
import { normalizarIdentificador, normalizarPassword } from '../utils/texto'

// Render (plan gratuito) duerme el servicio tras ~15 min sin tráfico:
// la primera petición puede tardar 30-60 s mientras la instancia arranca.
const TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT ?? 60000)

// Servidor de la API externo desplegado en Render (contrato oficial: docs/api/openapi-v1.json)
const RAIZ_SERVIDOR = import.meta.env.VITE_API_URL || 'https://siftc.onrender.com'
export const API_BASE_URL = `${RAIZ_SERVIDOR}${import.meta.env.VITE_API_PREFIX ?? '/api/v1'}`

// /health cuelga de la raíz del servidor, no de /api/v1: se pide con URL absoluta.
const URL_HEALTH = `${RAIZ_SERVIDOR}${ENDPOINTS.health}`

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json, application/problem+json',
  },
})

// Inyectar Authorization Bearer solo si el token existe y sigue vigente
http.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token')
  if (token) {
    if (esTokenVigente(token)) {
      cfg.headers.Authorization = `Bearer ${token}`
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
    }
  }
  return cfg
})

http.interceptors.response.use(
  (r) => r,
  (err) => {
    // En el login un 401 es "clave incorrecta": no se redirige, para que la UI muestre el mensaje RFC 9457
    const esLogin = err.config?.url?.includes(ENDPOINTS.login)
    if (err.response?.status === 401 && !esLogin) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

// --- Arranque en frío de Render -------------------------------------------------

// Render (plan gratuito) contesta 502/503/504 desde su router mientras la instancia
// duerme, arranca o se está reiniciando. Esa respuesta NO viene de la API: es un fallo
// temporal de infraestructura y hay que reintentarlo igual que una caída de red.
// Antes se excluían todos los 5xx y por eso un 503 rompía la pantalla al primer intento.
const ESTADOS_REINTENTABLES = [502, 503, 504]

const esFalloDeArranque = (err) => {
  if (err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK' || !err?.response) return true
  return ESTADOS_REINTENTABLES.includes(err.response.status)
}

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms))

// Reintenta con espera creciente (3 s, 6 s, 12 s) mientras la instancia de Render
// despierta o se reinicia. Un 4xx (401, 403, 404...) nunca se reintenta: es definitivo.
async function conReintentoDeArranque(peticion, intentos = 4) {
  let ultimoError
  for (let i = 0; i < intentos; i += 1) {
    try {
      return await peticion()
    } catch (err) {
      ultimoError = err
      if (!esFalloDeArranque(err) || i === intentos - 1) throw err
      const espera = 3000 * 2 ** i
      const motivo = err?.response ? `HTTP ${err.response.status}` : (err?.code ?? 'sin respuesta')
      console.warn(`[API] El backend devolvió ${motivo} (intento ${i + 1}/${intentos}). Puede estar despertando o reiniciándose en Render; reintentando en ${espera / 1000} s...`)
      await esperar(espera)
    }
  }
  throw ultimoError
}

// --- Deduplicación, caché corta y límite de concurrencia -------------------------

// La instancia gratuita de Render atiende muy poca carga simultánea: cuando el front
// le lanza una ráfaga de peticiones pesadas (el Comparador pide 5 rankings con
// limit=200 a la vez) la instancia se satura y el router empieza a devolver 503.
// Además había peticiones repetidas: el Tablero pedía GET /entidades tres veces
// (getIndiceGeneral + getTop + getEntidades) y el Ticker una cuarta, todas idénticas.

const MAX_SIMULTANEAS = 3
const TTL_CACHE_MS = 15000

const enVuelo = new Map()   // clave -> promesa compartida
const cache = new Map()     // clave -> { expira, datos }

let activas = 0
const cola = []

function liberarHueco() {
  activas -= 1
  const siguiente = cola.shift()
  if (siguiente) siguiente()
}

// Deja pasar como mucho MAX_SIMULTANEAS peticiones a la vez; el resto espera turno.
function tomarHueco() {
  if (activas < MAX_SIMULTANEAS) {
    activas += 1
    return Promise.resolve()
  }
  return new Promise((listo) => {
    cola.push(() => {
      activas += 1
      listo()
    })
  })
}

const claveDe = (url, params) => `${url}?${JSON.stringify(params ?? {}, Object.keys(params ?? {}).sort())}`

/**
 * GET con reintento de arranque, deduplicación de peticiones idénticas en vuelo,
 * caché de 15 s y tope de peticiones simultáneas.
 */
function obtener(url, config = {}) {
  const clave = claveDe(url, config.params)

  const guardado = cache.get(clave)
  if (guardado && guardado.expira > Date.now()) return Promise.resolve(guardado.datos)

  // Si ya hay una petición idéntica viajando, se reutiliza en vez de lanzar otra.
  const yaVa = enVuelo.get(clave)
  if (yaVa) return yaVa

  const promesa = (async () => {
    await tomarHueco()
    try {
      const res = await conReintentoDeArranque(() => http.get(url, config))
      cache.set(clave, { expira: Date.now() + TTL_CACHE_MS, datos: res })
      return res
    } finally {
      liberarHueco()
      enVuelo.delete(clave)
    }
  })()

  enVuelo.set(clave, promesa)
  return promesa
}

// Las escrituras (watchlist, aprobaciones) invalidan la caché para no leer datos viejos.
export function limpiarCacheApi() {
  cache.clear()
}

// Normaliza el parámetro periodo ('Diaria' | 'Mensual' | 'Trimestral') exigido por GET /api/v1/entidades/{id}/ohlc
function normalizarPeriodoOhlc(periodo) {
  const p = String(periodo ?? 'Mensual').trim().toLowerCase()
  if (p === 'diario' || p === 'diaria') return 'Diaria'
  if (p === 'trimestral') return 'Trimestral'
  return 'Mensual'
}

// Normaliza el parámetro periodo ('diario' | 'mensual' | 'trimestral') para /ranking y /metricas
function normalizarPeriodoMinusculas(periodo) {
  if (!periodo) return undefined
  const p = String(periodo).trim().toLowerCase()
  if (p === 'diaria' || p === 'diario') return 'diario'
  if (p === 'mensual') return 'mensual'
  if (p === 'trimestral') return 'trimestral'
  return p
}

/**
 * Despierta la instancia de Render antes de que el usuario intente iniciar sesión.
 * Se llama una sola vez al arrancar la app (src/main.jsx).
 * Nunca lanza: si falla, la app sigue y el error aparecerá en la petición real.
 */
export async function despertarBackend() {
  const inicio = Date.now()
  try {
    await conReintentoDeArranque(() => http.get(URL_HEALTH))
    const ms = Date.now() - inicio
    console.info(`[API] Backend disponible en ${ms} ms (${API_BASE_URL})`)
    return { despierto: true, ms }
  } catch (err) {
    console.warn(`[API] No se pudo contactar ${URL_HEALTH}:`, err?.message)
    return { despierto: false, error: err }
  }
}

// Autentica contra el Backend .NET (POST /api/v1/auth/login), devolviendo la sesión normalizada
// Contrato docs/api/openapi-v1.json:
// Request: { usuario: string, password: string }
// Response 200: { token: string, expiraEn: int32, usuario: { id: uuid, nombre: string, rol: string } }
export async function login(identificador, password) {
  const usuarioNormalizado = normalizarIdentificador(identificador)
  const passwordNormalizado = normalizarPassword(password)

  const res = await conReintentoDeArranque(() =>
    http.post(ENDPOINTS.login, { usuario: usuarioNormalizado, password: passwordNormalizado }),
  )

  const sesion = aSesion(res.data)
  if (!sesion || !sesion.token) {
    throw new Error('Respuesta de autenticación inválida del servidor.')
  }
  return sesion
}

// GET /api/v1/entidades
// Parámetros admitidos en docs/api/openapi-v1.json: sector, page (>=1), size (1..100), sort, dir
export async function getEntidades(filtros = {}) {
  const params = { ...filtros }
  if (params.size !== undefined) {
    params.size = Math.min(100, Math.max(1, Number(params.size) || 100))
  }
  const res = await obtener(ENDPOINTS.entidades, { params })
  return aEntidades(res.data)
}

// GET /api/v1/entidades/{id}
// Devuelve EntidadDto (id: uuid, codigo, nombre, sector, ic, variacion, variacionPct)
export async function getEntidad(id) {
  const res = await obtener(ENDPOINTS.entidad(id))
  return aEntidad(res.data)
}

// Calcula el resumen agregado del Índice General a partir de los registros reales de GET /api/v1/entidades
export async function getIndiceGeneral() {
  const lista = await getEntidades()
  const validas = lista.filter((e) => Number.isFinite(e.ic ?? e.indice_competitividad))
  if (validas.length === 0) throw new Error('Sin entidades disponibles en el servidor para calcular el índice general.')
  const prom = (campo, alt) => validas.reduce((s, e) => s + (Number(e[campo] ?? (alt ? e[alt] : 0)) || 0), 0) / validas.length
  const valor = prom('ic', 'indice_competitividad')
  const puntos = prom('variacion')
  const anterior = valor - puntos
  return {
    fecha: new Date().toISOString().slice(0, 10),
    valor,
    puntos,
    variacion: anterior ? (puntos / anterior) * 100 : 0,
  }
}

// Obtiene las 5 entidades con mayor alza y 5 con mayor baja a partir de GET /api/v1/entidades
export async function getTop() {
  const lista = await getEntidades()
  const orden = [...lista].sort((a, b) => Number(b.variacionPct ?? b.variacion_porcentual ?? 0) - Number(a.variacionPct ?? a.variacion_porcentual ?? 0))
  return { ganadores: orden.slice(0, 5), perdedores: orden.slice(-5).reverse() }
}

// GET /api/v1/entidades/{id}/ohlc
// Parámetros en docs/api/openapi-v1.json: id (uuid en ruta), periodo ('Diaria' | 'Mensual' | 'Trimestral')
export async function getOhlc(idEntidad, periodo = PERIODO_POR_DEFECTO) {
  const periodoOhlc = normalizarPeriodoOhlc(periodo)
  const res = await obtener(ENDPOINTS.ohlc(idEntidad), { params: { periodo: periodoOhlc } })
  return aSerieOhlc(res.data)
}

// GET /api/v1/metricas
// Parámetros admitidos en docs/api/openapi-v1.json:
// sector, periodo ('diario'|'mensual'|'trimestral'), fecha ('yyyy-MM-dd'),
// dimension ('Rentabilidad'|'Liquidez'|'Solvencia'|'Crecimiento'|'Mercado'|'Trazabilidad'),
// page (>=1), size (1..100, default 100), sort, dir
export async function getMetricas(filtros = {}) {
  const params = { ...filtros }
  if (params.periodo) {
    params.periodo = normalizarPeriodoMinusculas(params.periodo)
  }
  if (params.size !== undefined) {
    params.size = Math.min(100, Math.max(1, Number(params.size) || 100))
  }
  const res = await obtener(ENDPOINTS.metricas, { params })
  return res.data
}

// Deriva opciones únicas ordenadas alfabéticamente a partir de los endpoints reales de la API
async function catalogoDerivado(nombre, obtenerValores) {
  try {
    const valores = [...new Set((await obtenerValores()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
    if (valores.length === 0) {
      return []
    }
    return valores.map((nombreValor, i) => ({ id: i + 1, nombre: nombreValor }))
  } catch (err) {
    console.warn(`[API] No se pudo consultar el catálogo de ${nombre}.`, err?.message)
    return []
  }
}

// GET /api/v1/ranking
// Parámetros admitidos en docs/api/openapi-v1.json:
// sector, dimension ('Rentabilidad'|'Liquidez'|'Solvencia'|'Crecimiento'),
// periodo ('diario'|'mensual'|'trimestral'), orden ('posicion'|'entidad'|'sector'|'ic'|'variacionPct'),
// dir ('asc'|'desc'), limit (1..200, default 50), offset (>=0, default 0)
export async function getRanking(filtros = {}) {
  const periodo = normalizarPeriodoMinusculas(filtros.periodo)
  const params = { ...filtros, ...(periodo && { periodo }) }
  if (params.limit !== undefined) {
    params.limit = Math.min(200, Math.max(1, Number(params.limit) || 50))
  }
  const res = await obtener(ENDPOINTS.ranking, { params })
  return res.data
}

// Sectores: valores únicos del campo 'sector' en GET /api/v1/entidades
export async function getSectores() {
  return catalogoDerivado('sectores', async () => (await getEntidades({ size: 100 })).map((e) => e.sector))
}

// Dimensiones: /api/v1/ranking admite exclusivamente las 4 dimensiones oficiales de DIMENSIONES_RANKING
export async function getDimensiones() {
  return Promise.resolve(DIMENSIONES_RANKING)
}

// Periodos: opciones documentadas en docs/api/openapi-v1.json
export async function getPeriodos() {
  return PERIODOS
}

// GET /api/v1/watchlist
export async function getWatchlist() {
  const res = await obtener(ENDPOINTS.watchlist)
  return Array.isArray(res.data) ? res.data : res.data?.items ?? []
}

// POST /api/v1/watchlist/{idEntidad}
export async function agregarAWatchlist(idEntidad) {
  const res = await conReintentoDeArranque(() => http.post(ENDPOINTS.watchlistEntidad(idEntidad)))
  limpiarCacheApi()
  return res.data
}

// DELETE /api/v1/watchlist/{idEntidad}
export async function quitarDeWatchlist(idEntidad) {
  const res = await conReintentoDeArranque(() => http.delete(ENDPOINTS.watchlistEntidad(idEntidad)))
  limpiarCacheApi()
  return res.data
}

// --- Aprobaciones de Lotes (HU-FE-08 / HU-BE-08) ---

// GET /api/v1/aprobaciones
// Roles admitidos: Administrador, Data Steward, Analista financiero, Auditor
export async function getLotesPendientes() {
  const res = await obtener(ENDPOINTS.aprobaciones)
  return Array.isArray(res.data) ? res.data : []
}

// POST /api/v1/aprobaciones/{idLote}/aprobar
// Rol admitido: Analista financiero (segregación de funciones: no puede aprobar su propio lote)
export async function aprobarLote(idLote) {
  const res = await conReintentoDeArranque(() => http.post(ENDPOINTS.aprobarLote(idLote)))
  limpiarCacheApi()
  return res.data
}

// POST /api/v1/aprobaciones/{idLote}/rechazar
// Rol admitido: Analista financiero. Cuerpo: { comentario: string } (obligatorio, máx 500 caracteres)
export async function rechazarLote(idLote, comentario) {
  const res = await conReintentoDeArranque(() =>
    http.post(ENDPOINTS.rechazarLote(idLote), { comentario: String(comentario ?? '').trim() }),
  )
  limpiarCacheApi()
  return res.data
}
