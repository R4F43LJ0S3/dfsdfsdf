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
