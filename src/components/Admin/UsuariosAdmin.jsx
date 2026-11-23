import { useEffect, useMemo, useState } from 'react'
import { UserPlus, Pencil, UserX, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { extraerMensajeError } from '../../services/authService'
import {
  listarUsuarios,
  crearUsuario,
  editarUsuario,
  cambiarEstadoUsuario,
  catalogoRolesDesde,
  ESTADOS_USUARIO,
} from '../../services/adminService'
import { claveComparacion } from '../../utils/texto'
import UsuarioFormulario from './UsuarioFormulario'

// HU-FE-07 CA 1: crear, editar y desactivar usuarios con sus roles
// Rutas reales del servidor (todas exigen rol Administrador):
//   GET    /api/v1/usuarios              lista (usuarios activos)
//   POST   /api/v1/usuarios/registrar    crear
//   PUT    /api/v1/usuarios/{id}         editar
//   DELETE /api/v1/usuarios/{id}         baja lógica -> estado 'inactivo'

const ETIQUETA_ESTADO = {
  [ESTADOS_USUARIO.ACTIVO]: 'Activo',
  [ESTADOS_USUARIO.INACTIVO]: 'Inactivo',
  [ESTADOS_USUARIO.BLOQUEADO]: 'Bloqueado',
}

function mensajeDeBaja(err, respaldo) {
  const codigo = String(err?.response?.data?.code ?? err?.response?.data?.detail ?? '')
  if (err?.response?.status === 409 || codigo.includes('ultimo.administrador')) {
    return 'No se puede desactivar: el sistema quedaría sin ningún administrador activo.'
  }
  if (err?.response?.status === 422 || codigo.includes('autoeliminar')) {
    return 'Un administrador no puede desactivar su propia cuenta.'
  }
  return extraerMensajeError(err, respaldo)
}

export default function UsuariosAdmin() {
  const { usuario: sesion, actualizarSesionUsuario, logout } = useAuth()
  const [usuarios, setUsuarios] = useState(null)
  const [errorCarga, setErrorCarga] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('')
  const [formulario, setFormulario] = useState(null)
  const [confirmar, setConfirmar] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [aviso, setAviso] = useState(null)

  const esUnoMismo = (u) =>
    ((sesion?.idUsuario ?? sesion?.id) && (sesion.idUsuario ?? sesion.id) === u.id) ||
    (sesion?.email && u.email && sesion.email.toLowerCase() === u.email.toLowerCase())

  const sincronizarSesionPropia = (lista) => {
    if (!Array.isArray(lista) || !sesion) return
    const propio = lista.find((u) =>
      ((sesion?.idUsuario ?? sesion?.id) && (sesion.idUsuario ?? sesion.id) === u.id) ||
      (sesion?.email && u.email && sesion.email.toLowerCase() === u.email.toLowerCase()),
    )
    if (!propio) return
    if (propio.estado && propio.estado !== ESTADOS_USUARIO.ACTIVO) {
      logout()
      return
    }
    const nuevoRol = propio.rol || sesion.rol
    const nuevoNombre = propio.nombreCompleto || sesion.nombre
    if (
      nuevoRol !== sesion.rol ||
      nuevoNombre !== sesion.nombre ||
      propio.email !== sesion.email
    ) {
      actualizarSesionUsuario({
        rol: nuevoRol,
        nombre: nuevoNombre,
        nombreCompleto: nuevoNombre,
        email: propio.email || sesion.email,
      })
    }
  }

  const cargar = () => {
    setErrorCarga('')
    return listarUsuarios()
      .then((lista) => {
        setErrorCarga('')
        setUsuarios(lista)
        sincronizarSesionPropia(lista)
      })
      .catch((err) => {
        setErrorCarga(extraerMensajeError(err, 'No se pudo cargar la lista de usuarios.'))
        setUsuarios([])
      })
  }

  useEffect(() => {
    let vigente = true
    listarUsuarios()
      .then((lista) => {
        if (!vigente) return
        setUsuarios(lista)
        sincronizarSesionPropia(lista)
      })
      .catch((err) => {
        if (!vigente) return
        setErrorCarga(extraerMensajeError(err, 'No se pudo cargar la lista de usuarios.'))
        setUsuarios([])
      })
    return () => { vigente = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!aviso) return undefined
    const t = setTimeout(() => setAviso(null), 5000)
    return () => clearTimeout(t)
  }, [aviso])

  useEffect(() => {
    if (!confirmar) return undefined
    const alPresionar = (e) => {
      if (e.key === 'Escape' && !procesando) setConfirmar(null)
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [confirmar, procesando])

  const roles = useMemo(() => catalogoRolesDesde(usuarios ?? []), [usuarios])

  const visibles = useMemo(() => {
    if (!usuarios) return []
    const q = claveComparacion(busqueda)
    return usuarios
      .filter((u) => !filtroRol || u.idRol === filtroRol)
      .filter((u) => !q || claveComparacion(`${u.nombreCompleto} ${u.email}`).includes(q))
      .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es'))
  }, [usuarios, busqueda, filtroRol])

  const guardar = async (datos) => {
    try {
      if (formulario?.usuario) {
        const editandoPropio = esUnoMismo(formulario.usuario)
        if (editandoPropio && formulario.usuario.idRol && datos.idRol !== formulario.usuario.idRol) {
          throw { response: { status: 422, data: { detail: 'No puedes quitarte tu propio rol de Administrador.' } } }
        }
        await editarUsuario(formulario.usuario.id, datos)
        if (editandoPropio) {
          const nombreNuevo = `${datos.primerNombre ?? ''} ${datos.primerApellido ?? ''}`.trim()
          const rolElegido = roles.find((r) => r.id === datos.idRol)?.nombre ?? formulario.usuario.rol
          actualizarSesionUsuario({
            nombre: nombreNuevo || sesion?.nombre,
            nombreCompleto: nombreNuevo || sesion?.nombreCompleto,
            email: String(datos.email ?? sesion?.email ?? '').trim().toLowerCase(),
            rol: rolElegido,
          })
        }
        setAviso({ tipo: 'ok', texto: `Se actualizó a ${datos.primerNombre} ${datos.primerApellido}.` })
      } else {
        const id = await crearUsuario(datos)
        setAviso({
          tipo: 'ok',
          texto: `Usuario ${datos.email.trim().toLowerCase()} creado en la base de datos${id ? ` (id ${id})` : ''}.`,
        })
      }
      setFormulario(null)
      await cargar()
    } catch (err) {
      const estado = err?.response?.status
      const codigo = String(err?.response?.data?.code ?? err?.response?.data?.detail ?? '')
      let mensaje
      if (estado === 409) mensaje = 'Ya existe otro usuario con ese correo.'
      else if (codigo.includes('rol.invalido')) mensaje = 'El rol elegido no tiene un UUID registrado en seguridad.roles.'
      else mensaje = extraerMensajeError(err, 'No se pudo guardar el usuario.')
      throw { mensaje }
    }
  }

  const desactivar = async (u) => {
    setProcesando(true)
    try {
      await cambiarEstadoUsuario(u.id, ESTADOS_USUARIO.INACTIVO)
      setAviso({ tipo: 'ok', texto: `${u.nombreCompleto} quedó desactivado y ya no podrá iniciar sesión.` })
      setConfirmar(null)
      await cargar()
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeDeBaja(err, 'No se pudo desactivar el usuario.') })
      setConfirmar(null)
    } finally {
      setProcesando(false)
    }
  }

  const activos = usuarios?.filter((u) => u.estado === ESTADOS_USUARIO.ACTIVO).length ?? 0

  return (
    <section aria-labelledby="adm-usuarios-titulo" className="adm-seccion">
      <div className="adm-seccion-cabecera">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 id="adm-usuarios-titulo">Usuarios</h2>
          <span className="adm-rol mono-num">
            {usuarios ? `${usuarios.length} registrados · ${activos} activos` : 'Cargando…'}
          </span>
        </div>
        <button
          type="button"
          className="adm-btn adm-btn-principal"
          onClick={() => setFormulario({})}
          disabled={procesando}
        >
          <UserPlus size={18} aria-hidden="true" />
          <span>Nuevo usuario</span>
        </button>
      </div>

      {aviso && (
        <p className={`adm-alerta ${aviso.tipo === 'ok' ? 'adm-alerta-ok' : 'adm-alerta-error'}`} role="status">
          {aviso.texto}
        </p>
      )}

      <div className="adm-filtros">
        <div className="adm-buscador">
          <Search size={17} aria-hidden="true" />
          <label htmlFor="adm-buscar" className="solo-lector">Buscar usuario</label>
          <input
            id="adm-buscar"
            type="search"
            placeholder="Buscar por nombre o correo"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            maxLength={80}
          />
        </div>
        <label htmlFor="adm-filtro-rol" className="solo-lector">Filtrar por rol</label>
        <select id="adm-filtro-rol" value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
          <option value="">Todos los roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>{r.nombre}</option>
          ))}
        </select>
      </div>

      <div className="adm-tarjeta adm-tabla-tarjeta">
        {errorCarga && (
          <div className="adm-alerta adm-alerta-error adm-margen adm-error-barra" role="alert">
            <span>{errorCarga}</span>
            <button type="button" className="adm-btn-tabla" onClick={cargar}>
              Reintentar
            </button>
          </div>
        )}
        {!usuarios ? (
          <p className="adm-estado">Cargando usuarios…</p>
        ) : visibles.length === 0 ? (
          <p className="adm-estado">No hay usuarios que coincidan con la búsqueda.</p>
        ) : (
          <div className="adm-tabla-contenedor">
            <table className="adm-tabla">
              <caption className="solo-lector">Usuarios del sistema con su rol y estado</caption>
              <thead>
                <tr>
                  <th scope="col">Usuario</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Estado</th>
                  <th scope="col" className="adm-col-acciones">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((u) => {
                  const activo = u.estado === ESTADOS_USUARIO.ACTIVO
                  const yo = esUnoMismo(u)
                  return (
                    <tr key={u.id} className={activo ? '' : 'adm-fila-inactiva'}>
                      <td>
                        <div className="adm-usuario">
                          <span className="adm-avatar" aria-hidden="true">{u.primerNombre?.[0]?.toUpperCase()}</span>
                          <span>
                            <strong>{u.nombreCompleto}{yo && <span className="adm-tu"> (tú)</span>}</strong>
                            <small>{u.email}</small>
                          </span>
                        </div>
                      </td>
                      <td><span className="adm-rol">{u.rol}</span></td>
                      <td>
                        <span className={`adm-estado-chip adm-estado-${u.estado}`}>
                          {ETIQUETA_ESTADO[u.estado] ?? u.estado}
                        </span>
                      </td>
                      <td className="adm-col-acciones">
                        <div className="adm-acciones">
                          <button
                            type="button"
                            className="adm-btn-tabla"
                            onClick={() => setFormulario({ usuario: u })}
                            disabled={procesando}
                            aria-label={`Editar a ${u.nombreCompleto}`}
                          >
                            <Pencil size={16} aria-hidden="true" /> Editar
                          </button>
                          <button
                            type="button"
                            className="adm-btn-tabla adm-btn-peligro"
                            onClick={() => setConfirmar(u)}
                            disabled={yo || procesando || !activo}
                            title={yo ? 'No puedes desactivar tu propia cuenta' : undefined}
                            aria-label={`Desactivar a ${u.nombreCompleto}`}
                          >
                            <UserX size={16} aria-hidden="true" /> Desactivar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {usuarios && usuarios.length > 0 && (
          <p className="adm-resumen mono-num">
            Mostrando {visibles.length} de {usuarios.length} usuarios
          </p>
        )}
      </div>

      {formulario && (
        <UsuarioFormulario
          usuario={formulario.usuario}
          roles={roles}
          esPropioUsuario={Boolean(formulario.usuario && esUnoMismo(formulario.usuario))}
          onGuardar={guardar}
          onCerrar={() => setFormulario(null)}
        />
      )}

      {confirmar && (
        <div className="adm-fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && !procesando && setConfirmar(null)}>
          <div className="adm-modal adm-modal-chico" role="alertdialog" aria-modal="true" aria-labelledby="adm-conf-titulo" aria-describedby="adm-conf-texto">
            <h2 id="adm-conf-titulo">¿Desactivar a {confirmar.nombreCompleto}?</h2>
            <p id="adm-conf-texto" className="adm-texto-suave">
              El usuario pasará a estado inactivo y no podrá iniciar sesión. Su historial y bitácora se conservan.
            </p>
            <div className="adm-modal-acciones">
              <button type="button" className="adm-btn adm-btn-secundario" onClick={() => setConfirmar(null)} disabled={procesando} autoFocus>
                Cancelar
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-peligro-lleno"
                onClick={() => desactivar(confirmar)}
                disabled={procesando}
              >
                {procesando ? 'Desactivando…' : 'Sí, desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
