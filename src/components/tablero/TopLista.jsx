import { Link } from 'react-router-dom'
import { num } from '../../utils/format'
import Variacion from '../common/Variacion'

export default function TopLista({ titulo, entidades }) {
  return (
    <section className="tarjeta">
      <h2 className="titulo-lista">{titulo}</h2>
      <ol className="lista-top">
        {entidades.map((e, i) => (
          <li key={e.codigo_entidad}>
            <Link to={`/grafica?entidad=${e.codigo_entidad}`} className="fila-top">
              <span className="pos">{i + 1}</span>
              <span className="fila-nombre">
                <strong>{e.nombre_entidad}</strong>
                <small>{e.codigo_entidad} · {e.sector}</small>
              </span>
              <span className="mono-num">{num(e.indice_competitividad, 1)}</span>
              <Variacion valor={e.variacion_porcentual} />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
