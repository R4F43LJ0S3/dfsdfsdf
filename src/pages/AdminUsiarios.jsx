import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { crearUsuario, ROLES } from '../services/usuariosApi'
import './AdminUsuarios.css'

const VACIO = { primerNombre: '', primerApellido: '', email: '', rol: '', password: '' }

function generarClave() {
  const grupos = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!@#$%*?']
  const todos = grupos.join('')
  const azar = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n
  const letras = grupos.map((g) => g[azar(g.length)])
  while (letras.length < 12) letras.push(todos[azar(todos.length)])
  for (let i = letras.length - 1; i > 0; i--) {
    const j = azar(i + 1)
    ;[letras[i], letras[j]] = [letras[j], letras[i]]
  }
  return letras.join('')
}

function validar(f) {
  const e = {}
  if (!f.primerNombre.trim()) e.primerNombre = 'Escribe el nombre.'
  if (!f.primerApellido.trim()) e.primerApellido = 'Escribe el apellido.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Escribe un correo válido.'
  if (!f.rol) e.rol = 'Elige un rol.'
  if (f.password.length < 8 || !/[a-z]/.test(f.password) || !/[A-Z]/.test(f.password) || !/\d/.test(f.password)) {
    e.password = 'Mínimo 8 caracteres, con mayúscula, minúscula y número.'
  }
  return e
}

export default function AdminUsuarios() {
  const { usuario } = useAuth()
  const [form, setForm] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [verClave, setVerClave] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState('')
  const [creada, setCreada] = useState(null)
  const [copiado, setCopiado] = useState(false)

  const esAdmin = /admin/i.test(usuario?.rol ?? '')
  if (!esAdmin) {
    return <p role="alert" className="admin-aviso">Solo el administrador puede crear cuentas.</p>
  }

  const cambiar = (campo) => (e) => {
    setForm({ ...form, [campo]: e.target.value })
    setErrores({ ...errores, [campo]: undefined })
  }

  const enviar = async (e) => {
    e.preventDefault()
    setErrorGeneral('')
    const v = validar(form)
    setErrores(v)
    if (Object.keys(v).length > 0) return
    setEnviando(true)
    try {
      await crearUsuario(form)
      setCreada({ ...form, rolNombre: form.rol })
      setForm(VACIO)
      setVerClave(false)
    } catch (err) {
      setErrorGeneral(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const copiar = async () => {
    const texto = `Cuenta ALZA\nUsuario: ${creada.email}\nClave temporal: ${creada.password}\nRol: ${creada.rolNombre}`
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="admin">
      <header>
        <h1 className="admin-titulo">Crear cuenta de usuario</h1>
        <p className="admin-suave">Registra a una persona del sistema. Compárte le su correo y su clave temporal por un medio seguro.</p>
      </header>

      {creada && (
        <section className="admin-tarjeta admin-exito" role="status">
          <h2>Cuenta creada</h2>
          <dl>
            <div><dt>Nombre</dt><dd>{creada.primerNombre} {creada.primerApellido}</dd></div>
            <div><dt>Usuario (correo)</dt><dd>{creada.email}</dd></div>
            <div><dt>Clave temporal</dt><dd className="admin-mono">{creada.password}</dd></div>
            <div><dt>Rol</dt><dd>{creada.rolNombre}</dd></div>
          </dl>
          <p className="admin-suave">Esta clave solo se muestra ahora. Cópiala y entrégala a la persona.</p>
          <div className="admin-botones">
            <button type="button" className="admin-btn admin-btn-primario" onClick={copiar}>{copiado ? 'Copiado' : 'Copiar datos'}</button>
            <button type="button" className="admin-btn" onClick={() => setCreada(null)}>Crear otra cuenta</button>
          </div>
        </section>
      )}

      {!creada && (
        <form className="admin-tarjeta" onSubmit={enviar} noValidate>
          <div className="admin-grid">
            <label className="admin-campo">
              <span>Nombre</span>
              <input value={form.primerNombre} onChange={cambiar('primerNombre')} autoComplete="off" />
              {errores.primerNombre && <small className="admin-error">{errores.primerNombre}</small>}
            </label>
            <label className="admin-campo">
              <span>Apellido</span>
              <input value={form.primerApellido} onChange={cambiar('primerApellido')} autoComplete="off" />
              {errores.primerApellido && <small className="admin-error">{errores.primerApellido}</small>}
            </label>
            <label className="admin-campo admin-ancho">
              <span>Correo (será su usuario)</span>
              <input type="email" value={form.email} onChange={cambiar('email')} autoComplete="off" placeholder="nombre@siftc.edu.co" />
              {errores.email && <small className="admin-error">{errores.email}</small>}
            </label>
            <label className="admin-campo">
              <span>Rol</span>
              <select value={form.rol} onChange={cambiar('rol')}>
                <option value="">Elige un rol</option>
                {ROLES.map((r) => <option key={r.nombre} value={r.nombre}>{r.nombre}</option>)}
              </select>
              {errores.rol && <small className="admin-error">{errores.rol}</small>}
            </label>
            <label className="admin-campo">
              <span>Clave temporal</span>
              <div className="admin-clave">
                <input type={verClave ? 'text' : 'password'} value={form.password} onChange={cambiar('password')} autoComplete="new-password" />
                <button type="button" className="admin-btn" onClick={() => setVerClave(!verClave)}>{verClave ? 'Ocultar' : 'Ver'}</button>
              </div>
              {errores.password && <small className="admin-error">{errores.password}</small>}
            </label>
          </div>
          <div className="admin-botones">
            <button type="button" className="admin-btn" onClick={() => { setForm({ ...form, password: generarClave() }); setVerClave(true); setErrores({ ...errores, password: undefined }) }}>Generar clave segura</button>
            <button type="submit" className="admin-btn admin-btn-primario" disabled={enviando}>{enviando ? 'Creando…' : 'Crear cuenta'}</button>
          </div>
          {errorGeneral && <p role="alert" className="admin-error admin-error-general">{errorGeneral}</p>}
        </form>
      )}
    </div>
  )
}