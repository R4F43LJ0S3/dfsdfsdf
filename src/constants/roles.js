export const ROLES = {
  ADMINISTRADOR: 'Administrador',
  DATA_STEWARD: 'Data Steward',
  ANALISTA: 'Analista financiero',
  GERENTE: 'Gerente / Directivo',
  AUDITOR: 'Auditor',
  USUARIO_MOVIL: 'Usuario móvil',
  // Alias retrocompatible
  USUARIO_CONSULTA: 'Usuario móvil',
}

export const ROLES_LISTA = [
  ROLES.ADMINISTRADOR,
  ROLES.DATA_STEWARD,
  ROLES.ANALISTA,
  ROLES.GERENTE,
  ROLES.AUDITOR,
  ROLES.USUARIO_MOVIL,
]

// Mapa de alias para mantener compatibilidad bidireccional
const ALIAS_ROLES = {
  administrador: ROLES.ADMINISTRADOR,
  admin: ROLES.ADMINISTRADOR,
  'data steward': ROLES.DATA_STEWARD,
  datasteward: ROLES.DATA_STEWARD,
  analista: ROLES.ANALISTA,
  'analista financiero': ROLES.ANALISTA,
  gerente: ROLES.GERENTE,
  'gerente / directivo': ROLES.GERENTE,
  gerencia: ROLES.GERENTE,
  auditor: ROLES.AUDITOR,
  auditoria: ROLES.AUDITOR,
  'usuario móvil': ROLES.USUARIO_MOVIL,
  'usuario movil': ROLES.USUARIO_MOVIL,
  'usuario de consulta': ROLES.USUARIO_MOVIL,
  consulta: ROLES.USUARIO_MOVIL,
}

export const normalizarNombreRol = (rol) => {
  const limpio = String(rol ?? '').normalize('NFC').trim()
  const clave = limpio.toLowerCase()
  return ALIAS_ROLES[clave] ?? limpio
}

// Comparación exacta normalizada en UTF-8 NFC (estándar OWASP de control de acceso basado en roles)
export const tieneRol = (usuario, rolesPermitidos) => {
  if (!usuario || !usuario.rol) return false
  if (!rolesPermitidos || rolesPermitidos.length === 0) return true
  const rolActual = normalizarNombreRol(usuario.rol)
  return rolesPermitidos.some((r) => normalizarNombreRol(r) === rolActual)
}

// Id de cada rol en la base de datos (tabla seguridad.roles).
// Catálogo oficial según HU-FE-07 Sprint 4 CA 1
export const ROLES_CATALOGO = Object.freeze([
  { id: '00000000-0000-0000-0000-000000000001', nombre: ROLES.ADMINISTRADOR, descripcion: 'Control total del sistema' },
  { id: '00000000-0000-0000-0000-000000000002', nombre: ROLES.ANALISTA, descripcion: 'Calcula, valida y publica métricas' },
  { id: '00000000-0000-0000-0000-000000000003', nombre: ROLES.GERENTE, descripcion: 'Consulta rankings y toma decisiones' },
  { id: '00000000-0000-0000-0000-000000000004', nombre: ROLES.DATA_STEWARD, descripcion: 'Mantiene diccionario y reglas de calidad' },
  { id: '00000000-0000-0000-0000-000000000005', nombre: ROLES.AUDITOR, descripcion: 'Revisa linaje y bitácora' },
  { id: '00000000-0000-0000-0000-000000000006', nombre: ROLES.USUARIO_MOVIL, descripcion: 'Consulta cotizaciones y watchlist' },
])

export const nombreRol = (idRol) => ROLES_CATALOGO.find((r) => r.id === idRol)?.nombre ?? 'Sin rol'
