import { useMemo } from 'react'
import { Layers, ChevronRight, AlertCircle, Info } from 'lucide-react'
import { num } from '../../utils/format'

const ORDEN_DIMENSIONES_PREFERIDO = [
  'Rentabilidad',
  'Liquidez',
  'Solvencia',
  'Crecimiento',
  'Mercado',
  'Trazabilidad',
]

// HU-FE-03 CA 1 y CA 2: Métricas por Dimensión de la entidad seleccionada
export default function MetricasPorDimension({
  metricas = [],
  cargando = false,
  error = '',
  periodo = '',
  onSeleccionarMetrica,
}) {
  const agrupadas = useMemo(() => {
    if (!Array.isArray(metricas) || metricas.length === 0) return []

    const mapa = new Map()
    for (const m of metricas) {
      const dim = m.dimension || 'General'
      if (!mapa.has(dim)) {
        mapa.set(dim, [])
      }
      mapa.get(dim).push(m)
    }

    // Ordenar dimensiones según el orden oficial y luego alfabético
    const dimensiones = Array.from(mapa.keys()).sort((a, b) => {
      const idxA = ORDEN_DIMENSIONES_PREFERIDO.indexOf(a)
      const idxB = ORDEN_DIMENSIONES_PREFERIDO.indexOf(b)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return a.localeCompare(b, 'es')
    })

    return dimensiones.map((dimension) => ({
      dimension,
      items: mapa.get(dimension).sort((x, y) =>
        String(x.nombreMetrica || x.codigoMetrica).localeCompare(
          String(y.nombreMetrica || y.codigoMetrica),
          'es',
        ),
      ),
    }))
  }, [metricas])

  if (cargando) {
    return (
      <section className="ficha-metricas-seccion" aria-label="Métricas por dimensión">
        <div className="ficha-metricas-cabecera">
          <div>
            <h2 className="ficha-metricas-titulo">Métricas por Dimensión</h2>
            <p className="ficha-metricas-subtitulo">Consultando indicadores oficiales…</p>
          </div>
        </div>
        <div className="ficha-metricas-estado" role="status">
          Cargando métricas de la entidad para el periodo {periodo}…
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="ficha-metricas-seccion" aria-label="Métricas por dimensión">
        <div className="ficha-metricas-cabecera">
          <div>
            <h2 className="ficha-metricas-titulo">Métricas por Dimensión</h2>
            <p className="ficha-metricas-subtitulo">Indicadores financieros y operativos</p>
          </div>
        </div>
        <div className="ficha-metricas-alerta-error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      </section>
    )
  }

  if (agrupadas.length === 0) {
    return (
      <section className="ficha-metricas-seccion" aria-label="Métricas por dimensión">
        <div className="ficha-metricas-cabecera">
          <div>
            <h2 className="ficha-metricas-titulo">Métricas por Dimensión</h2>
            <p className="ficha-metricas-subtitulo">Indicadores financieros y de competitividad</p>
          </div>
        </div>
        <div className="ficha-metricas-vacia" role="status">
          <Info size={20} aria-hidden="true" />
          <div>
            <strong>Sin métricas registradas en este periodo</strong>
            <p>
              El servidor no reporta métricas individuales para esta entidad en la frecuencia {periodo}.
              Prueba cambiando el periodo temporal en los botones superiores.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="ficha-metricas-seccion" aria-label="Métricas por dimensión">
      <div className="ficha-metricas-cabecera">
        <div>
          <h2 className="ficha-metricas-titulo">Métricas por Dimensión</h2>
          <p className="ficha-metricas-subtitulo">
            Desglose de indicadores oficiales ({periodo}). Haz clic en cualquier métrica para ver su fórmula y linaje.
          </p>
        </div>
        <span className="ficha-metricas-total-badge mono-num">
          {metricas.length} {metricas.length === 1 ? 'métrica' : 'métricas'}
        </span>
      </div>

      <div className="ficha-dimensiones-lista">
        {agrupadas.map(({ dimension, items }) => (
          <div key={dimension} className="ficha-dimension-bloque">
            <div className="ficha-dimension-cabecera">
              <div className="ficha-dimension-nombre-grupo">
                <span className="ficha-dimension-icono" aria-hidden="true">
                  <Layers size={16} />
                </span>
                <h3 className="ficha-dimension-nombre">{dimension}</h3>
              </div>
              <span className="ficha-dimension-conteo">
                {items.length} {items.length === 1 ? 'indicador' : 'indicadores'}
              </span>
            </div>

            <div className="ficha-metricas-grid">
              {items.map((m) => {
                const valorNorm = Number(m.valorNormalizado ?? 0)
                const pctNorm = Math.min(100, Math.max(0, valorNorm))

                return (
                  <button
                    key={`${m.codigoMetrica}-${m.fecha}`}
                    type="button"
                    className="ficha-metrica-card"
                    onClick={() => onSeleccionarMetrica(m)}
                    aria-label={`Ver fórmula y detalle de ${m.nombreMetrica}`}
                  >
                    <div className="ficha-metrica-card-top">
                      <span className="ficha-metrica-tag-codigo mono-num">
                        {m.codigoMetrica}
                      </span>
                      {m.frecuencia && (
                        <span className="ficha-metrica-tag-frec">{m.frecuencia}</span>
                      )}
                    </div>

                    <strong className="ficha-metrica-card-nombre" title={m.nombreMetrica}>
                      {m.nombreMetrica}
                    </strong>

                    <div className="ficha-metrica-card-valores">
                      <div className="ficha-metrica-card-dato">
                        <span className="ficha-metrica-card-label">Valor</span>
                        <strong className="ficha-metrica-card-val mono-num">
                          {m.valor !== null && m.valor !== undefined
                            ? num(m.valor, 2)
                            : '—'}
                        </strong>
                      </div>

                      <div className="ficha-metrica-card-dato">
                        <span className="ficha-metrica-card-label">Puntaje</span>
                        <strong className="ficha-metrica-card-score mono-num">
                          {m.valorNormalizado !== null && m.valorNormalizado !== undefined
                            ? `${num(m.valorNormalizado, 1)} pts`
                            : '—'}
                        </strong>
                      </div>
                    </div>

                    <div className="ficha-metrica-card-barra" aria-hidden="true">
                      <div
                        className="ficha-metrica-card-relleno"
                        style={{ width: `${pctNorm}%` }}
                      />
                    </div>

                    <div className="ficha-metrica-card-pie">
                      <span>Ver fórmula y detalle</span>
                      <ChevronRight size={14} aria-hidden="true" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
