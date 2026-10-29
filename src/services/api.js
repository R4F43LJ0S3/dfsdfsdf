import axios from 'axios'
import { aEntidades, aTop, aIndiceGeneral, aOhlc } from './adaptadores'
import { mockOhlcData } from './mocks/ohlcMocks'
import { entidades, indiceGeneral } from './mocks/marketMocks'
import { consultarRanking, catalogoSectores, catalogoDimensiones, catalogoPeriodos } from './mocks/rankingMocks'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

// Para avisar en pantalla cuando los datos son de ejemplo.
export const USA_DATOS_DE_EJEMPLO = USE_MOCK

const http = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}${import.meta.env.VITE_API_PREFIX ?? '/api/v1'}`,
  timeout: 10000,
})

http.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

http.interceptors.response.use(
  (r) => r,
  (err) => {
    // En el login un 401 es "clave incorrecta": no se redirige, para que se vea el mensaje.
    const esLogin = err.config?.url?.includes('/auth/login')
    if (err.response?.status === 401 && !esLogin) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

const respuesta = (dato) => new Promise((ok) => setTimeout(() => ok(dato), 150))

export async function login(usuario, password) {
  if (USE_MOCK) {
    if (!usuario || !password) throw new Error('Credenciales inválidas')
    return respuesta({ token: 'token-de-ejemplo', expiraEn: 3600, usuario: { id: 1, nombre: usuario, rol: 'Gerente' } })
  }
  // Contrato real: POST /api/v1/auth/login { usuario, password } -> { token, expiraEn, usuario: { id, nombre, rol } }
  return (await http.post('/auth/login', { usuario, password })).data
}

// El ticker, el tablero y el top piden la misma lista: se pide una sola vez y se reutiliza 30 s.
let cacheEntidades = null
export async function getEntidades() {
  if (USE_MOCK) return respuesta(entidades)
  if (!cacheEntidades || Date.now() - cacheEntidades.hora > 30000) {
    // size máximo del contrato = 100. El total real viaja en la cabecera X-Total-Count.
    const pedido = http.get('/entidades', { params: { size: 100 } }).then((r) => aEntidades(r.data))
    cacheEntidades = { hora: Date.now(), pedido }
    pedido.catch(() => { cacheEntidades = null })
  }
  return cacheEntidades.pedido
}

// El backend NO tiene /indice-general ni /mercado/top (pendiente de confirmar con Backend).
// Mientras tanto se calculan desde /entidades. Cuando existan, se cambia SOLO esta parte.
export async function getIndiceGeneral() {
  if (USE_MOCK) return respuesta(indiceGeneral)
  return aIndiceGeneral(await getEntidades())
}

export async function getTop() {
  if (USE_MOCK) {
    const orden = [...entidades].sort((a, b) => b.variacion_porcentual - a.variacion_porcentual)
    return respuesta({ ganadores: orden.slice(0, 5), perdedores: orden.slice(-5).reverse() })
  }
  return aTop(await getEntidades())
}

// Períodos que acepta cada endpoint del backend (el chip del front -> el valor del contrato).
const PERIODO_OHLC = { '1D': 'Diaria', '1S': 'Diaria', '1M': 'Mensual', '1A': 'Trimestral' }

export async function getOhlc(id, periodo = '1M') {
  if (USE_MOCK) return respuesta(mockOhlcData)
  const { data } = await http.get(`/entidades/${id}/ohlc`, { params: { periodo: PERIODO_OHLC[periodo] ?? periodo } })
  return aOhlc(data)
}

export async function getRanking(filtros = {}) {
  if (USE_MOCK) return respuesta(consultarRanking(filtros))
  const params = Object.fromEntries(Object.entries({ limit: 200, ...filtros }).filter(([, v]) => v !== '' && v != null))
  return (await http.get('/ranking', { params })).data // { periodo, total, items }
}

// El backend no tiene /sectores, /dimensiones ni /periodos: se arman con lo que dice el contrato.
export async function getSectores() {
  if (USE_MOCK) return respuesta(catalogoSectores)
  const lista = await getEntidades()
  return [...new Set(lista.map((e) => e.sector))]
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((nombre, i) => ({ id: i + 1, nombre }))
}

export async function getDimensiones() {
  if (USE_MOCK) return respuesta(catalogoDimensiones)
  return ['Rentabilidad', 'Liquidez', 'Solvencia', 'Crecimiento'].map((nombre, i) => ({ id: i + 1, nombre }))
}

export async function getPeriodos() {
  if (USE_MOCK) return respuesta(catalogoPeriodos)
  return [
    { id: 'diario', nombre: 'Diario' },
    { id: 'mensual', nombre: 'Mensual' },
    { id: 'trimestral', nombre: 'Trimestral' },
  ]
}