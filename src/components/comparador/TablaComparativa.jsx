import { useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { puedeVerPosicionRanking } from '../../constants/permisos'
import Variacion from '../common/Variacion'
import MuestraLinea from './MuestraLinea'
import { COLUMNAS_METRICAS } from '../../constants/comparador'
import { aNumeroONulo, mejoresDeColumna } from '../../utils/comparador'
import { num } from '../../utils/format'

// HU-FE-05 · CA 2: cada métrica es una columna y cada entidad una fila.
// HU-FE-07 Matriz de permisos: Posición es dato confidencial (SA para Gerente / Directivo)

function Valor({ columna, valor }) {
  const n = aNumeroONulo(valor)
  if (n === null) {
    return (
      <span className="cmp-sin-dato" title="Sin dato para este periodo">
        <span aria-hidden="true">—</span>
        <span className="cmp-sr">sin dato</span>
      </span>
    )
  }
  if (columna.tipo === 'variacion') return <Variacion valor={n} />
  if (columna.tipo === 'posicion') return <span className="mono-num">#{n}</span>
  return <span className="mono-num">{num(n, 1)}</span>
}

export default function TablaComparativa({ filas, periodo, cargando }) {
  const { usuario } = useAuth()
  const puedeVerPosicion = puedeVerPosicionRanking(usuario)

  const columnasVisibles = useMemo(() => {
    return COLUMNAS_METRICAS.filter((c) => {
      if (c.tipo === 'posicion') {
        return puedeVerPosicion && !filas.every((f) => f.valores?.posicion === null || f.valores?.posicion === undefined)
      }
      return true
    })
  }, [puedeVerPosicion, filas])

  const mejores = useMemo(
    () => Object.fromEntries(columnasVisibles.map((c) => [c.clave, mejoresDeColumna(filas, c.clave, c.mejor)])),
    [columnasVisibles, filas],
  )

  return (
    <div className={`cmp-tabla-contenedor${cargando ? ' actualizando' : ''}`} aria-busy={cargando}>
      <table className="cmp-tabla">
        <caption className="cmp-sr">
          Comparación de {filas.length} entidades en el periodo {periodo}. Cada columna es una métrica;
          la estrella marca el mejor valor de cada métrica.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="cmp-col-entidad">Entidad</th>
            {columnasVisibles.map((c) => (
              <th key={c.clave} scope="col" title={c.detalle}>{c.titulo}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.codigo}>
              <th scope="row" className="cmp-col-entidad">
                <span className="cmp-fila-entidad">
                  <MuestraLinea serie={f.serie} />
                  <span className="cmp-fila-texto">
                    <span className="cmp-fila-nombre" title={f.nombre}>{f.nombre}</span>
                    <small className="mono-num">{f.codigo} · {f.sector}</small>
                  </span>
                </span>
              </th>
              {columnasVisibles.map((c) => {
                const esMejor = mejores[c.clave]?.has(f.codigo)
                return (
                  <td key={c.clave} className={esMejor ? 'cmp-mejor' : undefined}>
                    <span className="cmp-celda">
                      {esMejor && <span className="cmp-estrella" aria-hidden="true">★</span>}
                      <Valor columna={c} valor={f.valores[c.clave]} />
                      {esMejor && <span className="cmp-sr"> (mejor valor)</span>}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
