import axios from 'axios'
import { ENDPOINTS } from './endpoints'
import { PERIODOS, PERIODO_POR_DEFECTO, DIMENSIONES_RANKING } from '../constants/periodos'
import { aEntidades, aSesion, aSerieOhlc } from './adaptadores'
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

// Un fallo "de arranque": no hay respuesta HTTP (red caída, instancia dormida)
// o venció el timeout. Un 4xx/5xx NO entra aquí: el servidor sí contestó.
const esFalloDeArranque = (err) =>
  err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK' || !err?.response

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms))

// Reintenta una vez si la instancia estaba dormida y la primera petición murió esperando.
async function conReintentoDeArranque(peticion, intentos = 2) {
  let ultimoError
  for (let i = 0; i < intentos; i += 1) {
    try {
      return await peticion()
    } catch (err) {
      ultimoError = err
      if (!esFalloDeArranque(err) || i === intentos - 1) throw err
      console.warn(`[API] El backend no respondió (intento ${i + 1}/${intentos}). Puede estar despertando en Render; reintentando...`)
      await esperar(3000)
    }
  }
  throw ultimoError
}

// Normaliza el parámetro periodo ('diario' | 'mensual' | 'trimestral') para /ranking y /metricas
function normalizarPeriodoMinusculas(periodo) {
  if (!periodo) return undefined
  const p = String(periodo).trim().toLowerCase()
  if (p === 'diaria') return 'diario'
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
  const res = await conReintentoDeArranque(() =>
    http.get(ENDPOINTS.entidades, { params }),
  )
  return aEntidades(res.data)
}

// GET /api/v1/entidades/{id}
// Devuelve EntidadDetalleDto (id: uuid, codigo, nombre, sector, nit, estado, icActual, variacion, variacionPct, ultimaActualizacion)
export async function getEntidad(id) {
  const res = await conReintentoDeArranque(() =>
    http.get(ENDPOINTS.entidad(id)),
  )
  return res.data
}

// Calcula el resumen agregado del Índice General a partir de los registros reales de GET /api/v1/entidades
export async function getIndiceGeneral() {
  const lista = await getEntidades()
  const validas = lista.filter((e) => Number.isFinite(e.indice_competitividad))
  if (validas.length === 0) throw new Error('Sin entidades disponibles en el servidor para calcular el índice general.')
  const prom = (campo) => validas.reduce((s, e) => s + (Number(e[campo]) || 0), 0) / validas.length
  const valor = prom('indice_competitividad')
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
  const orden = [...lista].sort((a, b) => b.variacion_porcentual - a.variacion_porcentual)
  return { ganadores: orden.slice(0, 5), perdedores: orden.slice(-5).reverse() }
}

// GET /api/v1/entidades/{id}/ohlc
// Parámetros en docs/api/openapi-v1.json: id (uuid en ruta), periodo ('Diaria' | 'Mensual' | 'Trimestral')
export async function getOhlc(id, periodo = PERIODO_POR_DEFECTO) {
  const res = await conReintentoDeArranque(() =>
    http.get(ENDPOINTS.ohlc(id), { params: { periodo } }),
  )
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
  const res = await conReintentoDeArranque(() =>
    http.get(ENDPOINTS.metricas, { params }),
  )
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
  const res = await conReintentoDeArranque(() =>
    http.get(ENDPOINTS.ranking, { params }),
  )
  return res.data
}

// Sectores: valores únicos del campo 'sector' en GET /api/v1/entidades
export async function getSectores() {
  return catalogoDerivado('sectores', async () => (await getEntidades({ size: 100 })).map((e) => e.sector))
}

// Dimensiones: valores únicos de GET /api/v1/metricas (size máx 100 según OpenAPI) o las 4 dimensiones del contrato de /ranking
export async function getDimensiones() {
  const derivadas = await catalogoDerivado('dimensiones', async () =>
    (await getMetricas({ size: 100 })).map((m) => m.dimension),
  )
  return derivadas.length > 0 ? derivadas : DIMENSIONES_RANKING
}

// Periodos: opciones documentadas en docs/api/openapi-v1.json ('Diaria', 'Mensual', 'Trimestral')
export async function getPeriodos() {
  return PERIODOS
}
