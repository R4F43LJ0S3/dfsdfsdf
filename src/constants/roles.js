export const ROLES = {
  ADMINISTRADOR: 'Administrador',
  ANALISTA: 'Analista financiero',
  GERENTE: 'Gerente',
  DATA_STEWARD: 'Data Steward',
  AUDITOR: 'Auditor',
  USUARIO_MOVIL: 'Usuario móvil',
};

export const ROLES_LISTA = Object.values(ROLES);

// Comparación exacta normalizada en UTF-8 NFC (estándar OWASP de control de acceso basado en roles)
export const tieneRol = (usuario, rolesPermitidos) => {
  if (!usuario || !usuario.rol) return false;
  if (!rolesPermitidos || rolesPermitidos.length === 0) return true;
  const rolActual = String(usuario.rol).normalize('NFC').trim();
  return rolesPermitidos.some((r) => String(r).normalize('NFC').trim() === rolActual);
};


// Id de cada rol en la base de datos (tabla seguridad.roles).
// El servidor no tiene ruta para listar roles, por eso van fijos aquí.
export const ROLES_CATALOGO = Object.freeze([
  { id: '00000000-0000-0000-0000-000000000001', nombre: ROLES.ADMINISTRADOR, descripcion: 'Control total del sistema' },
  { id: '00000000-0000-0000-0000-000000000002', nombre: ROLES.ANALISTA, descripcion: 'Calcula, valida y publica métricas' },
  { id: '00000000-0000-0000-0000-000000000003', nombre: ROLES.GERENTE, descripcion: 'Consulta rankings y toma decisiones' },
  { id: '00000000-0000-0000-0000-000000000004', nombre: ROLES.DATA_STEWARD, descripcion: 'Mantiene diccionario y reglas de calidad' },
  { id: '00000000-0000-0000-0000-000000000005', nombre: ROLES.AUDITOR, descripcion: 'Revisa linaje y bitácora' },
  { id: '00000000-0000-0000-0000-000000000006', nombre: ROLES.USUARIO_MOVIL, descripcion: 'Consulta cotizaciones y watchlist' },
]);

export const nombreRol = (idRol) => ROLES_CATALOGO.find((r) => r.id === idRol)?.nombre ?? 'Sin rol';
