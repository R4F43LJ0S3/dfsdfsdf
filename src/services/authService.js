import { http } from './api'
import { normalizarIdentificador, normalizarPassword } from '../utils/texto'

// Extrae el mensaje de error legible para el usuario soportando RFC 9457 (Problem Details de .NET)
export function extraerMensajeError(err, mensajeFallback = 'Ocurrió un error inesperado.') {
  if (!err) return mensajeFallback

  // Si no hay respuesta del servidor (servidor apagado, CORS, etc.)
  if (!err.response) {
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return 'El servidor tardó en responder mientras arranca en Render. Espera unos segundos y vuelve a intentar.'
    }
    if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
      return 'No se pudo conectar con el servidor backend. Verifica tu conexión e intenta nuevamente.'
    }
    return err.message || mensajeFallback
  }

  const data = err.response.data
  const esRutaLogin =
    err.config?.url?.includes('/auth/login') ||
    (typeof data?.instance === 'string' && data.instance.includes('/auth/login'))

  // En /api/v1/auth/login el backend devuelve detail: "Token inválido o vencido" ante HTTP 401;
  // se traduce a un mensaje genérico de credenciales sin revelar si falló el usuario o la clave.
  if (err.response.status === 401 && esRutaLogin) {
    if (!data?.detail || data.detail === 'Token inválido o vencido') {
      return 'Usuario o contraseña incorrectos.'
    }
  }

  // Formato RFC 9457 de .NET (ProblemDetails)
  if (data?.detail) return data.detail
  if (data?.title && data.title !== 'Unauthorized') return data.title

  // Respuestas con array de errores de validación (ValidationProblemDetails)
  if (data?.errors && typeof data.errors === 'object') {
    const primerosErrores = Object.values(data.errors).flat()
    if (primerosErrores.length > 0) return primerosErrores[0]
  }

  if (typeof data === 'string' && data.length < 200) return data

  if (err.response.status === 401) return 'Usuario o contraseña incorrectos.'
  if (err.response.status === 403) return 'No tienes permisos para realizar esta acción.'
  if (err.response.status === 404) return 'Recurso no encontrado.'

  return mensajeFallback
}

// Endpoint de registro (POST /api/v1/usuarios/registrar en docs/api/openapi-v1.json)
export async function registrarUsuario({ email, password, primerNombre, primerApellido, idRol }) {
  const res = await http.post('/usuarios/registrar', {
    email: normalizarIdentificador(email),
    password: normalizarPassword(password),
    primerNombre: String(primerNombre ?? '').normalize('NFC').trim(),
    primerApellido: String(primerApellido ?? '').normalize('NFC').trim(),
    idRol,
  })
  return res.data
}
