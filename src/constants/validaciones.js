// ============================================================================
// Normas generales de validación, límites de longitud y seguridad de entrada
// Basado en: OWASP ASVS v4.0, NIST SP 800-63B, RFC 5321/5322 y esquema BD SIFTC
// ============================================================================

export const LIMITES_CAMPOS = Object.freeze({
  EMAIL_MIN: 3,
  EMAIL_MAX: 120,          // Alineado con seguridad.usuarios.email VARCHAR(120) y subconjunto RFC 5321
  USUARIO_ALIAS_MAX: 50,   // Alineado con Diccionario de Datos HU-DD-01 Texto(50)
  PASSWORD_MIN: 6,
  PASSWORD_MAX: 64,        // Estándar OWASP para BCrypt (evita truncamiento a 72 bytes y DoS por hashing)
  NOMBRE_MAX: 30,          // Alineado con primer_nombre / primer_apellido VARCHAR(30)
  BUSQUEDA_MAX: 80,        // Alineado con nombre_entidad VARCHAR(80)
  CODIGO_ENTIDAD_MAX: 10,  // Alineado con ticker / codigo_entidad VARCHAR(10)
})

export const SEGURIDAD_LOGIN = Object.freeze({
  MAX_INTENTOS: 10,                      // Máximo 10 intentos fallidos permitidos
  TIEMPO_BLOQUEO_MS: 5 * 60 * 1000,      // 5 minutos de bloqueo temporal al llegar a 10 intentos
  VENTANA_REINICIO_MS: 15 * 60 * 1000,   // Reinicia contador tras 15 min sin fallos
  COOLDOWN_PETICION_MS: 800,             // Evita ráfagas automatizadas de clics seguidos
  UMBRAL_ADVERTENCIA: 7,                 // Muestra advertencia desde el intento 7 de 10
})

// Caracteres de control ASCII/Unicode e invisibles (Null-byte, Zero-Width, Bidi Trojan Source)
// eslint-disable-next-line no-control-regex
const REGEX_CONTROL_E_INVISIBLES = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g

// Emojis o pares sustitutos fuera del Plano Multilingüe Básico (consumen 4 bytes UTF-8 en BCrypt)
const REGEX_SUSTITUTOS_UTF16 = /[\uD800-\uDFFF]/

// Caracteres individuales permitidos en un identificador (correo o alias)
const REGEX_CHAR_IDENTIFICADOR = /^[a-zA-Z0-9._+\-@]$/

// Letras con tilde o ñ (válidas en contraseñas y nombres, pero no en correo/alias estándar RFC 5322)
const REGEX_TILDE_O_ENIE = /^[ñÑáéíóúÁÉÍÓÚüÜ]$/

