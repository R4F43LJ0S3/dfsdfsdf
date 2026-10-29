// Decodificador seguro de JWT compatible con RFC 7519 y UTF-8 completo (ñ, tildes y símbolos)
export function decodificarJwt(token) {
  if (!token || typeof token !== 'string') return null;

  try {
    const partes = token.split('.');
    if (partes.length !== 3) return null;

    // Normalizar Base64URL a Base64 estándar y restaurar el relleno '=' obligatorio para atob()
    const base64SinPad = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const padNecesario = (4 - (base64SinPad.length % 4)) % 4;
    const base64 = base64SinPad + '='.repeat(padNecesario);

    const binario = atob(base64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i += 1) {
      bytes[i] = binario.charCodeAt(i);
    }

    const jsonPayload = new TextDecoder('utf-8').decode(bytes);
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// Verifica si el token aún no ha expirado
export function esTokenVigente(token) {
  const payload = decodificarJwt(token);
  if (!payload) return false;

  // Si no tiene claim exp, consideramos vigente mientras exista
  if (!payload.exp) return true;

  // payload.exp está en segundos (UNIX timestamp)
  const ahoraSegundos = Math.floor(Date.now() / 1000);
  return payload.exp > ahoraSegundos;
}

// Extrae el rol principal del JWT emitido por .NET o Mock
export function extraerRolJwt(token) {
  const payload = decodificarJwt(token);
  if (!payload) return null;

  // .NET usa ClaimTypes.Role ("http://schemas.microsoft.com/ws/2008/06/identity/claims/role") o "role"
  return (
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
    payload.role ??
    payload.rol ??
    null
  );
}
