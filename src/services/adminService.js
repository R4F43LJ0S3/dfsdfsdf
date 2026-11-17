// HU-FE-07 Usuarios, roles y parámetros
// Servicio del módulo de administración sin datos mock.
// - Crear usuario usa la ruta oficial real POST /api/v1/usuarios/registrar (docs/api/openapi-v1.json).
// - Listar, editar, activar/desactivar usuarios y configuración de pesos reportan estado pendiente
//   hasta que el backend en Render publique sus endpoints correspondientes.

import { http } from './api'
import { ENDPOINTS } from './endpoints'
import { registrarUsuario } from './authService'
import { nombreRol, normalizarNombreRol, ROLES_CATALOGO } from '../constants/roles'
import { normalizarIdentificador } from '../utils/texto'
import { validarPesos, aCentesimas } from '../constants/validaciones'

// Estados válidos en el backend (entidad Usuario): 'activo', 'inactivo', 'bloqueado'
export const ESTADOS_USUARIO = Object.freeze({ ACTIVO: 'activo', INACTIVO: 'inactivo', BLOQUEADO: 'bloqueado' })

// Rutas que el frontend espera del backend (para mostrarlas en pantalla si faltan)
export const RUTAS_ESPERADAS = Object.freeze({
  listarUsuarios: 'GET /api/v1/usuarios',
  editarUsuario: 'PUT /api/v1/usuarios/{id}',
  cambiarEstadoUsuario: 'PATCH /api/v1/usuarios/{id}/estado',
  pesosDimensiones: 'GET /api/v1/ic/configuracion · POST /api/v1/ic/configuracion/versiones',
})

// Error cuando el backend aún no publica la ruta. La pantalla lo reconoce por la propiedad "pendiente"
function errorRutaPendiente(clave) {
  const detail = `El backend todavía no publica la ruta ${RUTAS_ESPERADAS[clave]}.`
  const err = new Error(detail)
  err.pendiente = clave
  err.response = { status: 501, data: { status: 501, detail } }
  return err
}

// Error con formato ProblemDetails (RFC 9457)
function errorLocal(status, detail) {
  const err = new Error(detail)
  err.response = { status, data: { status, detail } }
  return err
}

// Normaliza el UsuarioDto que responde el servidor a la forma que usa la pantalla.
// El backend envia: idUsuario, email, primerNombre, segundoNombre, primerApellido,
// segundoApellido, idRol, rol, estado. Nunca envia el hash de la contrasena.
export const conRol = (u) => {
  const primerNombre = String(u.primerNombre ?? '').trim()
  const primerApellido = String(u.primerApellido ?? '').trim()
  return {
    ...u,
    id: u.idUsuario ?? u.id,
    primerNombre,
    primerApellido,
    estado: String(u.estado ?? ESTADOS_USUARIO.ACTIVO).toLowerCase(),
    rol: u.rol ?? nombreRol(u.idRol),
    nombreCompleto: `${primerNombre} ${primerApellido}`.trim() || u.email || 'Sin nombre',
  }
}

// El backend no publica un catalogo de roles. Cada usuario si trae su idRol real junto
// al nombre del rol, asi que se toman esos ids verdaderos y se completan los que falten
// con el catalogo local de constants/roles.js.
export function catalogoRolesDesde(usuarios) {
  const idsReales = new Map()
  for (const u of usuarios ?? []) {
    if (u?.idRol && u?.rol) idsReales.set(normalizarNombreRol(u.rol), u.idRol)
  }
  return ROLES_CATALOGO.map((r) => {
    const idReal = idsReales.get(normalizarNombreRol(r.nombre))
    return idReal && idReal !== r.id ? { ...r, id: idReal } : r
  })
}

// ---------------------------------------------------------------- Usuarios

// GET /api/v1/usuarios - solo Administrador. Devuelve unicamente los usuarios activos.
export async function listarUsuarios() {
  if (!ENDPOINTS.listarUsuarios) throw errorRutaPendiente('listarUsuarios')
  const { data } = await http.get(ENDPOINTS.listarUsuarios)
  return (Array.isArray(data) ? data : data?.items ?? []).map(conRol)
}

// POST /api/v1/usuarios/registrar - responde el UUID del usuario creado.
export async function crearUsuario({ email, password, primerNombre, primerApellido, idRol }) {
  const correo = normalizarIdentificador(email)
  const nombre = String(primerNombre).normalize('NFC').trim()
  const apellido = String(primerApellido).normalize('NFC').trim()

  return registrarUsuario({ email: correo, password, primerNombre: nombre, primerApellido: apellido, idRol })
}

