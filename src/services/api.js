import axios from 'axios'
import { ENDPOINTS } from './endpoints'
import { PERIODOS, PERIODO_POR_DEFECTO, DIMENSIONES_RANKING } from '../constants/periodos'
import { aEntidad, aEntidades, aSesion, aSerieOhlc } from './adaptadores'
import { puedeConsultarRanking } from '../constants/permisos'
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

// --- Arranque en frío y tolerancia a saturación de Render ------------------------

// Render (plan gratuito) contesta 502/503/504 desde su router mientras la instancia
// despierta, se reinicia o atiende una ráfaga simultánea. Se reintenta con backoff.
// Un 4xx (401, 403, 404, 422) nunca se reintenta.
const ESTADOS_REINTENTABLES = [502, 503, 504]

// Un 503 con cuerpo RFC 9457 (`data.code`, ej. "ranking.upstream_error") indica que la API .NET
// ya está activa y reporta un fallo del microservicio upstream: no debe reintentarse 4 veces.
const esErrorDominioServidor = (err) =>
  Boolean(err?.response?.data && typeof err.response.data === 'object' && err.response.data.code)

const esFalloDeArranque = (err) => {
  if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError' || err?.name === 'AbortError') {
    return false
  }
  if (err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK' || !err?.response) return true
  if (esErrorDominioServidor(err)) return false
  return ESTADOS_REINTENTABLES.includes(err.response.status)
}

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms))

export async function conReintentoDeArranque(peticion, intentos = 4) {
  let ultimoError
  for (let i = 0; i < intentos; i += 1) {
    try {
      return await peticion()
    } catch (err) {
      ultimoError = err
      if (!esFalloDeArranque(err) || i === intentos - 1) throw err
      const espera = 3000 * 2 ** i
      const motivo = err?.response ? `HTTP ${err.response.status}` : (err?.code ?? 'sin respuesta')
      console.warn(`[API] El backend devolvió ${motivo} (intento ${i + 1}/${intentos}). Reintentando en ${espera / 1000} s...`)
      await esperar(espera)
    }
  }
  throw ultimoError
}

// --- Deduplicación, caché corta aislada por sesión y límite de concurrencia ------

const MAX_SIMULTANEAS = 3
const TTL_CACHE_MS = 15000
const TTL_CIRCUITO_RANKING_MS = 60000

const enVuelo = new Map()
const cache = new Map()
const rankingEnVuelo = new Map()
let rankingCircuitoAbiertoHasta = 0
let sondaRankingEnVuelo = null
let ultimoErrorRanking = null

let activas = 0
const cola = []

function liberarHueco() {
  activas -= 1
  const siguiente = cola.shift()
  if (siguiente) siguiente()
}

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

// Incluye huella de sesión en la llave de caché para evitar fugas de datos entre distintos roles
const claveDe = (url, params) => {
  const huellaSesion = (localStorage.getItem('token') || 'anon').slice(-16)
  return `${huellaSesion}:${url}?${JSON.stringify(params ?? {}, Object.keys(params ?? {}).sort())}`
}

