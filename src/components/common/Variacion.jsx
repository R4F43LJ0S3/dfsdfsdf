import { pct } from '../../utils/format'

// Variación con color Y símbolo (▲ / ▼), nunca solo color.
export default function Variacion({ valor }) {
  const sube = valor > 0
  const baja = valor < 0
  const clase = sube ? 'badge-up' : baja ? 'badge-down' : 'badge-eq'
  const simbolo = sube ? '▲' : baja ? '▼' : '–'

  return (
    <span className={`${clase} mono-num`}>
      {simbolo} {pct(valor)}
    </span>
  )
}