// Formato estándar RFC 5322 (subconjunto seguro corporativo W3C/OWASP) para correo electrónico
const REGEX_EMAIL_ESTANDAR = /^[a-zA-Z0-9]+([._+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,24}$/

// Formato estándar para alias de usuario institucional (sin @)
const REGEX_ALIAS_USUARIO = /^[a-zA-Z0-9]+([._-][a-zA-Z0-9]+)*$/

// Lista blanca estricta OWASP para contraseñas (por carácter y cadena completa):
// Letras (incluyendo ñ/Ñ y tildes hispanas), dígitos y símbolos estándar seguros de teclado.
// Quedan excluidos espacios, comillas (' " `), < >, ;, \, |, corchetes y caracteres de control.
const REGEX_CHAR_PASSWORD_PERMITIDO = /^[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚüÜ!@#$%^&*()_+\-=.,:?~/]$/
const REGEX_PASSWORD_PERMITIDA = /^[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚüÜ!@#$%^&*()_+\-=.,:?~/]+$/

// Sanitiza caracteres invisibles de control y detiene el cursor exactamente en EMAIL_MAX (120)
export function limitarEntradaIdentificador(valor = '') {
  return String(valor)
    .normalize('NFC')
    .replace(REGEX_CONTROL_E_INVISIBLES, '')
    .slice(0, LIMITES_CAMPOS.EMAIL_MAX)
}

// Sanitiza caracteres invisibles de control y detiene el cursor exactamente en PASSWORD_MAX (64)
export function limitarEntradaPassword(valor = '') {
  return String(valor)
    .normalize('NFC')
    .replace(REGEX_CONTROL_E_INVISIBLES, '')
    .slice(0, LIMITES_CAMPOS.PASSWORD_MAX)
}

// Validación instantánea tecla por tecla para usuario/correo (marca error en cuanto se ingresa algo inválido)
export function validarIdentificadorTiempoReal(valor = '') {
  const texto = String(valor).normalize('NFC')
  if (!texto) return { valido: true, error: null }

  if (/\s/.test(texto)) {
    return { valido: false, error: 'No se permiten espacios en blanco en el usuario o correo.' }
  }

  for (const ch of texto) {
    if (REGEX_TILDE_O_ENIE.test(ch)) {
      return {
        valido: false,
        error: `El carácter "${ch}" no es válido aquí. El usuario o correo no admite tildes ni "ñ".`,
      }
    }
    if (REGEX_SUSTITUTOS_UTF16.test(ch) || !REGEX_CHAR_IDENTIFICADOR.test(ch)) {
      return {
        valido: false,
        error: `El carácter "${ch}" no está permitido. Usa solo letras (a-z), números y (._+-@).`,
      }
    }
  }

  if (/^[._+\-@]/.test(texto)) {
    return { valido: false, error: 'El usuario o correo debe comenzar con una letra o un número.' }
  }

  const cantidadArrobas = (texto.match(/@/g) || []).length
  if (cantidadArrobas > 1) {
    return { valido: false, error: 'Solo se permite un símbolo "@" en el correo electrónico.' }
  }

  if (texto.includes('@')) {
    const [local, dominio] = texto.split('@')

    if (local.length > 64) {
      return { valido: false, error: 'La parte antes de "@" no puede superar los 64 caracteres (RFC 5321).' }
    }

    if (/[._+-]{2,}/.test(local)) {
      return { valido: false, error: 'No se permiten dos símbolos separadores seguidos antes de "@".' }
    }

    if (/[._+-]$/.test(local)) {
      return { valido: false, error: 'No puede ir un símbolo (., _, +, -) justo antes de "@".' }
    }

    if (dominio.length > 0) {
      if (/[_+]/.test(dominio)) {
        return {
          valido: false,
          error: 'El dominio después de "@" solo admite letras, números, punto (.) y guion (-).',
        }
      }
      if (/^[.-]/.test(dominio)) {
        return { valido: false, error: 'El dominio después de "@" debe comenzar con letra o número.' }
      }
      if (/[.-]{2,}/.test(dominio)) {
        return { valido: false, error: 'El dominio no puede tener puntos o guiones seguidos.' }
      }
    }

    return { valido: true, error: null }
  }

  if (/[._+-]{2,}/.test(texto)) {
    return { valido: false, error: 'No se permiten dos símbolos separadores seguidos.' }
  }

  if (texto.length > 64) {
    return {
      valido: false,
      error: 'Sin "@", el texto supera el máximo permitido (50 para usuario o 64 antes de "@").',
    }
  }

  return { valido: true, error: null }
}

// Validación instantánea tecla por tecla para contraseña (marca error en cuanto se ingresa un símbolo prohibido)
export function validarPasswordTiempoReal(valor = '') {
  const texto = String(valor).normalize('NFC')
  if (!texto) return { valido: true, error: null }

  if (/\s/.test(texto)) {
    return { valido: false, error: 'No se permiten espacios en blanco en la contraseña.' }
  }

  for (const ch of texto) {
    if (REGEX_SUSTITUTOS_UTF16.test(ch) || !REGEX_CHAR_PASSWORD_PERMITIDO.test(ch)) {
      return {
        valido: false,
        error: `El carácter "${ch}" no está permitido por seguridad (no uses comillas, < >, ;, \\, | ni corchetes).`,
      }
    }
  }

  return { valido: true, error: null }
}

// Valida correo o usuario completo (al salir del campo o enviar el formulario) bajo RFC 5321/5322 y OWASP
export function validarIdentificadorAcceso(valor = '') {
  const texto = String(valor).normalize('NFC')

  if (!texto.trim()) {
    return { valido: false, error: 'Ingresa tu usuario o correo electrónico.' }
  }

  const enTiempoReal = validarIdentificadorTiempoReal(texto)
  if (!enTiempoReal.valido) {
    return enTiempoReal
  }

  if (texto.length < LIMITES_CAMPOS.EMAIL_MIN) {
    return { valido: false, error: `El usuario o correo debe tener al menos ${LIMITES_CAMPOS.EMAIL_MIN} caracteres.` }
  }

  if (texto.length > LIMITES_CAMPOS.EMAIL_MAX) {
    return { valido: false, error: `El correo no puede superar los ${LIMITES_CAMPOS.EMAIL_MAX} caracteres.` }
  }

  if (texto.includes('@')) {
    if (!REGEX_EMAIL_ESTANDAR.test(texto)) {
      return {
        valido: false,
        error: 'Completa un correo electrónico válido (ej: nombre@dominio.co).',
      }
    }
    return { valido: true, error: null }
  }

  // Validación como alias de usuario institucional (sin @)
  if (texto.includes('+')) {
    return {
      valido: false,
      error: 'El símbolo "+" solo se permite en correos con "@", no en alias de usuario.',
    }
  }

  if (texto.length > LIMITES_CAMPOS.USUARIO_ALIAS_MAX) {
    return { valido: false, error: `El nombre de usuario no puede superar los ${LIMITES_CAMPOS.USUARIO_ALIAS_MAX} caracteres.` }
  }

  if (!REGEX_ALIAS_USUARIO.test(texto)) {
    return {
      valido: false,
      error: 'El usuario no puede terminar en símbolo; usa letras, números, punto (.), guion (-) o guion bajo (_).',
    }
  }

  return { valido: true, error: null }
}

// Valida contraseña completa (al salir del campo o enviar) bajo norma OWASP ASVS v4.0 (2.1) y BCrypt
export function validarPasswordAcceso(valor = '') {
  const texto = String(valor).normalize('NFC')

  if (!texto) {
    return { valido: false, error: 'Ingresa tu contraseña.' }
  }

  const enTiempoReal = validarPasswordTiempoReal(texto)
  if (!enTiempoReal.valido) {
    return enTiempoReal
  }

  if (texto.length < LIMITES_CAMPOS.PASSWORD_MIN) {
    return {
      valido: false,
      error: `La contraseña debe tener entre ${LIMITES_CAMPOS.PASSWORD_MIN} y ${LIMITES_CAMPOS.PASSWORD_MAX} caracteres.`,
    }
  }

  if (texto.length > LIMITES_CAMPOS.PASSWORD_MAX || !REGEX_PASSWORD_PERMITIDA.test(texto)) {
    return {
      valido: false,
      error: `La contraseña no cumple el formato permitido (máximo ${LIMITES_CAMPOS.PASSWORD_MAX} caracteres).`,
    }
  }

  return { valido: true, error: null }
}


// ============================================================================
// HU-FE-07: validaciones del modulo de administracion (usuarios y pesos)
// ============================================================================

// Nombre o apellido: letras (con tildes y enie), espacio, guion o apostrofo. Max 30 (VARCHAR(30))
const REGEX_NOMBRE_PERSONA = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+([ '-][A-Za-zÁÉÍÓÚáéíóúÑñÜü]+)*$/

export function validarNombrePersona(valor = '', etiqueta = 'El nombre') {
  const texto = String(valor).normalize('NFC').trim()
  if (!texto) return { valido: false, error: `${etiqueta} es obligatorio.` }
  if (texto.length > LIMITES_CAMPOS.NOMBRE_MAX) {
    return { valido: false, error: `${etiqueta} no puede superar ${LIMITES_CAMPOS.NOMBRE_MAX} caracteres.` }
  }
  if (!REGEX_NOMBRE_PERSONA.test(texto)) {
    return { valido: false, error: `${etiqueta} solo admite letras y un espacio entre palabras.` }
  }
  return { valido: true, error: null }
}

// Para crear usuarios se exige correo completo (con @), no alias
export function validarCorreoUsuario(valor = '') {
  const texto = String(valor).normalize('NFC').trim()
  if (!texto) return { valido: false, error: 'El correo es obligatorio.' }
  if (!texto.includes('@')) return { valido: false, error: 'Escribe un correo completo (ej: nombre@siftc.edu.co).' }
  return validarIdentificadorAcceso(texto)
}

// Contrasena nueva al crear usuario: reglas de acceso + minimo 8 y letras con numeros
export function validarPasswordNueva(valor = '') {
  if (!valor) return { valido: false, error: 'La contraseña inicial es obligatoria.' }
  const base = validarPasswordAcceso(valor)
  if (!base.valido) return base
  if (valor.length < 8) return { valido: false, error: 'La contraseña nueva debe tener al menos 8 caracteres.' }
  if (!/[A-Za-zÑñ]/.test(valor) || !/\d/.test(valor)) {
    return { valido: false, error: 'La contraseña nueva debe combinar letras y números.' }
  }
  return { valido: true, error: null }
}

// Pesos de las dimensiones del indice: cada uno de 0 a 100 %, maximo 1 decimal, y todos deben sumar 100 %.
// En la base de datos (analitica.dim_dimension.peso_ic, NUMERIC(4,3)) se guardan de 0 a 1 con 3 decimales:
// 25,5 % en pantalla = 0.255 en la base. Por eso en pantalla solo se permite 1 decimal.
export const PESOS = Object.freeze({ TOTAL: 100, MIN: 0, MAX: 100, DECIMALES: 1 })

// Se trabaja en centesimas (enteros) para que 33.3 + 33.3 + 33.4 de 100 exacto, sin errores de coma flotante
export const aCentesimas = (valor) => Math.round(Number(String(valor).replace(',', '.')) * 100)

export function validarPeso(valor) {
  const texto = String(valor ?? '').trim().replace(',', '.')
  if (texto === '') return { valido: false, error: 'Obligatorio' }
  if (!/^\d{1,3}(\.\d)?$/.test(texto)) return { valido: false, error: 'Usa un número con máximo 1 decimal' }
  const n = Number(texto)
  if (n < PESOS.MIN || n > PESOS.MAX) return { valido: false, error: 'Debe estar entre 0 y 100' }
  return { valido: true, error: null }
}

export function sumarPesos(pesos = []) {
  return pesos.reduce((acc, p) => acc + (validarPeso(p.peso).valido ? aCentesimas(p.peso) : 0), 0) / 100
}

export function validarPesos(pesos = []) {
  if (pesos.some((p) => !validarPeso(p.peso).valido)) {
    return { valido: false, error: 'Revisa los pesos marcados en rojo.' }
  }
  const total = pesos.reduce((acc, p) => acc + aCentesimas(p.peso), 0)
  if (total !== PESOS.TOTAL * 100) {
    return { valido: false, error: `Los pesos deben sumar exactamente ${PESOS.TOTAL} %. Ahora suman ${(total / 100).toLocaleString('es-CO')} %.` }
  }
  return { valido: true, error: null }
}
