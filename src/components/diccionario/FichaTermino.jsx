import { useEffect } from 'react'
import { X, Calculator, Gauge, Shield, Layers, ArrowRight } from 'lucide-react'
import { ETIQUETA_SENSIBILIDAD } from '../../constants/permisos'

// HU-DD-08: Modal de ficha detallada de término, métrica o atributo del Diccionario Oficial
export default function FichaTermino({ termino, onCerrar, onSeleccionarRelacionado }) {
  useEffect(() => {
    if (!termino) return undefined
    const alPresionar = (e) => {
      if (e.key === 'Escape') onCerrar?.()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [termino, onCerrar])

  if (!termino) return null

  const etiquetaNivel =
    ETIQUETA_SENSIBILIDAD[termino.nivelSensibilidad] || termino.clasificacion || 'Público'

  return (
    <div
      className="dic-modal-fondo"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar?.()}
      role="presentation"
    >
      <div
        className="dic-ficha"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dic-ficha-titulo"
      >
        <header className="dic-ficha-cabecera">
          <div className="dic-ficha-etiquetas">
            <span className={`dic-chip dic-chip-tipo dic-tipo-${termino.tipo.toLowerCase()}`}>
              {termino.tipo}
            </span>
            {termino.codigo && (
              <span className="dic-codigo mono-num">{termino.codigo}</span>
            )}
            <span className="dic-id mono-num">{termino.id}</span>
            <span className={`dic-chip dic-sensibilidad dic-sens-${termino.nivelSensibilidad}`}>
              <Shield size={12} aria-hidden="true" /> {etiquetaNivel}
            </span>
          </div>
          <button
            type="button"
            className="dic-ficha-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar ficha"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <h2 id="dic-ficha-titulo" className="dic-ficha-titulo">
          {termino.nombre}
        </h2>

        {termino.nombreTecnico && (
          <p className="dic-ficha-tecnico">
            <span>Campo técnico:</span> <code className="mono-num">{termino.nombreTecnico}</code>
          </p>
        )}

        <p className="dic-ficha-descripcion">{termino.descripcion}</p>

        {termino.sinonimos?.length > 0 && (
          <div className="dic-ficha-linea">
            <span>Sinónimos:</span>
            <div className="dic-chips">
              {termino.sinonimos.map((s) => (
                <span key={s} className="dic-chip dic-chip-suave">{s}</span>
              ))}
            </div>
          </div>
        )}

        {termino.formula && (
          <section className="dic-bloque" aria-label="Fórmula o regla">
            <div className="dic-bloque-titulo">
              <Calculator size={14} aria-hidden="true" />
              <strong>{termino.tipo === 'Métrica' ? 'Fórmula oficial' : 'Regla / Estructura'}</strong>
            </div>
            <code className="dic-formula">{termino.formula}</code>
            {termino.variables && (
              <p className="dic-bloque-nota">
                <strong>Variables:</strong> {termino.variables}
              </p>
            )}
          </section>
        )}

        {(termino.unidad || termino.frecuencia || termino.equipoDueno || termino.estado) && (
          <dl className="dic-ficha-grid">
            {termino.unidad && (
              <div>
                <dt>Unidad</dt>
                <dd>{termino.unidad}</dd>
              </div>
            )}
            {termino.frecuencia && (
              <div>
                <dt>Frecuencia</dt>
                <dd>{termino.frecuencia}</dd>
              </div>
            )}
            {termino.equipoDueno && (
              <div>
                <dt>Equipo responsable</dt>
                <dd>{termino.equipoDueno}</dd>
              </div>
            )}
            {termino.estado && (
              <div>
                <dt>Estado documental</dt>
                <dd>{termino.estado}</dd>
              </div>
            )}
          </dl>
        )}

        {termino.umbrales && (
          <section className="dic-bloque" aria-label="Umbrales de referencia">
            <div className="dic-bloque-titulo">
              <Gauge size={14} aria-hidden="true" />
              <strong>Umbrales e interpretación</strong>
            </div>
            <p className="dic-bloque-texto">{termino.umbrales}</p>
          </section>
        )}

        {termino.ejemplo && (
          <section className="dic-bloque" aria-label="Ejemplo aplicado">
            <div className="dic-bloque-titulo">
              <strong>Ejemplo</strong>
            </div>
            <p className="dic-bloque-texto">{termino.ejemplo}</p>
          </section>
        )}

        {termino.usadoEn && (
          <div className="dic-ficha-usado">
            <Layers size={14} aria-hidden="true" />
            <span><strong>Aplicación en el sistema:</strong> {termino.usadoEn}</span>
          </div>
        )}

        {termino.relacionados?.length > 0 && (
          <section className="dic-ficha-relacionados" aria-label="Términos relacionados">
            <span>Términos relacionados</span>
            <div className="dic-chips">
              {termino.relacionados.map((rel) => (
                <button
                  key={rel}
                  type="button"
                  className="dic-relacionado-btn"
                  onClick={() => onSeleccionarRelacionado?.(rel)}
                >
                  <span>{rel}</span>
                  <ArrowRight size={12} aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        )}

        <footer className="dic-ficha-pie">
          <button type="button" className="dic-btn-primario" onClick={onCerrar}>
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  )
}
