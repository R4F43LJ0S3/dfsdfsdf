function decodificarSegmentoBase64Url(segmento) {
  if (!segmento || typeof segmento !== 'string') return null;
  const base64SinPad = segmento.replace(/-/g, '+').replace(/_/g, '/');
  const padNecesario = (4 - (base64SinPad.length % 4)) % 4;
  const base64 = base64SinPad + '='.repeat(padNecesario);

  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) {
    bytes[i] = binario.charCodeAt(i);
  }

  const jsonTexto = new TextDecoder('utf-8').decode(bytes);
  return JSON.parse(jsonTexto);
}

// Decodificador seguro de JWT compatible con RFC 7519 y UTF-8 completo (ñ, tildes y símbolos).
// Rechaza cualquier token sin firma criptográfica o con algoritmo 'none'.
export function decodificarJwt(token) {
  if (!token || typeof token !== 'string') return null;

  try {
    const partes = token.trim().split('.');
    if (partes.length !== 3) return null;

    const [encabezadoB64, payloadB64, firmaB64] = partes;
    if (!encabezadoB64 || !payloadB64 || !firmaB64 || firmaB64.length < 8) {
      return null;
    }

    const header = decodificarSegmentoBase64Url(encabezadoB64);
    if (!header || typeof header.alg !== 'string' || header.alg.toLowerCase() === 'none') {
      return null;
    }

    const payload = decodificarSegmentoBase64Url(payloadB64);
    if (!payload || typeof payload !== 'object') return null;

    return payload;
  } catch {
    return null;
  }
}

// Verifica si el token tiene estructura firmada válida y aún no ha expirado
export function esTokenVigente(token) {
  const payload = decodificarJwt(token);
  if (!payload) return false;

  // El contrato del backend incluye el claim exp (UNIX timestamp en segundos)
  if (typeof payload.exp !== 'number') return false;

  const ahoraSegundos = Math.floor(Date.now() / 1000);
  return payload.exp > ahoraSegundos;
}

// Extrae el rol principal del JWT emitido por el Backend .NET
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
