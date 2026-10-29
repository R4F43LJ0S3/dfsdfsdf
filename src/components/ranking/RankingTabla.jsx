import { Link } from 'react-router-dom'
import { num } from '../../utils/format'
import Variacion from '../common/Variacion'

const COLUMNAS = [
  { campo: 'posicion', titulo: 'Pos.' },
  { campo: null, titulo: 'Cambio' },
  { campo: 'entidad', titulo: 'Entidad' },
  { campo: 'sector', titulo: 'Sector' },
  { campo: 'ic', titulo: 'IC' },
  { campo: 'variacionPct', titulo: 'Variación' },
]

// cuantos puestos subio o bajo
function CambioPosicion({ valor }) {
  if (!valor) return <span className="cambio cambio-igual" title="Sin cambio de posición">=</span>
  const sube = valor > 0
  const texto = `${sube ? 'Subió' : 'Bajó'} ${Math.abs(valor)} ${Math.abs(valor) === 1 ? 'puesto' : 'puestos'}`
  return (
    <span className={`cambio ${sube ? 'cambio-sube' : 'cambio-baja'}`} title={texto}>
      <span aria-hidden="true">{sube ? '▲' : '▼'} {Math.abs(valor)}</span>
      <span className="solo-lector">{texto}</span>
    </span>
  )
}

export default function RankingTabla({ filas, total, orden, dir, dimension, periodo, cargando, onOrdenar }) {
  if (filas.length === 0) {
    return <p className="estado tarjeta">No hay entidades con esos filtros.</p>
  }

  const tituloIc = dimension ? `IC · ${dimension}` : 'IC'

  return (
    <section className={`tarjeta tabla-tarjeta ${cargando ? 'actualizando' : ''}`} aria-busy={cargando}>
      {/* La tabla se desplaza dentro de su contenedor, sin desbordar la página. */}
      <div className="tabla-contenedor">
        <table className="tabla">
          <caption className="solo-lector">
            Ranking de competitividad, periodo {periodo}, ordenado por {orden} {dir === 'asc' ? 'ascendente' : 'descendente'}
          </caption>
          <thead>
            <tr>
              {COLUMNAS.map((c) => {
                if (!c.campo) {
                  return <th key={c.titulo} scope="col"><span className="th-texto">{c.titulo}</span></th>
                }
                const activa = orden === c.campo
                const titulo = c.campo === 'ic' ? tituloIc : c.titulo
                return (
                  <th
                    key={c.campo}
                    scope="col"
                    aria-sort={activa ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={activa ? 'col-activa' : ''}
                  >
                    <button type="button" className="th-boton" onClick={() => onOrdenar(c.campo)}>
                      {titulo}
                      <span aria-hidden="true" className={`flecha ${activa ? '' : 'flecha-inactiva'}`}>
                        {activa ? (dir === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.entidadId}>
                <td className="mono-num posicion">{f.posicion}</td>
                <td><CambioPosicion valor={f.cambioPosicion} /></td>
                <td>
                  <Link to={`/grafica?entidad=${f.entidadId}`} className="entidad">
                    <strong>{f.entidad}</strong>
                  </Link>
                </td>
                <td><span className="sector">{f.sector}</span></td>
                <td>
                  <div className="ic">
                    <span className="mono-num">{num(f.ic, 1)}</span>
                    <span className="barra" aria-hidden="true">
                      <span style={{ width: `${Math.min(100, Math.max(0, f.ic))}%` }} />
                    </span>
                  </div>
                </td>
                <td><Variacion valor={f.variacionPct} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="texto-suave pie">
        Mostrando {filas.length} de {total} entidades · Periodo {periodo.toLowerCase()} · Clic en una entidad para ver su gráfica
      </p>
    </section>
  )
}
