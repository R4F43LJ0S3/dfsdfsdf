import { useEffect } from 'react'
import { X, Calculator, Shield } from 'lucide-react'
import { ETIQUETA_SENSIBILIDAD } from '../../constants/permisos'

/**
 * HU-DD-08: Modal de ficha detallada contra GET /api/v1/diccionario/{codigo} (DiccionarioFichaDto).
 * Muestra estrictamente los 8 campos reales expuestos por el backend:
 * codigo, tipo, nombre, definicion, formula, unidad, sinonimos y clasificacion.
 */
export default function FichaTermino({
  abierto,
  ficha,
  cargando = false,
  error = '',
  codigoSolicitado = '',
  onCerrar,
}) {
  useEffect(() => {
    if (!abierto) return undefined
    const alPresionar = (e) => {
      if (e.key === 'Escape') onCerrar?.()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [abierto, onCerrar])

  if (!abierto) return null

  const etiquetaNivel = ficha
    ? ETIQUETA_SENSIBILIDAD[ficha.nivelSensibilidad] || ficha.clasificacion || 'Público'
    : ''

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
            {ficha ? (
              <>
                <span className={`dic-chip dic-chip-tipo dic-tipo-${ficha.tipo}`}>
                  {ficha.tipoEtiqueta}
                </span>
                {ficha.codigo && (
                  <span className="dic-codigo mono-num">{ficha.codigo}</span>
                )}
                <span className={`dic-chip dic-sensibilidad dic-sens-${ficha.nivelSensibilidad}`}>
                  <Shield size={12} aria-hidden="true" /> {etiquetaNivel}
                </span>
              </>
            ) : (
              codigoSolicitado && (
                <span className="dic-codigo mono-num">{codigoSolicitado}</span>
              )
            )}
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

        {cargando && (
          <div className="dic-ficha-estado" role="status">
            <h2 id="dic-ficha-titulo" className="dic-ficha-titulo">
              Consultando ficha...
            </h2>
          </div>
        )}

        {!cargando && error && (
          <>
            <div className="dic-ficha-error" role="alert">
              <h2 id="dic-ficha-titulo" className="dic-ficha-titulo">
                Ficha no disponible
              </h2>
              <p className="dic-bloque-texto">{error}</p>
            </div>
            <footer className="dic-ficha-pie">
              <button type="button" className="dic-btn-primario" onClick={onCerrar}>
                Cerrar
              </button>
            </footer>
          </>
        )}

        {!cargando && !error && ficha && (
          <>
            <h2 id="dic-ficha-titulo" className="dic-ficha-titulo">
              {ficha.nombre}
            </h2>

            <p className="dic-ficha-descripcion">{ficha.definicion}</p>

            {ficha.sinonimos?.length > 0 && (
              <div className="dic-ficha-linea">
                <span>Sinónimos:</span>
                <div className="dic-chips">
                  {ficha.sinonimos.map((s, idx) => (
                    <span key={`${s}-${idx}`} className="dic-chip dic-chip-suave">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {ficha.formula && (
              <section className="dic-bloque" aria-label="Fórmula o regla">
                <div className="dic-bloque-titulo">
                  <Calculator size={14} aria-hidden="true" />
                  <strong>
                    {ficha.tipo === 'metrica' ? 'Fórmula oficial' : 'Regla / Estructura'}
                  </strong>
                </div>
                <code className="dic-formula">{ficha.formula}</code>
              </section>
            )}

            {ficha.unidad && (
              <dl className="dic-ficha-grid">
                <div>
                  <dt>Unidad</dt>
                  <dd>{ficha.unidad}</dd>
                </div>
              </dl>
            )}

            <footer className="dic-ficha-pie">
              <button type="button" className="dic-btn-primario" onClick={onCerrar}>
                Cerrar
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
