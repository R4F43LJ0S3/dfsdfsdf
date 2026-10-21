import { useEffect, useState } from 'react'
import { getEntidades } from '../../services/api'
import { num, pct } from '../../utils/format'
import './Ticker.css'

export default function Ticker() {
  const [entidades, setEntidades] = useState([])

  useEffect(() => {
    getEntidades().then(setEntidades).catch(() => setEntidades([]))
  }, [])

  if (entidades.length === 0) return <div className="ticker" aria-hidden="true" />

  // La lista se repite para que el desplazamiento sea continuo.
  const items = [...entidades, ...entidades]

  return (
    <div className="ticker" role="marquee" aria-label="Cotizaciones de las entidades">
      <div className="ticker-pista">
        {items.map((e, i) => {
          const sube = e.variacion_porcentual > 0
          const baja = e.variacion_porcentual < 0
          return (
            <span className="ticker-item mono-num" key={`${e.codigo_entidad}-${i}`}>
              <span className="ticker-codigo">{e.codigo_entidad}</span>
              <strong>{num(e.indice_competitividad, 1)}</strong>
              <span className={sube ? 'ticker-sube' : baja ? 'ticker-baja' : ''}>
                {sube ? '▲' : baja ? '▼' : '–'} {pct(e.variacion_porcentual)}
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}