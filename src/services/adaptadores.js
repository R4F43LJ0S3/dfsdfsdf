// Normaliza y estandariza las respuestas del backend según el contrato oficial (docs/api/openapi-v1.json).
// Expone como propiedades canónicas los nombres oficiales de OpenAPI (codigo, nombre, sector, ic, variacion, variacionPct)
// y preserva alias heredados (codigo_entidad, etc.) para compatibilidad y cero regresiones.

const direccion = (v) => (v > 0 ? 'UP' : v < 0 ? 'DOWN' : 'EQUAL')

export const aEntidad = (e) => {
  const codigo = e.codigo ?? e.codigo_entidad ?? ''
  const nombre = e.nombre ?? e.nombre_entidad ?? ''
  const ic = Number(e.ic ?? e.indice_competitividad ?? 0)
  const variacion = Number(e.variacion ?? 0)
  const variacionPct = Number(e.variacionPct ?? e.variacion_porcentual ?? 0)

  return {
    id: e.id,
    // Nombres canónicos oficiales OpenAPI (docs/api/openapi-v1.json)
    codigo,
    nombre,
    sector: e.sector ?? '',
    ic,
    variacion,
    variacionPct,
    direccion: direccion(variacionPct),

    // Alias heredados para garantizar cero errores en componentes que aún los lean
    codigo_entidad: codigo,
    nombre_entidad: nombre,
    indice_competitividad: ic,
    variacion_porcentual: variacionPct,
  }
}

export const aEntidades = (lista) => (Array.isArray(lista) ? lista.map(aEntidad) : [])

// /mercado/top no trae código ni sector: se completan con la lista de entidades (por id).
export function aTop(top, entidades) {
  const porId = new Map(entidades.map((e) => [e.id, e]))
  const completar = (t) => {
    const base = porId.get(t.id)
    const codigo = t.codigo ?? base?.codigo ?? base?.codigo_entidad ?? ''
    const nombre = t.nombre ?? base?.nombre ?? base?.nombre_entidad ?? ''
    const sector = t.sector ?? base?.sector ?? ''
    const ic = Number(t.ic ?? base?.ic ?? base?.indice_competitividad ?? 0)
    const variacion = Number(t.variacion ?? base?.variacion ?? 0)
    const varPct = Number(t.variacionPct ?? t.variacion_porcentual ?? 0)

    return {
      id: t.id,
      // Nombres canónicos oficiales OpenAPI (docs/api/openapi-v1.json)
      codigo,
      nombre,
      sector,
      ic,
      variacion,
      variacionPct: varPct,
      direccion: direccion(varPct),

      // Alias heredados para garantizar cero errores en componentes que aún los lean
      codigo_entidad: codigo,
      nombre_entidad: nombre,
      indice_competitividad: ic,
      variacion_porcentual: varPct,
    }
  }
  return {
    fecha: top?.fecha,
    ganadores: Array.isArray(top?.ganadores) ? top.ganadores.map(completar) : [],
    perdedores: Array.isArray(top?.perdedores) ? top.perdedores.map(completar) : [],
  }
}

// /indice-general solo trae valor y variación; apertura, máximo, mínimo, cierre y serie son opcionales.
export const aIndiceGeneral = (i) => ({
  fecha: i.fecha,
  valor: i.valor,
  variacion: i.variacionPct,
  puntos: i.variacion,
  apertura: i.apertura,
  maximo: i.maximo,
  minimo: i.minimo,
  cierre: i.cierre,
  serie: i.serie,
})

