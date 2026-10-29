import { http } from './api'
import { normalizarIdentificador, normalizarPassword } from '../utils/texto'

// Extrae el mensaje de error legible para el usuario soportando RFC 9457 (Problem Details de .NET)
export function extraerMensajeError(err, mensajeFallback = 'Ocurrió un error inesperado.') {
  if (!err) return mensajeFallback

  // Si no hay respuesta del servidor (servidor apagado, CORS, etc.)
  if (!err.response) {
    if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
      return 'No se pudo conectar con el servidor backend. Verifica que esté corriendo.'
    }
    return err.message || mensajeFallback
  }

  const data = err.response.data

  // Formato RFC 9457 de .NET (ProblemDetailsResponse)
  if (data?.detail) return data.detail
  if (data?.title) return data.title

  // Respuestas con array de errores de validación (ValidationProblemDetails)
  if (data?.errors && typeof data.errors === 'object') {
    const primerosErrores = Object.values(data.errors).flat()
    if (primerosErrores.length > 0) return primerosErrores[0]
  }

  if (typeof data === 'string' && data.length < 200) return data

  if (err.response.status === 401) return 'Correo o contraseña incorrectos.'
  if (err.response.status === 403) return 'No tienes permisos para realizar esta acción.'
  if (err.response.status === 404) return 'Recurso no encontrado.'

  return mensajeFallback
}

// Endpoint de registro (solo permitido para rol Administrador según UsuariosController.cs)
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
