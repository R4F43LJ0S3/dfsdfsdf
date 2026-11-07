import { useEffect, useMemo, useState } from 'react'
import { Save, RotateCcw } from 'lucide-react'
import { obtenerPesos, guardarPesos, RUTAS_ESPERADAS } from '../../services/adminService'
import RutaPendiente from './RutaPendiente'
import { extraerMensajeError } from '../../services/authService'
import { PESOS, validarPeso, validarPesos, sumarPesos } from '../../constants/validaciones'

// HU-FE-07 CA 3: el formulario de pesos valida estrictamente que sumen exactamente 100 %

const formatoPct = (n) => `${n.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`

// Para comparar si hubo cambios sin que "25" y "25.0" cuenten como distintos
const firma = (lista) => JSON.stringify(lista.map((p) => Number(String(p.peso).replace(',', '.'))))

export default function PesosAdmin() {
  const [original, setOriginal] = useState(null)
  const [pesos, setPesos] = useState(null)
  const [errorCarga, setErrorCarga] = useState('')
  const [pendiente, setPendiente] = useState(false) // el backend aun no publica la ruta de pesos
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    obtenerPesos()
      .then((datos) => {
        setOriginal(datos)
        setPesos(datos.map((p) => ({ ...p, peso: String(p.peso) })))
      })
      .catch((err) => {
        if (err?.pendiente) setPendiente(true)
        else setErrorCarga(extraerMensajeError(err, 'No se pudieron cargar los pesos.'))
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
  const puedeGuardar = revision.valido && huboCambios && !guardando

  const diferencia = Math.round((PESOS.TOTAL - total) * 10) / 10
  const estadoSuma = diferencia === 0 ? 'ok' : diferencia > 0 ? 'falta' : 'sobra'

  const cambiar = (indice) => (e) => {
    // Solo se dejan escribir números, punto o coma (máximo 5 caracteres: 100.0)
    const valor = e.target.value.replace(/[^\d.,]/g, '').slice(0, 5)
    setPesos((lista) => lista.map((p, i) => (i === indice ? { ...p, peso: valor } : p)))
    if (aviso) setAviso(null)
  }

  const restaurar = () => {
    setPesos(original.map((p) => ({ ...p, peso: String(p.peso) })))
    setAviso(null)
  }

  const guardar = async (e) => {
    e.preventDefault()
    // Doble revisión: aunque el botón esté bloqueado, no se envía nada si no suman exactamente 100 %
    if (!revision.valido) {
      setAviso({ tipo: 'error', texto: revision.error })
      return
    }
    if (!huboCambios) return
    setGuardando(true)
    try {
      const guardados = await guardarPesos(pesos)
      const nuevos = Array.isArray(guardados) && guardados.length ? guardados : pesos
      setOriginal(nuevos.map((p) => ({ ...p, peso: Number(String(p.peso).replace(',', '.')) })))
      setPesos(nuevos.map((p) => ({ ...p, peso: String(p.peso) })))
      setAviso({ tipo: 'ok', texto: 'Pesos guardados. Se aplican en el próximo cálculo del índice.' })
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
            texto="Los pesos se leen y se guardan en la base de datos (analitica.dim_dimension.peso_ic). Para eso el backend debe publicar:"
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
        <div>
          <h2 id="adm-pesos-titulo">Pesos del índice de competitividad</h2>
          <p className="adm-texto-suave">
            Define cuánto aporta cada dimensión al índice (0 a 100). Los pesos deben sumar exactamente 100 %.
          </p>
        </div>
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
                    disabled={guardando}
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
            <strong>{formatoPct(total)}</strong>
          </div>
          <div className="adm-suma-barra" aria-hidden="true">
            <span style={{ width: `${Math.min(total, 100)}%` }} />
          </div>
          <p>
            {estadoSuma === 'ok' && 'La suma es correcta (exactamente 100 %).'}
            {estadoSuma === 'falta' && `Faltan ${formatoPct(diferencia)} para llegar a 100 %.`}
            {estadoSuma === 'sobra' && `Sobran ${formatoPct(-diferencia)}: baja algún peso.`}
          </p>
        </div>

        {aviso && (
          <p className={`adm-alerta ${aviso.tipo === 'ok' ? 'adm-alerta-ok' : 'adm-alerta-error'}`} role="alert">
            {aviso.texto}
          </p>
        )}

        <div className="adm-pesos-acciones">
          <button type="button" className="adm-btn adm-btn-secundario" onClick={restaurar} disabled={!huboCambios || guardando}>
            <RotateCcw size={17} aria-hidden="true" /> Deshacer cambios
          </button>
          <button
            type="submit"
            className="adm-btn adm-btn-principal"
            disabled={!puedeGuardar}
            aria-disabled={!puedeGuardar}
            title={!revision.valido ? 'Los pesos deben sumar exactamente 100 % para guardar' : undefined}
          >
            <Save size={17} aria-hidden="true" /> {guardando ? 'Guardando…' : 'Guardar pesos'}
          </button>
        </div>
      </form>
    </section>
  )
}
