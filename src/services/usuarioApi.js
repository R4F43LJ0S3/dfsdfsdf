// Crear cuentas de usuario (solo Administrador).
// Archivo independiente: si Backend cambia la ruta o los roles, se ajusta AQUÍ.
import axios from 'axios'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const BASE = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}${import.meta.env.VITE_API_PREFIX ?? '/api/v1'}`

// Contrato real: POST /api/v1/usuarios/registrar
// { email, password, primerNombre, primerApellido, idRol (UUID) } -> UUID del usuario creado.
export const RUTA_REGISTRAR = '/usuarios/registrar'

// El backend pide el UUID del rol (idRol) y NO tiene un endpoint para listarlos.
// Pídele a Backend los UUID de cada rol y pégalos en "id".
export const ROLES = [
  { nombre: 'Administrador', id: '' },
  { nombre: 'Data Steward', id: '' },
  { nombre: 'Analista financiero', id: '' },
  { nombre: 'Gerente', id: '' },
  { nombre: 'Auditor', id: '' },
  { nombre: 'Usuario móvil', id: '' },
]

// Los errores del backend vienen como Problem Details: se muestra "detail".
function mensaje(err) {
  const r = err?.response
  if (!r) return 'No hay conexión con el servidor. Intenta de nuevo.'
  const p = r.data
  if (p?.detail) return p.detail
  if (p?.errors) return Object.values(p.errors).flat().join(' ')
  if (p?.error) return p.error
  if (p?.title) return p.title
  if (r.status === 401) return 'Tu sesión venció. Inicia sesión de nuevo.'
  if (r.status === 403) return 'Tu rol no tiene permiso para crear cuentas.'
  if (r.status === 409) return 'Ya existe una cuenta con ese correo.'
  return 'No se pudo crear la cuenta.'
}

export async function crearUsuario({ email, password, primerNombre, primerApellido, rol }) {
  const idRol = ROLES.find((r) => r.nombre === rol)?.id
  if (USE_MOCK) {
    await new Promise((ok) => setTimeout(ok, 300))
    return { idUsuario: crypto.randomUUID() }
  }
  if (!idRol) throw new Error('Falta el UUID de ese rol. Pídelo a Backend y pégalo en src/services/usuariosApi.js.')
  try {
    const token = localStorage.getItem('token')
    const { data } = await axios.post(
      `${BASE}${RUTA_REGISTRAR}`,
      { email, password, primerNombre, primerApellido, idRol },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 },
    )
    return { idUsuario: data }
  } catch (err) {
    throw new Error(mensaje(err))
  }
}