// Normaliza la respuesta de autenticación del Backend .NET (AuthResponseDto en docs/api/openapi-v1.json)
// Contrato: { token: string, expiraEn: int32, usuario: { id: uuid, nombre: string, rol: string } }
export function aSesion(respuestaApi) {
  if (!respuestaApi || typeof respuestaApi.token !== 'string' || !respuestaApi.token.trim()) {
    return null
  }

  const token = respuestaApi.token.trim()

  // Formato oficial de docs/api/openapi-v1.json: { token, expiraEn, usuario: { id, nombre, rol } }
  if (respuestaApi.usuario && typeof respuestaApi.usuario === 'object') {
    const u = respuestaApi.usuario
    return {
      token,
      expiraEn: respuestaApi.expiraEn ?? null,
      usuario: {
        idUsuario: u.idUsuario ?? u.id ?? null,
        email: u.email ?? u.usuario ?? '',
        nombreCompleto: u.nombreCompleto ?? u.nombre ?? u.usuario ?? '',
        nombre: u.nombre ?? u.nombreCompleto ?? u.usuario ?? '',
        rol: u.rol ?? null,
      },
    }
  }

  // Respaldo para variante plana de AuthResponseDto: { idUsuario, email, nombreCompleto, rol, token }
  const nombreCompleto = respuestaApi.nombreCompleto ?? respuestaApi.email?.split('@')[0] ?? ''
  return {
    token,
    expiraEn: respuestaApi.expiraEn ?? null,
    usuario: {
      idUsuario: respuestaApi.idUsuario ?? respuestaApi.id ?? null,
      email: respuestaApi.email ?? '',
      nombreCompleto,
      nombre: nombreCompleto,
      rol: respuestaApi.rol ?? null,
    },
  }
}

// --- Serie OHLC ---------------------------------------------------------------
// GET /api/v1/entidades/{id}/ohlc devuelve OhlcResponseDto (docs/api/openapi-v1.json):
// { entidadId, entidad, periodo, serie: OhlcPuntoDto[] }
// lightweight-charts necesita [{ time, open, high, low, close }, ...].

const PRIMER_VALOR = (obj, claves) => {
  for (const k of claves) {
    if (obj?.[k] !== undefined && obj[k] !== null) return obj[k]
  }
  return undefined
}

// 'time' debe ser 'YYYY-MM-DD' o un epoch en segundos
function aTiempo(valor) {
  if (typeof valor === 'number') return valor
  const texto = String(valor ?? '')
  const soloFecha = texto.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(soloFecha) ? soloFecha : texto
}

const aNumero = (v) => (v === null || v === undefined || v === '' ? undefined : Number(v))

export function aSerieOhlc(respuesta) {
  if (Array.isArray(respuesta)) return normalizarVelas(respuesta)
  if (!respuesta || typeof respuesta !== 'object') return []

  if (Array.isArray(respuesta.serie)) {
    return normalizarVelas(respuesta.serie)
  }

  const serie = Object.values(respuesta).find(
    (v) => Array.isArray(v) && v.length > 0 && typeof v[0] === 'object',
  )
  if (!serie) return []
  return normalizarVelas(serie)
}

function normalizarVelas(serie) {
  const puntosCrudos = serie
    .map((v) => ({
      time: aTiempo(PRIMER_VALOR(v, ['fecha', 'time', 'date', 'periodo'])),
      open: aNumero(PRIMER_VALOR(v, ['apertura', 'open'])),
      high: aNumero(PRIMER_VALOR(v, ['maximo', 'máximo', 'high'])),
      low: aNumero(PRIMER_VALOR(v, ['minimo', 'mínimo', 'low'])),
      close: aNumero(PRIMER_VALOR(v, ['cierre', 'close', 'valor'])),
    }))
    .filter((v) => v.time && Number.isFinite(v.close))
    .sort((a, b) => String(a.time).localeCompare(String(b.time)))

  // Si los datos del backend vienen planos (open === close === high === low),
  // se aplica continuidad de mercado: la apertura es el cierre del periodo anterior.
  return puntosCrudos.map((punto, index) => {
    let { open, high, low, close } = punto
    const esPlana = open === close && (high === low || !high)

    if (esPlana && index > 0) {
      const cierreAnterior = puntosCrudos[index - 1].close
      if (Number.isFinite(cierreAnterior)) {
        open = cierreAnterior
        high = Math.max(open, close)
        low = Math.min(open, close)
      }
    }

    return {
      time: punto.time,
      open,
      high,
      low,
      close,
    }
  })
}
