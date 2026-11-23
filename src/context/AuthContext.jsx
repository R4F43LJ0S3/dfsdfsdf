import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as loginApi, limpiarCacheApi } from '../services/api'
import { decodificarJwt, esTokenVigente, extraerRolJwt } from '../utils/jwt'
import { normalizarNombreRol } from '../constants/roles'

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

    const rolJwt = extraerRolJwt(tokenGuardado)
    const rolBruto = rolJwt || usuarioParsed.rol
    if (!rolBruto) {
      limpiarAlmacenamientoSesion()
      return { token: null, usuario: null }
    }
    usuarioParsed.rol = normalizarNombreRol(rolBruto)

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
    limpiarCacheApi()
    setToken(null)
    setUsuario(null)
  }, [])

  const actualizarSesionUsuario = useCallback((cambios) => {
    if (!cambios || typeof cambios !== 'object') return
    limpiarCacheApi()
    setUsuario((prev) => {
      if (!prev) return prev
      const actualizado = { ...prev, ...cambios }
      localStorage.setItem('usuario', JSON.stringify(actualizado))
      return actualizado
    })
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

    // El claim del JWT firmado por el servidor tiene prioridad y se normaliza al catálogo canónico
    const rolJwt = extraerRolJwt(sesion.token)
    const rolVerificado = normalizarNombreRol(rolJwt || sesion.usuario.rol)
    sesion.usuario.rol = rolVerificado

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
    <AuthContext.Provider
      value={{
        token,
        usuario,
        login,
        logout,
        actualizarSesionUsuario,
        estaAutenticado: Boolean(usuario && token),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
