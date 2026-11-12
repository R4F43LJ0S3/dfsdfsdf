import { useMemo } from 'react'
import { AlertCircle, Info } from 'lucide-react'
import { num } from '../../utils/format'

const ORDEN_DIMENSIONES_PREFERIDO = [
  'Rentabilidad',
  'Liquidez',
  'Solvencia',
  'Crecimiento',
  'Mercado',
  'Trazabilidad',
]

// Convierte valorNormalizado en escala [0..1] (contrato OpenAPI) a base 100 para el cálculo del IC
function aEscala100(valorNormalizado) {
  const rawNorm = Number(valorNormalizado ?? 0)
  const escala100 = rawNorm > 0 && rawNorm <= 1 ? rawNorm * 100 : rawNorm
  const pctNorm = Math.min(100, Math.max(0, escala100))
  return { rawNorm, escala100, pctNorm }
}

// HU-FE-03 CA 1 y CA 2: Métricas por Dimensión de la entidad seleccionada
export default function MetricasPorDimension({
  metricas = [],
  cargando = false,
  error = '',
  periodo = '',
  onSeleccionarMetrica,
}) {
  const { agrupadas, totalUnicas } = useMemo(() => {
    if (!Array.isArray(metricas) || metricas.length === 0) {
      return { agrupadas: [], totalUnicas: 0 }
    }

    // Deduplicar por codigoMetrica (o nombreMetrica si no hay código) conservando la fecha más reciente
    const porCodigo = new Map()
    for (const m of metricas) {
      const clave = m.codigoMetrica || m.nombreMetrica || ''
      if (!clave) continue
      const previa = porCodigo.get(clave)
      if (!previa || String(m.fecha ?? '') > String(previa.fecha ?? '')) {
        porCodigo.set(clave, m)
      }
    }

    const deduplicadas = Array.from(porCodigo.values())
    const mapa = new Map()
    for (const m of deduplicadas) {
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

    const grupos = dimensiones.map((dimension) => {
      const items = mapa.get(dimension).sort((x, y) =>
        String(x.nombreMetrica || x.codigoMetrica).localeCompare(
          String(y.nombreMetrica || y.codigoMetrica),
          'es',
        ),
      )
      const sumaEscala100 = items.reduce(
        (acc, item) => acc + aEscala100(item.valorNormalizado).escala100,
        0,
      )
      const promedio = items.length > 0 ? sumaEscala100 / items.length : 0

      return {
        dimension,
        items,
        promedio,
      }
    })

    return { agrupadas: grupos, totalUnicas: deduplicadas.length }
  }, [metricas])

  if (cargando) {
    return (
      <section className="ficha-metricas-seccion" aria-label="Métricas por dimensión">
        <div className="ficha-metricas-cabecera">
          <div>
            <h2 className="ficha-metricas-titulo">Métricas por Dimensión</h2>
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
          </div>
        </div>
        <div className="ficha-metricas-vacia" role="status">
          <Info size={18} aria-hidden="true" />
          <div>
            <strong>Corte analítico en consolidación</strong>
            <p>
              El corte analítico para esta entidad en la frecuencia {periodo} se encuentra en proceso de consolidación por el backend.
              Puedes consultar otros periodos disponibles (Diaria, Mensual o Trimestral).
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
        </div>
        <span className="ficha-metricas-total-badge mono-num">
          {totalUnicas} {totalUnicas === 1 ? 'indicador' : 'indicadores'}
        </span>
      </div>

      <div className="ficha-dimensiones-lista">
        {agrupadas.map(({ dimension, items, promedio }) => (
          <div key={dimension} className="ficha-dimension-bloque">
            <div className="ficha-dimension-cabecera">
              <div className="ficha-dimension-nombre-grupo">
                <h3 className="ficha-dimension-nombre">{dimension}</h3>
              </div>
              <span className="ficha-dimension-resumen mono-num">
                <strong className="ficha-dimension-promedio">{num(promedio, 1)} pts</strong>
                <span>·</span>
                <span>
                  {items.length} {items.length === 1 ? 'métrica' : 'métricas'}
                </span>
              </span>
            </div>

            <div className="ficha-metricas-grid">
              {items.map((m) => {
                const { escala100, pctNorm } = aEscala100(m.valorNormalizado)
                const tieneNorm = m.valorNormalizado !== null && m.valorNormalizado !== undefined
                const textoPuntaje = !tieneNorm
                  ? '—'
                  : `${num(escala100, 1)} pts`

                return (
                  <button
                    key={`${m.codigoMetrica}-${m.fecha}`}
                    type="button"
                    className="ficha-metrica-card"
                    onClick={() => onSeleccionarMetrica(m)}
                    aria-label={`Ver fórmula y detalle de ${m.nombreMetrica}`}
                  >
                    <div className="ficha-metrica-card-top">
                      <div className="ficha-metrica-card-top-meta">
                        <span className="ficha-metrica-tag-codigo mono-num">
                          {m.codigoMetrica}
                        </span>
                      </div>
                      <span className="ficha-metrica-indicador-accion" aria-hidden="true">
                        →
                      </span>
                    </div>

                    <strong className="ficha-metrica-card-nombre" title={m.nombreMetrica}>
                      {m.nombreMetrica}
                    </strong>

                    <div className="ficha-metrica-card-valores">
                      <div className="ficha-metrica-card-dato">
                        <strong className="ficha-metrica-card-val mono-num">
                          {m.valor !== null && m.valor !== undefined
                            ? num(m.valor, 2)
                            : '—'}
                        </strong>
                      </div>

                      <div className="ficha-metrica-card-dato ficha-metrica-card-dato-derecha">
                        <strong className="ficha-metrica-card-score mono-num">
                          {textoPuntaje}
                        </strong>
                      </div>
                    </div>

                    <div className="ficha-metrica-card-barra" aria-hidden="true">
                      <div
                        className="ficha-metrica-card-relleno"
                        style={{ width: `${pctNorm}%` }}
                      />
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