// PUT /api/v1/usuarios/{id} - el cuerpo viaja completo (ActualizarUsuarioSolicitud).
// Si password va vacio, el backend conserva la contrasena actual.
export async function editarUsuario(id, datos) {
  if (!ENDPOINTS.editarUsuario) throw errorRutaPendiente('editarUsuario')
  const { email, primerNombre, primerApellido, segundoNombre, segundoApellido, idRol, password } = datos

  const limpiar = (v) => String(v ?? '').normalize('NFC').trim()
  const opcional = (v) => limpiar(v) || null

  const cuerpo = {
    email: normalizarIdentificador(email),
    primerNombre: limpiar(primerNombre),
    segundoNombre: opcional(segundoNombre),
    primerApellido: limpiar(primerApellido),
    segundoApellido: opcional(segundoApellido),
    idRol,
  }

  const clave = String(password ?? '').trim()
  if (clave) cuerpo.password = clave

  const { data } = await http.put(ENDPOINTS.editarUsuario(id), cuerpo)
  return data && typeof data === 'object' ? conRol(data) : data
}

// DELETE /api/v1/usuarios/{id} - baja logica: deja el usuario en 'inactivo' y conserva
// sus reglas, notificaciones y bitacora. Es idempotente.
// El backend rechaza desactivar al ultimo administrador (409) y la autobaja (422).
export async function desactivarUsuario(id) {
  if (!ENDPOINTS.eliminarUsuario) throw errorRutaPendiente('cambiarEstadoUsuario')
  const { data } = await http.delete(ENDPOINTS.eliminarUsuario(id))
  return data
}

// Puente con la pantalla, que razona en estados. El servidor solo publica la baja.
export async function cambiarEstadoUsuario(id, estado) {
  if (!Object.values(ESTADOS_USUARIO).includes(estado)) throw errorLocal(422, 'Estado de usuario no valido.')
  if (estado === ESTADOS_USUARIO.ACTIVO) {
    throw errorLocal(501, 'Volver a activar un usuario se hace en la base de datos: el servidor solo publica la baja logica.')
  }
  return desactivarUsuario(id)
}

// ---------------------------------------------------------------- Pesos (Configuración del IC)

let ultimaConfiguracionIc = null

export async function obtenerPesos() {
  if (!ENDPOINTS.icConfiguracion) throw errorRutaPendiente('pesosDimensiones')
  const { data } = await http.get(ENDPOINTS.icConfiguracion)
  ultimaConfiguracionIc = data && typeof data === 'object' && !Array.isArray(data) ? data : null
  const lista = Array.isArray(data?.pesos) ? data.pesos : Array.isArray(data) ? data : []
  return lista.map((d, idx) => {
    const bruto = Number(d.peso ?? d.pesoIc ?? 0)
    const enPorcentaje = bruto <= 1 ? Math.round(bruto * 1000) / 10 : Math.round(bruto * 10) / 10
    return {
      idDimension: d.idDimension ?? idx + 1,
      dimension: d.dimension ?? d.nombre ?? `Dimensión ${idx + 1}`,
      peso: enPorcentaje,
    }
  })
}

export async function guardarPesos(pesos, motivo = '') {
  const revision = validarPesos(pesos)
  if (!revision.valido) throw errorLocal(422, revision.error)

  const limpios = pesos.map((p) => ({
    idDimension: p.idDimension,
    dimension: p.dimension,
    peso: aCentesimas(p.peso) / 100,
  }))

  if (!ENDPOINTS.icVersiones) throw errorRutaPendiente('pesosDimensiones')

  const motivoLimpio =
    String(motivo ?? '').trim().slice(0, 500) ||
    'Actualización de ponderaciones por dimensión del IC'

  const cuerpo = {
    motivo: motivoLimpio,
    frecuencia: ultimaConfiguracionIc?.frecuenciaIc || 'Mensual',
    pesos: limpios.map((p) => ({
      dimension: p.dimension,
      peso: Number((aCentesimas(p.peso) / 10000).toFixed(6)),
    })),
    umbrales: Array.isArray(ultimaConfiguracionIc?.umbrales) ? ultimaConfiguracionIc.umbrales : [],
  }

  await http.post(ENDPOINTS.icVersiones, cuerpo)
  return limpios
}
