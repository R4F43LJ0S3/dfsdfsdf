// HU-FE-07 Usuarios, roles y parámetros
// Servicio del módulo de administración sin datos mock, conectado al contrato oficial docs/api/openapi-v1.json:
// - GET    /api/v1/usuarios                         (listar usuarios activos)
// - POST   /api/v1/usuarios/registrar               (crear usuario)
// - PUT    /api/v1/usuarios/{id}                    (editar usuario y contraseña opcional)
// - DELETE /api/v1/usuarios/{id}                    (baja lógica -> estado 'inactivo')
// - GET    /api/v1/ic/configuracion                 (obtener pesos vigentes del IC)
// - POST   /api/v1/ic/configuracion/versiones       (crear nueva versión de pesos del IC)

import { http, limpiarCacheApi } from './api'
import { ENDPOINTS } from './endpoints'
import { registrarUsuario } from './authService'
import { nombreRol, normalizarNombreRol, ROLES_CATALOGO } from '../constants/roles'
import { normalizarIdentificador } from '../utils/texto'
import { validarPesos, aCentesimas } from '../constants/validaciones'

// Estados válidos en el backend (entidad Usuario): 'activo', 'inactivo', 'bloqueado'
export const ESTADOS_USUARIO = Object.freeze({ ACTIVO: 'activo', INACTIVO: 'inactivo', BLOQUEADO: 'bloqueado' })

// Error con formato ProblemDetails (RFC 9457)
function errorLocal(status, detail) {
  const err = new Error(detail)
  err.response = { status, data: { status, detail } }
  return err
}

// Normaliza el UsuarioDto que responde el servidor a la forma que usa la pantalla.
// El backend envía: idUsuario, email, primerNombre, segundoNombre, primerApellido,
// segundoApellido, idRol, rol, estado. Nunca envía el hash de la contraseña.
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

// El backend no publica un catálogo separado de roles, pero cada UsuarioDto de GET /api/v1/usuarios
// incluye su idRol (UUID real en PostgreSQL) junto al nombre del rol. Se sincronizan esos UUIDs reales
// sobre el catálogo base de constants/roles.js.
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

// GET /api/v1/usuarios - solo Administrador. Devuelve los usuarios activos.
export async function listarUsuarios() {
  const { data } = await http.get(ENDPOINTS.listarUsuarios)
  return (Array.isArray(data) ? data : data?.items ?? []).map(conRol)
}

// POST /api/v1/usuarios/registrar - responde el UUID del usuario creado.
export async function crearUsuario({ email, password, primerNombre, primerApellido, idRol }) {
  const correo = normalizarIdentificador(email)
  const nombre = String(primerNombre).normalize('NFC').trim()
  const apellido = String(primerApellido).normalize('NFC').trim()

  const creado = await registrarUsuario({ email: correo, password, primerNombre: nombre, primerApellido: apellido, idRol })
  limpiarCacheApi()
  return creado
}

// PUT /api/v1/usuarios/{id} - el cuerpo viaja completo (ActualizarUsuarioSolicitud).
// Si password va vacío, el backend conserva la contraseña actual.
export async function editarUsuario(id, datos) {
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
  limpiarCacheApi()
  return data && typeof data === 'object' ? conRol(data) : data
}

// DELETE /api/v1/usuarios/{id} - baja lógica: deja el usuario en 'inactivo' y conserva
// sus reglas, notificaciones y bitácora. Es idempotente.
// El backend rechaza desactivar al último administrador (409) y la autobaja (422).
export async function desactivarUsuario(id) {
  const { data } = await http.delete(ENDPOINTS.eliminarUsuario(id))
  limpiarCacheApi()
  return data
}

// Puente con la pantalla para cambios de estado.
export async function cambiarEstadoUsuario(id, estado) {
  if (!Object.values(ESTADOS_USUARIO).includes(estado)) throw errorLocal(422, 'Estado de usuario no válido.')
  if (estado === ESTADOS_USUARIO.ACTIVO) {
    throw errorLocal(501, 'La reactivación de un usuario se gestiona directamente en la base de datos.')
  }
  return desactivarUsuario(id)
}

// ---------------------------------------------------------------- Pesos (Configuración del IC)

let ultimaConfiguracionIc = null

export async function obtenerPesos() {
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
  limpiarCacheApi()
  return limpios
}
