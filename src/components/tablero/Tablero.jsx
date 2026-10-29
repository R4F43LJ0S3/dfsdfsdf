import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getEntidades, getIndiceGeneral, getTop } from '../../services/api'
import IndiceGeneral from './IndiceGeneral'
import TopLista from './TopLista'
import Variacion from '../common/Variacion'
import './Tablero.css'

export default function Tablero() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    Promise.all([getIndiceGeneral(), getTop(), getEntidades()])
      .then(([indice, top, entidades]) => setDatos({ indice, top, entidades }))
      .catch(() => setError(true))
  }, [])

  if (error) return <p role="alert" className="estado">No se pudo cargar el tablero. Intenta de nuevo.</p>
  if (!datos) return <p className="estado" aria-live="polite">Cargando tablero…</p>

  const { indice, top, entidades } = datos
  const suben = entidades.filter((e) => e.variacion_porcentual > 0).length
  const bajan = entidades.filter((e) => e.variacion_porcentual < 0).length
  const mayorSubida = top.ganadores?.[0]
  const mayorBajada = top.perdedores?.[0]

  return (
    <div className="tablero">
      <header>
        <h1 className="titulo-pagina">Tablero de mercado</h1>
        <p className="texto-suave">Resumen del Índice de Competitividad de las entidades.</p>
      </header>

      <div className="fila-principal">
        <IndiceGeneral indice={indice} />

        <section className="tarjeta resumen">
          <p className="etiqueta">Resumen del día</p>
          <div className="resumen-conteo">
            <div className="resumen-caja resumen-caja-sube">
              <strong className="mono-num">{suben}</strong>
              <span>▲ suben</span>
            </div>
            <div className="resumen-caja resumen-caja-baja">
              <strong className="mono-num">{bajan}</strong>
              <span>▼ bajan</span>
            </div>
          </div>

          <div className="resumen-destacados">
            {mayorSubida && (
              <Link to={`/grafica?entidad=${mayorSubida.codigo_entidad}`} className="resumen-bloque">
                <span className="etiqueta">Mayor subida</span>
                <div className="resumen-fila">
                  <strong>{mayorSubida.nombre_entidad}</strong>
                  <Variacion valor={mayorSubida.variacion_porcentual} />
                </div>
              </Link>
            )}
            {mayorBajada && (
              <Link to={`/grafica?entidad=${mayorBajada.codigo_entidad}`} className="resumen-bloque">
                <span className="etiqueta">Mayor bajada</span>
                <div className="resumen-fila">
                  <strong>{mayorBajada.nombre_entidad}</strong>
                  <Variacion valor={mayorBajada.variacion_porcentual} />
                </div>
              </Link>
            )}
          </div>
        </section>
      </div>

      <div className="fila-listas">
        <TopLista titulo="Top 5 ganadores del día" entidades={top.ganadores ?? []} />
        <TopLista titulo="Top 5 perdedores del día" entidades={top.perdedores ?? []} />
      </div>

      <section className="cta">
        <div className="cta-texto">
          <h2>Compara, decide, avanza.</h2>
          <p>Consulta el ranking completo por sector, dimensión y periodo.</p>
        </div>
        <Link to="/ranking" className="cta-boton">Ver ranking →</Link>
      </section>
    </div>
  )
}
