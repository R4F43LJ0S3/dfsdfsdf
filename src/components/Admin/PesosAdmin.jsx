import { useEffect, useMemo, useState } from 'react'
import { Save, RotateCcw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { puedeGestionarParametros } from '../../constants/permisos'
import { obtenerPesos, guardarPesos, RUTAS_ESPERADAS } from '../../services/adminService'
import RutaPendiente from './RutaPendiente'
import { extraerMensajeError } from '../../services/authService'
import { PESOS, validarPeso, validarPesos, sumarPesos } from '../../constants/validaciones'

// HU-FE-07 CA 3: el formulario de pesos valida estrictamente que sumen exactamente 100 %
// Decisión D3: Auditor tiene acceso de solo lectura (L) a parámetros; Administrador y Analista tienen (L + E)

const formatoPct = (n) => `${n.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`

// Para comparar si hubo cambios sin que "25" y "25.0" cuenten como distintos
const firma = (lista) => JSON.stringify(lista.map((p) => Number(String(p.peso).replace(',', '.'))))

export default function PesosAdmin() {
  const { usuario } = useAuth()
  const soloLectura = !puedeGestionarParametros(usuario)

  const [original, setOriginal] = useState(null)
  const [pesos, setPesos] = useState(null)
  const [motivo, setMotivo] = useState('Actualización de ponderaciones del IC')
  const [errorCarga, setErrorCarga] = useState('')
  const [pendiente, setPendiente] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    obtenerPesos()
      .then((datos) => {
        setOriginal(datos)
        setPesos(datos.map((p) => ({ ...p, peso: String(p.peso) })))
      })
      .catch((err) => {
        if (err?.pendiente) {
          setPendiente(true)
        } else if (err?.response?.status === 403) {
          setErrorCarga('Tu perfil actual no cuenta con autorización en el servidor para consultar esta configuración.')
        } else {
          setErrorCarga(extraerMensajeError(err, 'No se pudieron cargar los pesos del IC.'))
        }
      })
  }, [])

  useEffect(() => {
    if (!aviso) return undefined
    const t = setTimeout(() => setAviso(null), 5000)
    return () => clearTimeout(t)
  }, [aviso])

  const total = useMemo(() => (pesos ? sumarPesos(pesos) : 0), [pesos])
  const revision = useMemo(() => (pesos ? validarPesos(pesos) : { valido: false }), [pesos])
  const huboCambios = pesos && original && firma(pesos) !== firma(original)
  const puedeGuardar = !soloLectura && revision.valido && huboCambios && Boolean(motivo.trim()) && !guardando

  const diferencia = Math.round((PESOS.TOTAL - total) * 10) / 10
  const estadoSuma = diferencia === 0 ? 'ok' : diferencia > 0 ? 'falta' : 'sobra'

  const cambiar = (indice) => (e) => {
    if (soloLectura) return
    const valor = e.target.value.replace(/[^\d.,]/g, '').slice(0, 5)
    setPesos((lista) => lista.map((p, i) => (i === indice ? { ...p, peso: valor } : p)))
    if (aviso) setAviso(null)
  }

  const restaurar = () => {
    if (!original) return
    setPesos(original.map((p) => ({ ...p, peso: String(p.peso) })))
    setAviso(null)
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (soloLectura) return
    if (!revision.valido) {
      setAviso({ tipo: 'error', texto: revision.error })
      return
    }
    if (!huboCambios) return
    setGuardando(true)
    try {
      const guardados = await guardarPesos(pesos, motivo)
      const nuevos = Array.isArray(guardados) && guardados.length ? guardados : pesos
      setOriginal(nuevos.map((p) => ({ ...p, peso: Number(String(p.peso).replace(',', '.')) })))
      setPesos(nuevos.map((p) => ({ ...p, peso: String(p.peso) })))
      setAviso({ tipo: 'ok', texto: 'Nueva versión de pesos registrada. Aplica en el próximo cálculo del índice.' })
    } catch (err) {
      setAviso({ tipo: 'error', texto: extraerMensajeError(err, 'No se pudieron guardar los pesos.') })
    } finally {
      setGuardando(false)
    }
  }

  if (pendiente) {
    return (
      <section className="adm-seccion" aria-labelledby="adm-pesos-titulo">
        <h2 id="adm-pesos-titulo" className="adm-subtitulo">Pesos del índice de competitividad</h2>
        <div className="adm-tarjeta">
          <RutaPendiente
            texto="Los pesos se leen y se guardan en el servidor mediante las rutas:"
            rutas={[RUTAS_ESPERADAS.pesosDimensiones]}
          />
        </div>
      </section>
    )
  }
  if (errorCarga) return <p className="adm-alerta adm-alerta-error" role="alert">{errorCarga}</p>
  if (!pesos) return <p className="adm-estado">Cargando parámetros…</p>

  return (
    <section aria-labelledby="adm-pesos-titulo" className="adm-seccion">
      <div className="adm-seccion-cabecera">
        <h2 id="adm-pesos-titulo">Pesos del índice de competitividad</h2>
        {soloLectura && <span className="adm-rol">Modo lectura</span>}
      </div>

      <form className="adm-tarjeta adm-pesos" onSubmit={guardar} noValidate>
        <div className="adm-pesos-lista">
          {pesos.map((p, i) => {
            const val = validarPeso(p.peso)
            const numero = val.valido ? Number(String(p.peso).replace(',', '.')) : 0
            const id = `adm-peso-${i}`
            return (
              <div className="adm-peso" key={p.dimension}>
                <label htmlFor={id} className="adm-peso-nombre">{p.dimension}</label>
                <div className="adm-peso-barra" aria-hidden="true">
                  <span style={{ width: `${Math.min(numero, 100)}%` }} />
                </div>
                <div className={`adm-peso-input ${val.valido ? '' : 'adm-input-error'}`}>
                  <input
                    id={id}
                    inputMode="decimal"
                    value={p.peso}
                    onChange={cambiar(i)}
                    aria-invalid={!val.valido}
                    aria-describedby={val.valido ? undefined : `${id}-error`}
                    disabled={guardando || soloLectura}
                  />
                  <span aria-hidden="true">%</span>
                </div>
                {!val.valido && <p id={`${id}-error`} className="adm-error-campo adm-peso-error">{val.error}</p>}
              </div>
            )
          })}
        </div>

        <div className={`adm-suma adm-suma-${estadoSuma}`} role="status" aria-live="polite">
          <div className="adm-suma-texto">
            <span>Total</span>
            <strong className="mono-num">{formatoPct(total)}</strong>
          </div>
          <div className="adm-suma-barra" aria-hidden="true">
            <span style={{ width: `${Math.min(total, 100)}%` }} />
          </div>
          <p>
            {estadoSuma === 'ok' && 'Suma exacta (100,0 %).'}
            {estadoSuma === 'falta' && `Faltan ${formatoPct(diferencia)} para completar 100,0 %.`}
            {estadoSuma === 'sobra' && `Exceso de ${formatoPct(-diferencia)} sobre 100,0 %.`}
          </p>
        </div>

        {!soloLectura && huboCambios && (
          <div className="adm-campo" style={{ marginBottom: 0 }}>
            <label htmlFor="adm-pesos-motivo">Motivo de la versión</label>
            <input
              id="adm-pesos-motivo"
              type="text"
              maxLength={500}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={guardando}
              required
            />
          </div>
        )}

        {aviso && (
          <p className={`adm-alerta ${aviso.tipo === 'ok' ? 'adm-alerta-ok' : 'adm-alerta-error'}`} role="alert">
            {aviso.texto}
          </p>
        )}

        {!soloLectura && (
          <div className="adm-pesos-acciones">
            <button type="button" className="adm-btn adm-btn-secundario" onClick={restaurar} disabled={!huboCambios || guardando}>
              <RotateCcw size={16} aria-hidden="true" /> Restaurar
            </button>
            <button
              type="submit"
              className="adm-btn adm-btn-principal"
              disabled={!puedeGuardar}
              aria-disabled={!puedeGuardar}
              title={!revision.valido ? 'Los pesos deben sumar exactamente 100 % para guardar' : undefined}
            >
              <Save size={16} aria-hidden="true" /> {guardando ? 'Guardando…' : 'Guardar versión'}
            </button>
          </div>
        )}
      </form>
    </section>
  )
}
