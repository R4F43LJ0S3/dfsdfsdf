import { Link } from 'react-router-dom'
import { num } from '../../utils/format'
import Variacion from '../common/Variacion'

export default function TopLista({ titulo, entidades }) {
  return (
    <section className="tarjeta">
      <h2 className="titulo-lista">{titulo}</h2>
      <ol className="lista-top">
        {entidades.map((e, i) => {
          const codigo = e.codigo ?? e.codigo_entidad
          const nombre = e.nombre ?? e.nombre_entidad
          const ic = e.ic ?? e.indice_competitividad
          const varPct = e.variacionPct ?? e.variacion_porcentual
          return (
            <li key={codigo}>
              <Link to={`/grafica?entidad=${codigo}`} className="fila-top">
                <span className="pos">{i + 1}</span>
                <span className="fila-nombre">
                  <strong>{nombre}</strong>
                  <small>{codigo} · {e.sector}</small>
                </span>
                <span className="mono-num">{num(ic, 1)}</span>
                <Variacion valor={varPct} />
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
