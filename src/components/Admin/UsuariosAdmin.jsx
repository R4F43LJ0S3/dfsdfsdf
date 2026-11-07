import { useEffect, useMemo, useState } from 'react'
import { UserPlus, Pencil, UserX, UserCheck, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { extraerMensajeError } from '../../services/authService'
import {
  listarUsuarios,
  crearUsuario,
  editarUsuario,
  cambiarEstadoUsuario,
  ESTADOS_USUARIO,
  RUTAS_ESPERADAS,
} from '../../services/adminService'
import { ROLES_CATALOGO } from '../../constants/roles'
import { claveComparacion } from '../../utils/texto'
import UsuarioFormulario from './UsuarioFormulario'
import RutaPendiente from './RutaPendiente'

// HU-FE-07 CA 1: crear, editar y desactivar usuarios con sus roles

const ETIQUETA_ESTADO = {
  [ESTADOS_USUARIO.ACTIVO]: 'Activo',
  [ESTADOS_USUARIO.INACTIVO]: 'Inactivo',
  [ESTADOS_USUARIO.BLOQUEADO]: 'Bloqueado',
}

export default function UsuariosAdmin() {
  const { usuario: sesion } = useAuth()
  const [usuarios, setUsuarios] = useState(null)
  const [errorCarga, setErrorCarga] = useState('')
  const [listaPendiente, setListaPendiente] = useState(false) // el backend aun no publica GET /usuarios
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('')
  const [formulario, setFormulario] = useState(null) // null = cerrado, {} = nuevo, {usuario} = editar
  const [confirmar, setConfirmar] = useState(null)   // usuario que se va a desactivar
  const [procesando, setProcesando] = useState(false)
  const [aviso, setAviso] = useState(null)           // { tipo: 'ok' | 'error', texto }

  // Pide la lista al servicio y la pone en pantalla
  const cargar = () =>
    listarUsuarios()
      .then((lista) => {
        setErrorCarga('')
        setUsuarios(lista)
      })
      .catch((err) => {
        if (err?.pendiente) setListaPendiente(true)
        else setErrorCarga(extraerMensajeError(err, 'No se pudo cargar la lista de usuarios.'))
        setUsuarios([])
      })

  // Carga inicial al abrir la pestaña
  useEffect(() => {
    let vigente = true
    listarUsuarios()
      .then((lista) => vigente && setUsuarios(lista))
      .catch((err) => {
        if (!vigente) return
        if (err?.pendiente) setListaPendiente(true)
        else setErrorCarga(extraerMensajeError(err, 'No se pudo cargar la lista de usuarios.'))
        setUsuarios([])
      })
    return () => { vigente = false }
  }, [])

  // El mensaje verde o rojo se quita solo a los 5 segundos
  useEffect(() => {
    if (!aviso) return undefined
    const t = setTimeout(() => setAviso(null), 5000)
    return () => clearTimeout(t)
  }, [aviso])

  // Con Escape se cierra la ventana de confirmar
  useEffect(() => {
    if (!confirmar) return undefined
    const alPresionar = (e) => {
      if (e.key === 'Escape' && !procesando) setConfirmar(null)
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [confirmar, procesando])

  const visibles = useMemo(() => {
    if (!usuarios) return []
    const q = claveComparacion(busqueda)
    return usuarios
      .filter((u) => !filtroRol || u.idRol === filtroRol)
      .filter((u) => !q || claveComparacion(`${u.nombreCompleto} ${u.email}`).includes(q))
      .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es'))
  }, [usuarios, busqueda, filtroRol])

  // El administrador no se puede desactivar a sí mismo (se quedaría sin acceso)
  const esUnoMismo = (u) =>
    (sesion?.idUsuario && sesion.idUsuario === u.id) ||
    (sesion?.email && sesion.email.toLowerCase() === u.email.toLowerCase())

  const guardar = async (datos) => {
    try {
      if (formulario?.usuario) {
        await editarUsuario(formulario.usuario.id, datos)
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
      // El formulario muestra este mensaje sin cerrarse
      throw { mensaje: extraerMensajeError(err, 'No se pudo guardar el usuario.') }
    }
  }

  const cambiarEstado = async (u, estado) => {
    setProcesando(true)
    try {
      await cambiarEstadoUsuario(u.id, estado)
      setAviso({
        tipo: 'ok',
        texto: estado === ESTADOS_USUARIO.ACTIVO ? `${u.nombreCompleto} quedó activo.` : `${u.nombreCompleto} quedó desactivado y ya no podrá iniciar sesión.`,
      })
      setConfirmar(null)
      await cargar()
    } catch (err) {
      setAviso({ tipo: 'error', texto: extraerMensajeError(err, 'No se pudo cambiar el estado.') })
      setConfirmar(null)
    } finally {
      setProcesando(false)
    }
  }

  const activos = usuarios?.filter((u) => u.estado === ESTADOS_USUARIO.ACTIVO).length ?? 0

  return (
    <section aria-labelledby="adm-usuarios-titulo" className="adm-seccion">
      <div className="adm-seccion-cabecera">
        <div>
          <h2 id="adm-usuarios-titulo">Usuarios</h2>
          <p className="adm-texto-suave">
            {listaPendiente
              ? 'Puedes crear usuarios; la lista aparecerá cuando el backend publique la ruta correspondiente.'
              : usuarios ? `${usuarios.length} usuarios · ${activos} activos` : 'Cargando…'}
          </p>
        </div>
        <button
          type="button"
          className="adm-btn adm-btn-principal adm-btn-deshabilitado"
          disabled={true}
          title="Función temporalmente deshabilitada: pendiente de activación en el backend"
          aria-disabled="true"
        >
          <UserPlus size={18} aria-hidden="true" />
          <span>Nuevo usuario</span>
          <span className="adm-badge-pendiente">(Próximamente)</span>
        </button>
      </div>

      {aviso && (
        <p className={`adm-alerta ${aviso.tipo === 'ok' ? 'adm-alerta-ok' : 'adm-alerta-error'}`} role="status">
          {aviso.texto}
        </p>
      )}

      {!listaPendiente && (
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
            {ROLES_CATALOGO.map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        </div>
      )}

      <div className="adm-tarjeta adm-tabla-tarjeta">
        {errorCarga && <p className="adm-alerta adm-alerta-error adm-margen" role="alert">{errorCarga}</p>}
        {listaPendiente ? (
          <RutaPendiente
            texto="Para mostrar, editar y desactivar los usuarios de la base de datos, el backend debe publicar estas rutas:"
            rutas={[RUTAS_ESPERADAS.listarUsuarios, RUTAS_ESPERADAS.editarUsuario, RUTAS_ESPERADAS.cambiarEstadoUsuario]}
          />
        ) : !usuarios ? (
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
                            aria-label={`Editar a ${u.nombreCompleto}`}
                          >
                            <Pencil size={16} aria-hidden="true" /> Editar
                          </button>
                          {activo ? (
                            <button
                              type="button"
                              className="adm-btn-tabla adm-btn-peligro"
                              onClick={() => setConfirmar(u)}
                              disabled={yo || procesando}
                              title={yo ? 'No puedes desactivar tu propia cuenta' : undefined}
                              aria-label={`Desactivar a ${u.nombreCompleto}`}
                            >
                              <UserX size={16} aria-hidden="true" /> Desactivar
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="adm-btn-tabla adm-btn-exito"
                              onClick={() => cambiarEstado(u, ESTADOS_USUARIO.ACTIVO)}
                              disabled={procesando}
                              aria-label={`Activar a ${u.nombreCompleto}`}
                            >
                              <UserCheck size={16} aria-hidden="true" /> Activar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formulario && (
        <UsuarioFormulario
          usuario={formulario.usuario}
          onGuardar={guardar}
          onCerrar={() => setFormulario(null)}
        />
      )}

      {confirmar && (
        <div className="adm-fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && !procesando && setConfirmar(null)}>
          <div className="adm-modal adm-modal-chico" role="alertdialog" aria-modal="true" aria-labelledby="adm-conf-titulo" aria-describedby="adm-conf-texto">
            <h2 id="adm-conf-titulo">¿Desactivar a {confirmar.nombreCompleto}?</h2>
            <p id="adm-conf-texto" className="adm-texto-suave">
              No podrá iniciar sesión. Sus datos se conservan para la bitácora y lo puedes activar de nuevo cuando quieras.
            </p>
            <div className="adm-modal-acciones">
              <button type="button" className="adm-btn adm-btn-secundario" onClick={() => setConfirmar(null)} disabled={procesando} autoFocus>
                Cancelar
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-peligro-lleno"
                onClick={() => cambiarEstado(confirmar, ESTADOS_USUARIO.INACTIVO)}
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
