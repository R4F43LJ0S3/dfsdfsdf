import axios from 'axios'
import { mockOhlcData } from './mocks/ohlcMocks'
import { entidades, indiceGeneral } from './mocks/marketMocks'
import { consultarRanking, catalogoSectores, catalogoDimensiones, catalogoPeriodos } from './mocks/rankingMocks'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
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
    if (err.response?.status === 401) {
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
  return (await http.post('/auth/login', { usuario, password })).data
}

export async function getEntidades() {
  if (USE_MOCK) return respuesta(entidades)
  return (await http.get('/entidades')).data
}

export async function getIndiceGeneral() {
  if (USE_MOCK) return respuesta(indiceGeneral)
  return (await http.get('/indice-general')).data
}

export async function getTop() {
  if (USE_MOCK) {
    const orden = [...entidades].sort((a, b) => b.variacion_porcentual - a.variacion_porcentual)
    return respuesta({ ganadores: orden.slice(0, 5), perdedores: orden.slice(-5).reverse() })
  }
  return (await http.get('/mercado/top')).data
}

export async function getOhlc(id, periodo = '1M') {
  if (USE_MOCK) return respuesta(mockOhlcData)
  return (await http.get(`/entidades/${id}/ohlc`, { params: { periodo } })).data
}

export async function getRanking(filtros = {}) {
  if (USE_MOCK) return respuesta(consultarRanking(filtros))
  return (await http.get('/ranking', { params: filtros })).data
}

export async function getSectores() {
  if (USE_MOCK) return respuesta(catalogoSectores)
  return (await http.get('/sectores')).data
}

export async function getDimensiones() {
  if (USE_MOCK) return respuesta(catalogoDimensiones)
  return (await http.get('/dimensiones')).data
}

export async function getPeriodos() {
  if (USE_MOCK) return respuesta(catalogoPeriodos)
  return (await http.get('/periodos')).data
}