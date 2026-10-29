import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as loginApi } from '../services/api'
import { decodificarJwt, esTokenVigente, extraerRolJwt } from '../utils/jwt'

const AuthContext = createContext(null)

// Detecta cadenas con corrupción de codificación previa (ej: 'P?rez' o carácter de reemplazo U+FFFD)
function tieneTextoCorrupto(texto = '') {
  const s = String(texto)
  return s.includes('\uFFFD') || /[A-Za-zÁÉÍÓÚáéíóúÑñ]\?[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(s)
}

function leerSesionGuardada() {
  try {
    const guardado = localStorage.getItem('usuario')
    const tokenGuardado = localStorage.getItem('token')
    if (!tokenGuardado || !esTokenVigente(tokenGuardado) || !guardado) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      return { token: null, usuario: null }
    }

    const usuarioParsed = JSON.parse(guardado)

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
        localStorage.removeItem('token')
        localStorage.removeItem('usuario')
        return { token: null, usuario: null }
      }
    }

    return { token: tokenGuardado, usuario: usuarioParsed }
  } catch {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    return { token: null, usuario: null }
  }
}

export function AuthProvider({ children }) {
  const [sesionInicial] = useState(leerSesionGuardada)
  const [token, setToken] = useState(sesionInicial.token)
  const [usuario, setUsuario] = useState(sesionInicial.usuario)

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setToken(null)
    setUsuario(null)
  }, [])

  // Verificar periódicamente o al ganar foco si el token expiró
  useEffect(() => {
    const verificarVigencia = () => {
      const t = localStorage.getItem('token')
      if (t && !esTokenVigente(t)) {
        logout()
      }
    }

    window.addEventListener('focus', verificarVigencia)
    return () => window.removeEventListener('focus', verificarVigencia)
  }, [logout])

  const login = async (identificador, password) => {
    const sesion = await loginApi(identificador, password)

    // Si el backend no envió el rol en el JSON pero sí en el JWT, se rescata del token
    const rolJwt = extraerRolJwt(sesion.token)
    if (rolJwt && !sesion.usuario.rol) {
      sesion.usuario.rol = rolJwt
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
