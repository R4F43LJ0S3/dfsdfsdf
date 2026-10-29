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
          // Usamos los nombres reales de la API de Render: variacionPct y ic (o variacion)
          const variacion = e.variacionPct ?? e.variacion ?? 0
          const indice = e.ic ?? e.indice_competitividad ?? 0

          const sube = variacion > 0
          const baja = variacion < 0

          return (
            <span className="ticker-item mono-num" key={`${e.codigo || e.id}-${i}`}>
              <span className="ticker-coigo">{e.codigo || e.nombre}</span>
              <strong>{num(indice, 1)}</strong>
              <span className={sube ? 'ticker-sube' : baja ? 'ticker-baja' : ''}>
                {sube ? '▲' : baja ? '▼' : '▬'} {pct(variacion)}
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}