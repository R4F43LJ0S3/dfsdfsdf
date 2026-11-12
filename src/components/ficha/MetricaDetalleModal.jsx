import { useEffect } from 'react'
import { X, Calculator, Calendar, Building2, Gauge } from 'lucide-react'
import { num, fechaIso } from '../../utils/format'
import EnlaceDiccionario from '../diccionario/EnlaceDiccionario'

// HU-FE-03 CA 3: Detalle interactivo de métrica (Definición, Fórmula y Linaje)
export default function MetricaDetalleModal({ metrica, onCerrar }) {
  useEffect(() => {
    const alPresionar = (e) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onCerrar])

  if (!metrica) return null

  const rawNorm = Number(metrica.valorNormalizado ?? 0)
  const escala100 = rawNorm > 0 && rawNorm <= 1 ? rawNorm * 100 : rawNorm
  const pctNorm = Math.min(100, Math.max(0, escala100))
  const tieneNorm = metrica.valorNormalizado !== null && metrica.valorNormalizado !== undefined

  return (
    <div
      className="ficha-modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
      role="presentation"
    >
      <div
        className="ficha-modal-tarjeta"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ficha-modal-titulo"
      >
        {/* Cabecera del modal */}
        <div className="ficha-modal-cabecera">
          <div className="ficha-modal-cabecera-info">
            <span className="ficha-modal-codigo mono-num">{metrica.codigoMetrica}</span>
            <span className="ficha-modal-dimension-tag">{metrica.dimension}</span>
            {metrica.frecuencia && (
              <span className="ficha-modal-frecuencia-tag">{metrica.frecuencia}</span>
            )}
          </div>
          <button
            type="button"
            className="ficha-modal-cerrar-btn"
            onClick={onCerrar}
            aria-label="Cerrar detalle de métrica"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <h2 id="ficha-modal-titulo" className="ficha-modal-nombre">
          {metrica.nombreMetrica}
        </h2>

        <p className="ficha-modal-entidad">
          <Building2 size={16} aria-hidden="true" />
          <span>{metrica.nombre} ({metrica.codigo})</span>
          <span className="ficha-modal-sep">·</span>
          <span>{metrica.sector}</span>
        </p>

        {/* Sección de Fórmula Oficial (CA 3) */}
        <section className="ficha-modal-formula-seccion" aria-label="Fórmula de cálculo">
          <div className="ficha-modal-formula-rotulo">
            <Calculator size={16} aria-hidden="true" />
            <strong>Fórmula de cálculo oficial</strong>
          </div>
          <div className="ficha-modal-formula-contenedor">
            <code className="ficha-modal-formula-texto">
              {metrica.formula || 'Fórmula definida según la metodología oficial SIFTC'}
            </code>
          </div>
        </section>

        {/* Resumen de Valores (CA 2 y CA 3) */}
        <div className="ficha-modal-grid-valores">
          <div className="ficha-modal-dato-card">
            <span className="ficha-modal-dato-label">Valor reportado</span>
            <strong className="ficha-modal-dato-valor mono-num">
              {metrica.valor !== null && metrica.valor !== undefined
                ? num(metrica.valor, 2)
                : '—'}
            </strong>
          </div>

          <div className="ficha-modal-dato-card">
            <span className="ficha-modal-dato-label">
              <Gauge size={14} aria-hidden="true" /> Valor normalizado (IC)
            </span>
            <div className="ficha-modal-dato-norm-row">
              <strong className="ficha-modal-dato-valor mono-num">
                {tieneNorm
                  ? `${num(escala100, 1)} / 100 pts (${num(rawNorm, 4)})`
                  : '—'}
              </strong>
            </div>
            <div className="ficha-modal-barra-pista" aria-hidden="true">
              <div
                className="ficha-modal-barra-relleno"
                style={{ width: `${pctNorm}%` }}
              />
            </div>
          </div>

          <div className="ficha-modal-dato-card">
            <span className="ficha-modal-dato-label">
              <Calendar size={14} aria-hidden="true" /> Fecha de corte
            </span>
            <strong className="ficha-modal-dato-valor mono-num">
              {fechaIso(metrica.fecha) || metrica.fecha || '—'}
            </strong>
          </div>
        </div>

        {/* Acciones */}
        <div className="ficha-modal-acciones">
          <EnlaceDiccionario
            termino={metrica.codigoMetrica || metrica.nombreMetrica}
            etiqueta="Ver en el diccionario"
            onClick={onCerrar}
          />
          <button
            type="button"
            className="ficha-modal-btn-cerrar"
            onClick={onCerrar}
            autoFocus
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
