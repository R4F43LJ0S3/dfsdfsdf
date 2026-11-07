import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { ROLES_CATALOGO } from '../../constants/roles'
import {
  LIMITES_CAMPOS,
  validarNombrePersona,
  validarCorreoUsuario,
  validarPasswordNueva,
} from '../../constants/validaciones'

// HU-FE-07 CA 1: formulario para crear o editar un usuario (modal sobre la tabla)
// Si recibe "usuario" es edición; si no, es creación.

const VACIO = { primerNombre: '', primerApellido: '', email: '', password: '', idRol: '' }

function validar(datos, esEdicion) {
  const errores = {}
  const nombre = validarNombrePersona(datos.primerNombre, 'El nombre')
  if (!nombre.valido) errores.primerNombre = nombre.error
  const apellido = validarNombrePersona(datos.primerApellido, 'El apellido')
  if (!apellido.valido) errores.primerApellido = apellido.error
  if (!esEdicion) {
    const correo = validarCorreoUsuario(datos.email)
    if (!correo.valido) errores.email = correo.error
    const clave = validarPasswordNueva(datos.password)
    if (!clave.valido) errores.password = clave.error
  }
  if (!datos.idRol) errores.idRol = 'Elige un rol.'
  return errores
}

export default function UsuarioFormulario({ usuario, onGuardar, onCerrar }) {
  const esEdicion = Boolean(usuario)
  const [datos, setDatos] = useState(() =>
    esEdicion
      ? { primerNombre: usuario.primerNombre, primerApellido: usuario.primerApellido, email: usuario.email, password: '', idRol: usuario.idRol }
      : VACIO,
  )
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [guardando, setGuardando] = useState(false)
  const primerCampo = useRef(null)

  // Al abrir, el cursor va al primer campo. Con Escape se cierra
  useEffect(() => {
    primerCampo.current?.focus()
    const alPresionar = (e) => {
      if (e.key === 'Escape' && !guardando) onCerrar()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onCerrar, guardando])

  const cambiar = (campo) => (e) => {
    const valor = e.target.value
    setDatos((d) => ({ ...d, [campo]: valor }))
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: undefined }))
    if (errorGeneral) setErrorGeneral('')
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (guardando) return
    const nuevos = validar(datos, esEdicion)
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return

    setGuardando(true)
    try {
      await onGuardar(datos)
    } catch (err) {
      setErrorGeneral(err?.mensaje ?? 'No se pudo guardar. Intenta de nuevo.')
      setGuardando(false)
    }
  }

  const campo = (nombre, etiqueta, props = {}) => (
    <div className="adm-campo">
      <label htmlFor={`adm-${nombre}`}>{etiqueta}</label>
      <input
        id={`adm-${nombre}`}
        value={datos[nombre]}
        onChange={cambiar(nombre)}
        aria-invalid={Boolean(errores[nombre])}
        aria-describedby={errores[nombre] ? `adm-${nombre}-error` : undefined}
        className={errores[nombre] ? 'adm-input-error' : ''}
        disabled={guardando}
        {...props}
      />
      {errores[nombre] && <p id={`adm-${nombre}-error`} className="adm-error-campo">{errores[nombre]}</p>}
    </div>
  )

  return (
    <div className="adm-fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && !guardando && onCerrar()}>
      <div className="adm-modal" role="dialog" aria-modal="true" aria-labelledby="adm-modal-titulo">
        <div className="adm-modal-cabecera">
          <h2 id="adm-modal-titulo">{esEdicion ? 'Editar usuario' : 'Nuevo usuario'}</h2>
          <button type="button" className="adm-icono-btn" onClick={onCerrar} aria-label="Cerrar" disabled={guardando}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={enviar} noValidate>
          <div className="adm-fila-2">
            {campo('primerNombre', 'Nombre', { ref: primerCampo, maxLength: LIMITES_CAMPOS.NOMBRE_MAX, autoComplete: 'off' })}
            {campo('primerApellido', 'Apellido', { maxLength: LIMITES_CAMPOS.NOMBRE_MAX, autoComplete: 'off' })}
          </div>

          {esEdicion ? (
            <div className="adm-campo">
              <span className="adm-etiqueta">Correo</span>
              <p className="adm-solo-lectura">{datos.email}</p>
              <small className="adm-ayuda">El correo identifica al usuario y no se cambia.</small>
            </div>
          ) : (
            <>
              {campo('email', 'Correo', { type: 'email', maxLength: LIMITES_CAMPOS.EMAIL_MAX, autoComplete: 'off', spellCheck: false, placeholder: 'nombre@siftc.edu.co' })}
              {campo('password', 'Contraseña inicial', { type: 'password', maxLength: LIMITES_CAMPOS.PASSWORD_MAX, autoComplete: 'new-password' })}
              {!errores.password && <small className="adm-ayuda adm-ayuda-arriba">Mínimo 8 caracteres, con letras y números. El usuario la debe cambiar al entrar.</small>}
            </>
          )}

          <div className="adm-campo">
            <label htmlFor="adm-idRol">Rol</label>
            <select
              id="adm-idRol"
              value={datos.idRol}
              onChange={cambiar('idRol')}
              aria-invalid={Boolean(errores.idRol)}
              className={errores.idRol ? 'adm-input-error' : ''}
              disabled={guardando}
            >
              <option value="">Selecciona un rol…</option>
              {ROLES_CATALOGO.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre} — {r.descripcion}</option>
              ))}
            </select>
            {errores.idRol && <p className="adm-error-campo">{errores.idRol}</p>}
          </div>

          {errorGeneral && <p className="adm-alerta adm-alerta-error" role="alert">{errorGeneral}</p>}

          <p className="adm-alerta adm-alerta-aviso" role="status">
            Función en modo informativo: el registro de usuarios está temporalmente deshabilitado hasta su activación en el backend.
          </p>

          <div className="adm-modal-acciones">
            <button type="button" className="adm-btn adm-btn-secundario" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </button>
            <button
              type="submit"
              className="adm-btn adm-btn-principal adm-btn-deshabilitado"
              disabled={true}
              title="Registro temporalmente deshabilitado: pendiente de activación en el backend"
              aria-disabled="true"
            >
              {esEdicion ? 'Guardar cambios (Pendiente)' : 'Crear usuario (Próximamente)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
