import { useId, useMemo, useState } from 'react'
import { num } from '../../utils/format'
import { sinTildes } from '../../utils/comparador'
import { MAX_ENTIDADES } from '../../constants/comparador'

// HU-FE-05 · Lista de entidades con buscador.
// CA 1: al llegar a 4, las demás opciones se ven bloqueadas pero siguen respondiendo
// al clic, para que el intento de agregar una quinta dispare el aviso (no se ignora en silencio).
export default function SelectorEntidades({ entidades, seleccion, lleno, onAlternar }) {
  const [busqueda, setBusqueda] = useState('')
  const idBusqueda = useId()

  const filtradas = useMemo(() => {
    const texto = sinTildes(busqueda.trim())
    if (!texto) return entidades
    return entidades.filter((e) =>
      sinTildes(`${e.nombre ?? e.nombre_entidad} ${e.codigo ?? e.codigo_entidad} ${e.sector}`).includes(texto)
    )
  }, [entidades, busqueda])

  return (
    <div className="cmp-selector">
      <div className="cmp-selector-cabecera">
        <label htmlFor={idBusqueda} className="cmp-etiqueta">Buscar entidad</label>
        <span className="cmp-contador mono-num" aria-live="polite">
          {seleccion.length} de {MAX_ENTIDADES} seleccionadas
        </span>
      </div>
      <input
        id={idBusqueda}
        type="search"
        className="cmp-buscar"
        placeholder="Nombre, código o sector"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        autoComplete="off"
      />

      {filtradas.length === 0 ? (
        <p className="cmp-lista-vacia" role="status">Ninguna entidad coincide con “{busqueda}”.</p>
      ) : (
        <ul className="cmp-lista" aria-label="Entidades disponibles">
          {filtradas.map((e) => {
            const cod = e.codigo ?? e.codigo_entidad
            const nom = e.nombre ?? e.nombre_entidad
            const ic = e.ic ?? e.indice_competitividad
            const elegida = seleccion.includes(cod)
            const bloqueada = lleno && !elegida
            return (
              <li key={cod}>
                <button
                  type="button"
                  className={`cmp-opcion${elegida ? ' elegida' : ''}${bloqueada ? ' bloqueada' : ''}`}
                  aria-pressed={elegida}
                  aria-disabled={bloqueada || undefined}
                  title={bloqueada ? `Ya hay ${MAX_ENTIDADES} entidades. Quita una para agregar otra.` : undefined}
                  onClick={() => onAlternar(cod)}
                >
                  <span className="cmp-check" aria-hidden="true">{elegida ? '✓' : ''}</span>
                  <span className="cmp-opcion-texto">
                    <span className="cmp-opcion-nombre">{nom}</span>
                    <small className="mono-num">{cod} · {e.sector}</small>
                  </span>
                  <span className="cmp-opcion-ic mono-num">
                    <span className="cmp-sr">IC </span>{num(ic, 1)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
