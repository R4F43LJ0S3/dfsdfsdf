import { useCallback, useEffect, useMemo, useState } from 'react'
import { getEntidades } from '../../services/api'
import { useCotizacionesSignalR } from '../../hooks/useCotizacionesSignalR'
import { num, pct } from '../../utils/format'
import './Ticker.css'

export default function Ticker() {
  const [entidadesBase, setEntidadesBase] = useState([])
  const obtenerToken = useCallback(() => localStorage.getItem('token'), [])
  const { cotizaciones: cotizacionesEnVivo } = useCotizacionesSignalR(obtenerToken)

  useEffect(() => {
    let activo = true
    getEntidades()
      .then((lista) => {
        if (activo) setEntidadesBase(Array.isArray(lista) ? lista : [])
      })
      .catch(() => {
        if (activo) setEntidadesBase([])
      })
    return () => {
      activo = false
    }
  }, [])

  const entidades = useMemo(() => {
    if (!cotizacionesEnVivo || cotizacionesEnVivo.length === 0) return entidadesBase
    if (entidadesBase.length === 0) return cotizacionesEnVivo

    const actualizadas = [...entidadesBase]
    for (const nueva of cotizacionesEnVivo) {
      const codigoNuevo = nueva.codigo ?? nueva.codigo_entidad
      const idx = actualizadas.findIndex(
        (e) => (e.codigo ?? e.codigo_entidad) === codigoNuevo || (e.id && e.id === nueva.id),
      )
      if (idx >= 0) {
        actualizadas[idx] = { ...actualizadas[idx], ...nueva }
      } else {
        actualizadas.push(nueva)
      }
    }
    return actualizadas
  }, [entidadesBase, cotizacionesEnVivo])

  if (entidades.length === 0) return <div className="ticker" aria-hidden="true" />

  // La lista se repite para que el desplazamiento en bucle sea continuo.
  const items = [...entidades, ...entidades]

  return (
    <div className="ticker" role="marquee" aria-label="Cotizaciones de las entidades">
      <div className="ticker-pista">
        {items.map((e, i) => {
          const varPct = Number(e.variacionPct ?? e.variacion_porcentual ?? 0)
          const sube = varPct > 0
          const baja = varPct < 0
          const codigo = e.codigo ?? e.codigo_entidad
          const ic = e.ic ?? e.indice_competitividad
          return (
            <span className="ticker-item mono-num" key={`${codigo}-${i}`}>
              <span className="ticker-codigo">{codigo}</span>
              <strong>{num(ic, 1)}</strong>
              <span className={sube ? 'ticker-sube' : baja ? 'ticker-baja' : ''}>
                {sube ? '▲' : baja ? '▼' : '–'} {pct(varPct)}
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
