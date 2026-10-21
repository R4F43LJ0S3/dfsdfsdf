import { num, fechaIso } from '../../utils/format'
import Variacion from '../common/Variacion'

function Sparkline({ serie }) {
  const ancho = 600
  const alto = 120
  const min = Math.min(...serie)
  const max = Math.max(...serie)
  const rango = max - min || 1
  const puntos = serie.map((v, i) => {
    const x = (i / (serie.length - 1)) * ancho
    const y = alto - ((v - min) / rango) * (alto - 16) - 8
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="spark" role="img" aria-label="Evolución del índice general en los últimos 30 días" preserveAspectRatio="none">
      <polygon points={`0,${alto} ${puntos.join(' ')} ${ancho},${alto}`} fill="var(--color-azul-acero-light)" />
      <polyline points={puntos.join(' ')} fill="none" stroke="var(--color-azul-acero)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export default function IndiceGeneral({ indice }) {
  const celdas = [
    ['Apertura', indice.apertura],
    ['Máximo', indice.maximo],
    ['Mínimo', indice.minimo],
    ['Cierre', indice.cierre],
  ]

  return (
    <section className="tarjeta">
      <p className="etiqueta">Índice general</p>
      <div className="indice-fila">
        <span className="indice-valor mono-num">{num(indice.valor, 1)}</span>
        <Variacion valor={indice.variacion} />
        <span className="texto-suave">{num(indice.puntos, 1)} puntos vs cierre anterior</span>
        <span className="texto-suave indice-periodo">Últimos 30 días</span>
      </div>
      <Sparkline serie={indice.serie} />
      <div className="celdas">
        {celdas.map(([nombre, valor]) => (
          <div className="celda" key={nombre}>
            <span className="etiqueta">{nombre}</span>
            <strong className="mono-num">{num(valor, 1)}</strong>
          </div>
        ))}
      </div>
      <p className="texto-suave nota">Cierre del {fechaIso(indice.fecha)} · Datos de ejemplo</p>
    </section>
  )
}