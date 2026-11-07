// Muestra el color Y el patrón de línea de una entidad (igual que en la gráfica),
// para que la identificación nunca dependa solo del color.
const PATRONES = {
  solida: undefined,
  discontinua: '6 4',
  punteada: '1 5',
  'rayas-largas': '12 5',
}

export default function MuestraLinea({ serie, ancho = 28 }) {
  if (!serie) return null
  return (
    <svg
      className="cmp-muestra"
      width={ancho}
      height="10"
      viewBox={`0 0 ${ancho} 10`}
      aria-hidden="true"
      focusable="false"
      style={{ '--cmp-claro': serie.claro, '--cmp-oscuro': serie.oscuro }}
    >
      <line
        x1="2"
        y1="5"
        x2={ancho - 2}
        y2="5"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray={PATRONES[serie.patron]}
        strokeLinecap={serie.patron === 'punteada' ? 'round' : 'butt'}
      />
    </svg>
  )
}
