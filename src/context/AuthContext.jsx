import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as loginApi } from '../services/api'
import { decodificarJwt, esTokenVigente, extraerRolJwt } from '../utils/jwt'

const AuthContext = createContext(null)

// Detecta cadenas con corrupción de codificación previa (ej: 'P?rez' o carácter de reemplazo U+FFFD)
function tieneTextoCorrupto(texto = '') {
  const s = String(texto)
  return s.includes('\uFFFD') || /[A-Za-zÁÉÍÓÚáéíóúÑñ]\?[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(s)
}

function limpiarAlmacenamientoSesion() {
  localStorage.removeItem('token')
  localStorage.removeItem('usuario')
}

function leerSesionGuardada() {
  try {
    const guardado = localStorage.getItem('usuario')
    const tokenGuardado = localStorage.getItem('token')
    if (!tokenGuardado || !esTokenVigente(tokenGuardado) || !guardado) {
      limpiarAlmacenamientoSesion()
      return { token: null, usuario: null }
    }

    const usuarioParsed = JSON.parse(guardado)
    if (!usuarioParsed || typeof usuarioParsed !== 'object') {
      limpiarAlmacenamientoSesion()
      return { token: null, usuario: null }
    }

    if (!usuarioParsed.rol) {
      const rolJwt = extraerRolJwt(tokenGuardado)
      if (rolJwt) {
        usuarioParsed.rol = rolJwt
      } else {
        limpiarAlmacenamientoSesion()
        return { token: null, usuario: null }
      }
    }

    // Si en localStorage quedó una sesión antigua con mojibake ('Juan P?rez'), se fuerza reautenticación limpia UTF-8
    if (
      tieneTextoCorrupto(usuarioParsed?.nombre) ||
      tieneTextoCorrupto(usuarioParsed?.nombreCompleto) ||
      tieneTextoCorrupto(usuarioParsed?.rol)
    ) {
      const payload = decodificarJwt(tokenGuardado)
      if (payload?.name && !tieneTextoCorrupto(payload.name)) {
        usuarioParsed.nombre = payload.name
        usuarioParsed.nombreCompleto = payload.name
        localStorage.setItem('usuario', JSON.stringify(usuarioParsed))
      } else {
        limpiarAlmacenamientoSesion()
        return { token: null, usuario: null }
      }
    }

    return { token: tokenGuardado, usuario: usuarioParsed }
  } catch {
    limpiarAlmacenamientoSesion()
    return { token: null, usuario: null }
  }
}

export function AuthProvider({ children }) {
  const [sesionInicial] = useState(leerSesionGuardada)
  const [token, setToken] = useState(sesionInicial.token)
  const [usuario, setUsuario] = useState(sesionInicial.usuario)

  const logout = useCallback(() => {
    limpiarAlmacenamientoSesion()
    setToken(null)
    setUsuario(null)
  }, [])

  // Verificar periódicamente o al ganar foco si el token expiró
  useEffect(() => {
    const verificarVigencia = () => {
      const t = localStorage.getItem('token')
      if (!t || !esTokenVigente(t)) {
        logout()
      }
    }

    window.addEventListener('focus', verificarVigencia)
    return () => window.removeEventListener('focus', verificarVigencia)
  }, [logout])

  const login = async (identificador, password) => {
    const sesion = await loginApi(identificador, password)

    if (!sesion || !sesion.token || !esTokenVigente(sesion.token) || !sesion.usuario) {
      limpiarAlmacenamientoSesion()
      throw new Error('La respuesta del servidor no contiene un token de sesión válido.')
    }

    // Si el backend no envió el rol en el cuerpo JSON pero sí en el JWT, se rescata del token
    const rolJwt = extraerRolJwt(sesion.token)
    if (rolJwt && !sesion.usuario.rol) {
      sesion.usuario.rol = rolJwt
    }

    // Comportamiento Fail-Closed (OWASP ASVS V4.1): rechazar sesión si no existe rol verificado
    if (!sesion.usuario.rol) {
      limpiarAlmacenamientoSesion()
      throw new Error('No fue posible verificar tu perfil de acceso. Contacta al administrador.')
    }

    if (!sesion.usuario.email && identificador.includes('@')) {
      sesion.usuario.email = identificador.trim().toLowerCase()
    }

    localStorage.setItem('token', sesion.token)
    localStorage.setItem('usuario', JSON.stringify(sesion.usuario))

    setToken(sesion.token)
    setUsuario(sesion.usuario)
    return sesion
  }

  return (
    <AuthContext.Provider value={{ token, usuario, login, logout, estaAutenticado: Boolean(usuario && token) }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