function obtener(url, config = {}) {
  const clave = claveDe(url, config.params)

  const guardado = cache.get(clave)
  if (guardado && guardado.expira > Date.now()) return Promise.resolve(guardado.datos)

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

export function limpiarCacheApi() {
  cache.clear()
  rankingCircuitoAbiertoHasta = 0
  ultimoErrorRanking = null
}

// Normaliza el parámetro periodo ('Diaria' | 'Mensual' | 'Trimestral') exigido por
// GET /api/v1/entidades/{id}/ohlc, GET /api/v1/ranking y GET /api/v1/metricas (docs/api/openapi-v1.json)
function normalizarPeriodoOhlc(periodo) {
  const p = String(periodo ?? 'Mensual').trim().toLowerCase()
  if (p === 'diario' || p === 'diaria') return 'Diaria'
  if (p === 'trimestral') return 'Trimestral'
  return 'Mensual'
}

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

export async function login(identificador, password) {
  const usuarioNormalizado = normalizarIdentificador(identificador)
  const passwordNormalizado = normalizarPassword(password)

  const res = await conReintentoDeArranque(() =>
    http.post(ENDPOINTS.login, { usuario: usuarioNormalizado, password: passwordNormalizado }),
  )

  limpiarCacheApi()
  const sesion = aSesion(res.data)
  if (!sesion || !sesion.token) {
    throw new Error('Respuesta de autenticación inválida del servidor.')
  }
  return sesion
}

// GET /api/v1/entidades
export async function getEntidades(filtros = {}) {
  const params = { ...filtros }
  if (params.size !== undefined) {
    params.size = Math.min(100, Math.max(1, Number(params.size) || 100))
  }
  const res = await obtener(ENDPOINTS.entidades, { params })
  return aEntidades(res.data)
}

// GET /api/v1/entidades/{id}
export async function getEntidad(id) {
  const res = await obtener(ENDPOINTS.entidad(id))
  return aEntidad(res.data)
}

// Calcula el resumen agregado del Índice General a partir de GET /api/v1/entidades
export async function getIndiceGeneral() {
  const lista = await getEntidades()
  const validas = lista.filter((e) => Number.isFinite(e.ic ?? e.indice_competitividad))
  if (validas.length === 0) throw new Error('Sin entidades disponibles en el servidor para calcular el índice general.')
  const prom = (campo, alt) => validas.reduce((s, e) => s + (Number(e[campo] ?? (alt ? e[alt] : 0)) || 0), 0) / validas.length
  const valor = prom('ic', 'indice_competitividad')
  const puntos = prom('variacion')
  const variacion = prom('variacionPct', 'variacion_porcentual')
  return {
    fecha: new Date().toISOString().slice(0, 10),
    valor,
    puntos,
    variacion,
    totalEntidades: validas.length,
  }
}

// Obtiene las 5 entidades con mayor alza y 5 con mayor baja a partir de GET /api/v1/entidades
export async function getTop() {
  const lista = await getEntidades()
  const orden = [...lista].sort((a, b) => Number(b.variacionPct ?? b.variacion_porcentual ?? 0) - Number(a.variacionPct ?? a.variacion_porcentual ?? 0))
  return { ganadores: orden.slice(0, 5), perdedores: orden.slice(-5).reverse() }
}

// GET /api/v1/entidades/{id}/ohlc
export async function getOhlc(idEntidad, periodo = PERIODO_POR_DEFECTO) {
  const periodoOhlc = normalizarPeriodoOhlc(periodo)
  const res = await obtener(ENDPOINTS.ohlc(idEntidad), { params: { periodo: periodoOhlc } })
  return aSerieOhlc(res.data)
}

// GET /api/v1/metricas
export async function getMetricas(filtros = {}) {
  const params = { ...filtros }
  if (params.periodo) {
    params.periodo = normalizarPeriodoOhlc(params.periodo)
  }
  if (params.size !== undefined) {
    params.size = Math.min(100, Math.max(1, Number(params.size) || 100))
  }
  const res = await obtener(ENDPOINTS.metricas, { params })
  return res.data
}

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

function leerUsuarioSesion() {
  try {
    return JSON.parse(localStorage.getItem('usuario') || 'null')
  } catch {
    return null
  }
}

function crearErrorRankingNoDisponible() {
  const err = new Error('El microservicio de ranking no está disponible.')
  err.response = {
    status: 503,
    data: {
      status: 503,
      title: 'Servicio no disponible',
      detail: 'El microservicio de ranking no está disponible.',
      code: 'ranking.upstream_error',
    },
  }
  return err
}

// GET /api/v1/ranking (Modo estricto con sonda única, Circuit Breaker de 60 s y caché por sesión/filtros)
export async function getRanking(filtros = {}) {
  const usuarioActual = leerUsuarioSesion()
  if (usuarioActual && !puedeConsultarRanking(usuarioActual)) {
    const err = new Error('Tu rol actual no tiene permisos para consultar el ranking.')
    err.response = {
      status: 403,
      data: { status: 403, detail: 'Tu rol actual no tiene permisos para consultar el ranking.' },
    }
    throw err
  }

  const periodo = filtros.periodo ? normalizarPeriodoOhlc(filtros.periodo) : undefined
  const params = { ...filtros, ...(periodo && { periodo }) }
  if (params.limit !== undefined) {
    params.limit = Math.min(200, Math.max(1, Number(params.limit) || 50))
  }

  const claveResuelta = claveDe('__ranking_resuelto__', params)
  const guardado = cache.get(claveResuelta)
  if (guardado && guardado.expira > Date.now()) return guardado.datos

  const yaEnCurso = rankingEnVuelo.get(claveResuelta)
  if (yaEnCurso) return yaEnCurso

  const promesa = (async () => {
    try {
      // Circuito abierto: fallar de inmediato con el error del servidor sin generar tráfico 503 adicional
      if (Date.now() < rankingCircuitoAbiertoHasta) {
        throw ultimoErrorRanking ?? crearErrorRankingNoDisponible()
      }

      // Si otra llamada ya está probando el endpoint, esperar su resultado antes de emitir otra petición
      if (sondaRankingEnVuelo) {
        await sondaRankingEnVuelo.catch(() => {})
        if (Date.now() < rankingCircuitoAbiertoHasta) {
          throw ultimoErrorRanking ?? crearErrorRankingNoDisponible()
        }
      }

      const peticionSonda = obtener(ENDPOINTS.ranking, { params })
      if (!sondaRankingEnVuelo) {
        sondaRankingEnVuelo = peticionSonda
      }

      try {
        const res = await peticionSonda
        rankingCircuitoAbiertoHasta = 0
        ultimoErrorRanking = null
        cache.set(claveResuelta, { expira: Date.now() + TTL_CACHE_MS, datos: res.data })
        return res.data
      } catch (err) {
        const status = err?.response?.status
        // 401 y 403 jamás abren circuito: se propagan intactos para control RBAC
        if (status === 401 || status === 403) throw err

        rankingCircuitoAbiertoHasta = Date.now() + TTL_CIRCUITO_RANKING_MS
        ultimoErrorRanking = err
        throw err
      } finally {
        if (sondaRankingEnVuelo === peticionSonda) {
          sondaRankingEnVuelo = null
        }
      }
    } finally {
      rankingEnVuelo.delete(claveResuelta)
    }
  })()

  rankingEnVuelo.set(claveResuelta, promesa)
  return promesa
}

export async function getSectores() {
  return catalogoDerivado('sectores', async () => (await getEntidades({ size: 100 })).map((e) => e.sector))
}

export async function getDimensiones() {
  return Promise.resolve(DIMENSIONES_RANKING)
}

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

// --- Aprobaciones de Lotes (HU-FE-08 / HU-BE-05) ---

// GET /api/v1/aprobaciones
export async function getLotesPendientes() {
  const res = await obtener(ENDPOINTS.aprobaciones)
  return Array.isArray(res.data) ? res.data : []
}

// POST /api/v1/aprobaciones/{idLote}/aprobar
export async function aprobarLote(idLote) {
  const res = await conReintentoDeArranque(() => http.post(ENDPOINTS.aprobarLote(idLote)))
  limpiarCacheApi()
  return res.data
}

// POST /api/v1/aprobaciones/{idLote}/rechazar
export async function rechazarLote(idLote, comentario) {
  const res = await conReintentoDeArranque(() =>
    http.post(ENDPOINTS.rechazarLote(idLote), { comentario: String(comentario ?? '').trim() }),
  )
  limpiarCacheApi()
  return res.data
}
