import { useState, useEffect, useCallback } from 'react'
import { Check, X, RefreshCw, ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { puedeAprobarLotes } from '../constants/permisos'
import { getLotesPendientes, aprobarLote, rechazarLote } from '../services/api'
import { extraerMensajeError } from '../services/authService'
import '../styles/BandejaAprobaciones.css'

const MAX_COMENTARIO = 500

function formatearFechaHora(iso) {
  if (!iso) return '—'
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return String(iso)
  return fecha.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function BandejaAprobaciones() {
  const { usuario } = useAuth()
  const puedeDecidir = puedeAprobarLotes(usuario)

  const [pendientes, setPendientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [loteSeleccionado, setLoteSeleccionado] = useState(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [errorMotivo, setErrorMotivo] = useState('')
  const [procesandoId, setProcesandoId] = useState(null)

  const cargarBandeja = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const data = await getLotesPendientes()
      setPendientes(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err?.response?.status === 403) {
        setError('Tu perfil no tiene permisos para consultar la bandeja de aprobaciones.')
      } else {
        setError(extraerMensajeError(err, 'No se pudo cargar la bandeja de aprobaciones.'))
      }
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    let cancelado = false
    getLotesPendientes()
      .then((data) => {
        if (!cancelado) setPendientes(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (cancelado) return
        if (err?.response?.status === 403) {
          setError('Tu perfil no tiene permisos para consultar la bandeja de aprobaciones.')
        } else {
          setError(extraerMensajeError(err, 'No se pudo cargar la bandeja de aprobaciones.'))
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    if (!aviso) return undefined
    const timer = setTimeout(() => setAviso(null), 5000)
    return () => clearTimeout(timer)
  }, [aviso])

  useEffect(() => {
    if (!modalAbierto) return undefined
    const alPresionar = (e) => {
      if (e.key === 'Escape' && !procesandoId) {
        setModalAbierto(false)
        setLoteSeleccionado(null)
      }
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [modalAbierto, procesandoId])

  const manejarAprobar = async (lote) => {
    if (!puedeDecidir || !lote?.idLote) return
    try {
      setProcesandoId(lote.idLote)
      setAviso(null)
      await aprobarLote(lote.idLote)
      setPendientes((prev) => prev.filter((item) => item.idLote !== lote.idLote))
      setAviso({
        tipo: 'ok',
        texto: `Lote ${lote.nombreArchivo || String(lote.idLote).slice(0, 8)} aprobado y publicado en la capa analítica.`,
      })
    } catch (err) {
      setAviso({
        tipo: 'error',
        texto: extraerMensajeError(err, 'No se pudo aprobar el lote seleccionado.'),
      })
    } finally {
      setProcesandoId(null)
    }
  }

  const abrirModalRechazo = (lote) => {
    if (!puedeDecidir) return
    setLoteSeleccionado(lote)
    setMotivoRechazo('')
    setErrorMotivo('')
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    if (procesandoId) return
    setModalAbierto(false)
    setLoteSeleccionado(null)
    setMotivoRechazo('')
    setErrorMotivo('')
  }

  const confirmarRechazo = async (e) => {
    e.preventDefault()
    const limpio = motivoRechazo.trim()
    if (!limpio) {
      setErrorMotivo('El motivo del rechazo es obligatorio.')
      return
    }
    if (limpio.length > MAX_COMENTARIO) {
      setErrorMotivo(`El motivo no puede superar ${MAX_COMENTARIO} caracteres.`)
      return
    }
    if (!loteSeleccionado?.idLote) return

    try {
      setProcesandoId(loteSeleccionado.idLote)
      setErrorMotivo('')
      await rechazarLote(loteSeleccionado.idLote, limpio)
      const nombreLote = loteSeleccionado.nombreArchivo || String(loteSeleccionado.idLote).slice(0, 8)
      setPendientes((prev) => prev.filter((item) => item.idLote !== loteSeleccionado.idLote))
      setModalAbierto(false)
      setLoteSeleccionado(null)
      setMotivoRechazo('')
      setAviso({
        tipo: 'ok',
        texto: `Lote ${nombreLote} rechazado. Se notificó el motivo registrado.`,
      })
    } catch (err) {
      setErrorMotivo(extraerMensajeError(err, 'No se pudo registrar el rechazo del lote.'))
    } finally {
      setProcesandoId(null)
    }
  }

  return (
    <section className="bandeja-page" aria-labelledby="bandeja-titulo">
      <header className="bandeja-header">
        <div className="bandeja-header-left">
          <h1 id="bandeja-titulo">Bandeja de aprobaciones</h1>
          <span className="bandeja-contador mono-num">
            {pendientes.length} {pendientes.length === 1 ? 'lote pendiente' : 'lotes pendientes'}
          </span>
          {!puedeDecidir && (
            <span className="bandeja-modo-tag">Solo lectura</span>
          )}
        </div>
        <button
          type="button"
          className="bandeja-btn-refrescar"
          onClick={cargarBandeja}
          disabled={cargando || Boolean(procesandoId)}
        >
          <RefreshCw size={14} aria-hidden="true" />
          <span>Actualizar</span>
        </button>
      </header>

      {aviso && (
        <div
          className={`bandeja-alerta ${aviso.tipo === 'ok' ? 'bandeja-alerta-ok' : 'bandeja-alerta-error'}`}
          role="alert"
        >
          {aviso.texto}
        </div>
      )}

      {error ? (
        <div className="bandeja-card bandeja-estado-error" role="alert">
          <ShieldAlert size={18} aria-hidden="true" />
          <span>{error}</span>
          <button type="button" className="bandeja-btn-refrescar" onClick={cargarBandeja}>
            Reintentar
          </button>
        </div>
      ) : cargando ? (
        <div className="bandeja-card bandeja-vacia" role="status">
          Cargando lotes pendientes…
        </div>
      ) : pendientes.length === 0 ? (
        <div className="bandeja-card bandeja-vacia" role="status">
          No hay lotes pendientes de aprobación.
        </div>
      ) : (
        <div className="bandeja-card bandeja-tabla-wrap">
          <table className="bandeja-tabla">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Archivo</th>
                <th>Fecha de carga</th>
                <th className="num">Válidos / Total</th>
                <th className="num">Calidad</th>
                <th>Estado ETL</th>
                <th>Estado</th>
                <th className="acciones-col">Decisión</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.map((item) => {
                const idCorto = item.idLote ? `${String(item.idLote).slice(0, 8)}…` : '—'
                const totales = Number(item.registrosTotales ?? 0)
                const validos = Number(item.registrosValidos ?? 0)
                const pctCalidad = totales > 0 ? ((validos / totales) * 100).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0,0'
                const esExitoso = String(item.estadoCarga ?? '').toLowerCase() === 'exitoso'
                const esSuPropioLote = Boolean(
                  item.idUsuarioEjecutor &&
                    usuario?.id &&
                    String(item.idUsuarioEjecutor).toLowerCase() === String(usuario.id).toLowerCase(),
                )
                const enProceso = procesandoId === item.idLote

                return (
                  <tr key={item.idLote}>
                    <td className="mono-num bandeja-id-col" title={item.idLote}>
                      {idCorto}
                    </td>
                    <td className="bandeja-archivo-col">{item.nombreArchivo || '—'}</td>
                    <td className="mono-num">{formatearFechaHora(item.fechaCarga)}</td>
                    <td className="num mono-num">
                      <strong>{validos.toLocaleString('es-CO')}</strong> / {totales.toLocaleString('es-CO')}
                    </td>
                    <td className="num mono-num">{pctCalidad} %</td>
                    <td>
                      <span className={`bandeja-badge ${esExitoso ? 'bandeja-badge-exito' : 'bandeja-badge-fallo'}`}>
                        {item.estadoCarga || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="bandeja-badge bandeja-badge-pendiente">
                        {item.estado || 'pendiente'}
                      </span>
                    </td>
                    <td className="acciones-col">
                      {!puedeDecidir ? (
                        <span className="bandeja-sin-accion">Solo consulta</span>
                      ) : esSuPropioLote ? (
                        <span
                          className="bandeja-sin-accion"
                          title="Segregación de funciones: un analista no puede aprobar ni rechazar un lote que él mismo ejecutó"
                        >
                          Ejecutor del lote
                        </span>
                      ) : (
                        <div className="bandeja-acciones-grupo">
                          <button
                            type="button"
                            className="bandeja-btn bandeja-btn-aprobar"
                            disabled={enProceso || Boolean(procesandoId)}
                            onClick={() => manejarAprobar(item)}
                          >
                            <Check size={14} aria-hidden="true" />
                            <span>{enProceso ? 'Procesando…' : 'Aprobar'}</span>
                          </button>
                          <button
                            type="button"
                            className="bandeja-btn bandeja-btn-rechazar"
                            disabled={enProceso || Boolean(procesandoId)}
                            onClick={() => abrirModalRechazo(item)}
                          >
                            <X size={14} aria-hidden="true" />
                            <span>Rechazar</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && loteSeleccionado && (
        <div
          className="bandeja-modal-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && cerrarModal()}
          role="presentation"
        >
          <div
            className="bandeja-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bandeja-modal-titulo"
          >
            <div className="bandeja-modal-cabecera">
              <div>
                <span className="bandeja-modal-sub mono-num">
                  Lote {String(loteSeleccionado.idLote).slice(0, 8)} · {loteSeleccionado.nombreArchivo}
                </span>
                <h2 id="bandeja-modal-titulo">Rechazar publicación de lote</h2>
              </div>
              <button
                type="button"
                className="bandeja-modal-cerrar"
                onClick={cerrarModal}
                disabled={Boolean(procesandoId)}
                aria-label="Cerrar ventana"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={confirmarRechazo} noValidate>
              <div className="bandeja-modal-campo">
                <div className="bandeja-modal-label-row">
                  <label htmlFor="motivo-rechazo-input">Motivo del rechazo</label>
                  <span className="bandeja-char-count mono-num">
                    {motivoRechazo.length} / {MAX_COMENTARIO}
                  </span>
                </div>
                <textarea
                  id="motivo-rechazo-input"
                  rows={4}
                  maxLength={MAX_COMENTARIO}
                  value={motivoRechazo}
                  onChange={(e) => {
                    setMotivoRechazo(e.target.value)
                    if (errorMotivo) setErrorMotivo('')
                  }}
                  placeholder="Especifica la inconsistencia detectada en el lote…"
                  disabled={Boolean(procesandoId)}
                  autoFocus
                  required
                />
                {errorMotivo && (
                  <p className="bandeja-error-texto" role="alert">
                    {errorMotivo}
                  </p>
                )}
              </div>

              <div className="bandeja-modal-acciones">
                <button
                  type="button"
                  className="bandeja-btn bandeja-btn-secundario"
                  onClick={cerrarModal}
                  disabled={Boolean(procesandoId)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bandeja-btn bandeja-btn-rechazar-confirmar"
                  disabled={Boolean(procesandoId) || !motivoRechazo.trim()}
                >
                  {procesandoId ? 'Rechazando…' : 'Confirmar rechazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
