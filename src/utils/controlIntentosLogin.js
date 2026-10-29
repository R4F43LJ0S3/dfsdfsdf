import { SEGURIDAD_LOGIN } from '../constants/validaciones'

const CLAVE_STORAGE = 'siftc_seguridad_intentos_login'

function leerRegistro() {
  try {
    const crudo = localStorage.getItem(CLAVE_STORAGE)
    if (!crudo) return { fallos: 0, bloqueadoHasta: 0, ultimoFallo: 0, ultimaPeticion: 0 }
    const datos = JSON.parse(crudo)
    const ahora = Date.now()

    // Si ya expiró un bloqueo previo, se restablece el contador para una nueva tanda limpia
    if (datos.bloqueadoHasta && ahora >= datos.bloqueadoHasta) {
      const limpio = { fallos: 0, bloqueadoHasta: 0, ultimoFallo: 0, ultimaPeticion: 0 }
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(limpio))
      return limpio
    }

    // Si transcurrió la ventana de inactividad sin nuevos fallos, reiniciar contador
    if (datos.ultimoFallo && !datos.bloqueadoHasta && ahora - datos.ultimoFallo > SEGURIDAD_LOGIN.VENTANA_REINICIO_MS) {
      const limpio = { fallos: 0, bloqueadoHasta: 0, ultimoFallo: 0, ultimaPeticion: 0 }
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(limpio))
      return limpio
    }

    return {
      fallos: Number(datos.fallos) || 0,
      bloqueadoHasta: Number(datos.bloqueadoHasta) || 0,
      ultimoFallo: Number(datos.ultimoFallo) || 0,
      ultimaPeticion: Number(datos.ultimaPeticion) || 0,
    }
  } catch {
    return { fallos: 0, bloqueadoHasta: 0, ultimoFallo: 0, ultimaPeticion: 0 }
  }
}

function guardarRegistro(registro) {
  try {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(registro))
  } catch {
    // Si almacenamiento está restringido, continúa en memoria de ejecución
  }
}

export function obtenerEstadoIntentos() {
  const reg = leerRegistro()
  const ahora = Date.now()
  const bloqueado = reg.bloqueadoHasta > ahora
  const segundosRestantes = bloqueado ? Math.ceil((reg.bloqueadoHasta - ahora) / 1000) : 0
  const intentosRestantes = Math.max(0, SEGURIDAD_LOGIN.MAX_INTENTOS - reg.fallos)

  return {
    fallos: reg.fallos,
    bloqueado,
    bloqueadoHasta: reg.bloqueadoHasta,
    segundosRestantes,
    intentosRestantes,
    enCooldown: ahora - reg.ultimaPeticion < SEGURIDAD_LOGIN.COOLDOWN_PETICION_MS,
  }
}

export function marcarInicioPeticionLogin() {
  const reg = leerRegistro()
  guardarRegistro({ ...reg, ultimaPeticion: Date.now() })
}

export function registrarIntentoFallido() {
  const reg = leerRegistro()
  const ahora = Date.now()
  const nuevosFallos = reg.fallos + 1
  const alcanzaLimite = nuevosFallos >= SEGURIDAD_LOGIN.MAX_INTENTOS

  const actualizado = {
    fallos: nuevosFallos,
    ultimoFallo: ahora,
    ultimaPeticion: ahora,
    bloqueadoHasta: alcanzaLimite ? ahora + SEGURIDAD_LOGIN.TIEMPO_BLOQUEO_MS : 0,
  }

  guardarRegistro(actualizado)
  return obtenerEstadoIntentos()
}

export function limpiarIntentosFallidos() {
  try {
    localStorage.removeItem(CLAVE_STORAGE)
  } catch {
    // Ignorar error de almacenamiento
  }
}

export function formatearTiempoBloqueo(segundosTotales = 0) {
  const mins = Math.floor(segundosTotales / 60)
  const segs = segundosTotales % 60
  return `${String(mins).padStart(2, '0')}:${String(segs).padStart(2, '0')}`
}
