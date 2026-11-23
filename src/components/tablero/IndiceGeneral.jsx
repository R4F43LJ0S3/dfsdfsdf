import { num, fechaIso } from '../../utils/format'
import Variacion from '../common/Variacion'

export default function IndiceGeneral({ indice }) {
  const puntos = indice?.puntos
  const signoPuntos = puntos > 0 ? '+' : ''

  return (
    <section className="tarjeta">
      <div className="indice-cabecera">
        <span className="etiqueta">Índice general</span>
        <span className="texto-suave mono-num">{fechaIso(indice.fecha)}</span>
      </div>
      <div className="indice-fila">
        <span className="indice-valor mono-num">{num(indice.valor, 1)}</span>
        <Variacion valor={indice.variacion} />
      </div>
      <div className="indice-meta">
        <div className="indice-meta-item">
          <span className="etiqueta">Variación media</span>
          <strong className="mono-num">
            {Number.isFinite(puntos) ? `${signoPuntos}${num(puntos, 2)} pts` : '—'}
          </strong>
        </div>
        {Number.isFinite(indice.totalEntidades) && (
          <div className="indice-meta-item">
            <span className="etiqueta">Entidades cotizando</span>
            <strong className="mono-num">{indice.totalEntidades}</strong>
          </div>
        )}
      </div>
    </section>
  )
}
