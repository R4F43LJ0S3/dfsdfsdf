// Utilidades de normalización Unicode (UTF-8) para correos, roles, códigos y filtros.

// Normaliza correo/usuario: conserva ñ y símbolos válidos en NFC, recorta espacios y pasa a minúsculas.
export function normalizarIdentificador(valor = '') {
  return String(valor).normalize('NFC').trim().toLowerCase()
}

// Normaliza contraseñas en forma canónica NFC sin alterar mayúsculas, ñ ni símbolos especiales.
export function normalizarPassword(valor = '') {
  return String(valor).normalize('NFC')
}

// Clave de comparación insensible a mayúsculas y tildes (conservando distinción semántica o plegándola).
export function claveComparacion(valor = '') {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}
