import { useEffect, useMemo, useState } from 'react'
import { getEntidades, getRanking } from '../../services/api'
import useComparacion from '../../hooks/useComparacion'
import { PERIODOS, nombrePeriodo } from '../../constants/periodos'
import {
  SERIES_COMPARADOR, DIMENSIONES_COMPARADOR, MIN_ENTIDADES, MAX_ENTIDADES,
} from '../../constants/comparador'
import { aNumeroONulo } from '../../utils/comparador'
import SelectorEntidades from './SelectorEntidades'
import TablaComparativa from './TablaComparativa'
import GraficaComparativa from './GraficaComparativa'
import MuestraLinea from './MuestraLinea'
import './Comparador.css'

// HU-FE-05 · Comparar entidades [5 pts]
// "Como analista financiero, quiero comparar hasta 4 entidades lado a lado, para evaluar
//  su competitividad relativa." Usa solo endpoints ya publicados por Backend:
//  GET /entidades, GET /ranking (general y por dimensión) y GET /entidades/{id}/ohlc.

// { items: [...] } de /ranking -> Map(entidadId -> item)
function indexarRanking(respuesta) {
  const mapa = new Map()
  for (const item of respuesta?.items ?? []) {
    if (item?.entidadId) mapa.set(item.entidadId, item)
  }
  return mapa
}

const listar = (codigos) => codigos.join(', ')

export default function Comparador() {
  // --- Entidades disponibles (GET /entidades) ---
  const [intento, setIntento] = useState(0)
  const [respEntidades, setRespEntidades] = useState({ intento: -1, lista: null, error: false })

  useEffect(() => {
    let activo = true
    getEntidades({ size: 100 })
      .then((lista) => activo && setRespEntidades({ intento, lista: Array.isArray(lista) ? lista : [], error: false }))
      .catch((err) => {
        console.error('[Comparador] Error consultando entidades:', err?.message)
        if (activo) setRespEntidades({ intento, lista: null, error: true })
      })
    return () => {
      activo = false
    }
  }, [intento])

  const cargandoEntidades = respEntidades.intento !== intento
  const errorEntidades = !cargandoEntidades && respEntidades.error
  const entidades = useMemo(
    () => (!cargandoEntidades && respEntidades.lista
      ? [...respEntidades.lista].sort((a, b) => String(a.nombre ?? a.nombre_entidad).localeCompare(String(b.nombre ?? b.nombre_entidad), 'es'))
      : null),
    [cargandoEntidades, respEntidades.lista],
  )
  const porCodigo = useMemo(() => new Map((entidades ?? []).map((e) => [e.codigo ?? e.codigo_entidad, e])), [entidades])

  // --- Selección (CA 1 y CA 3) ---
  const comp = useComparacion(entidades)
  const { periodo } = comp
  const textoPeriodo = nombrePeriodo(periodo)

  // El color y el patrón de línea van por posición: chip, fila de la tabla y línea de la gráfica coinciden.
  const elegidas = useMemo(
    () => comp.seleccion
      .map((codigo, i) => ({ codigo, entidad: porCodigo.get(codigo), serie: SERIES_COMPARADOR[i] }))
      .filter((x) => x.entidad)
      .map(({ codigo, entidad, serie }) => ({ id: entidad.id, codigo, nombre: entidad.nombre ?? entidad.nombre_entidad, sector: entidad.sector, entidad, serie })),
    [comp.seleccion, porCodigo],
  )

  // --- Ranking general y por dimensión del periodo (GET /ranking) ---
  const necesitaRanking = comp.listo && comp.suficientes
  const [respRanking, setRespRanking] = useState({ periodo: null, general: null, dimensiones: {} })

  useEffect(() => {
    if (!necesitaRanking) return undefined
    let activo = true
    const pedidos = [
      getRanking({ periodo, limit: 200 }),
      ...DIMENSIONES_COMPARADOR.map((dimension) => getRanking({ periodo, dimension, limit: 200 })),
    ]
    Promise.allSettled(pedidos).then(([general, ...dimensiones]) => {
      if (!activo) return
      setRespRanking({
        periodo,
        general: general.status === 'fulfilled' ? indexarRanking(general.value) : null,
        dimensiones: Object.fromEntries(
          DIMENSIONES_COMPARADOR.map((d, i) => [d, dimensiones[i].status === 'fulfilled' ? indexarRanking(dimensiones[i].value) : null]),
        ),
      })
    })
    return () => {
      activo = false
    }
  }, [necesitaRanking, periodo])

  const rankingVigente = respRanking.periodo === periodo
  const cargandoRanking = necesitaRanking && !rankingVigente

  // Filas de la tabla: el IC y la variación salen del ranking del periodo elegido;
  // si el ranking no trae a la entidad, se usa la cotización actual de /entidades.
  const filas = useMemo(() => elegidas.map((e) => {
    const general = rankingVigente ? respRanking.general?.get(e.id) : undefined
    const valores = {
      ic: aNumeroONulo(general?.ic) ?? aNumeroONulo(e.entidad.ic ?? e.entidad.indice_competitividad),
      variacionPct: aNumeroONulo(general?.variacionPct) ?? aNumeroONulo(e.entidad.variacionPct ?? e.entidad.variacion_porcentual),
      posicion: aNumeroONulo(general?.posicion),
    }
    for (const d of DIMENSIONES_COMPARADOR) {
      valores[d] = rankingVigente ? aNumeroONulo(respRanking.dimensiones[d]?.get(e.id)?.ic) : null
    }
    return { ...e, valores }
  }), [elegidas, rankingVigente, respRanking])

  const sinDimensiones = rankingVigente && filas.length > 0
    && DIMENSIONES_COMPARADOR.every((d) => filas.every((f) => f.valores[d] === null))

  const nombreDe = (codigo) => porCodigo.get(codigo)?.nombre ?? porCodigo.get(codigo)?.nombre_entidad ?? codigo
  const huecos = Math.max(0, MAX_ENTIDADES - elegidas.length)

  return (
    <div className="cmp">
      <header>
        <h1 className="cmp-titulo">Comparar entidades</h1>
      </header>

      <section className="cmp-tarjeta" aria-labelledby="cmp-titulo-seleccion">
        <h2 id="cmp-titulo-seleccion" className="cmp-tarjeta-titulo">Selección</h2>

        {/* CA 1: aviso al intentar agregar una quinta entidad */}
        {comp.aviso?.tipo === 'limite' && (
          <div className="cmp-aviso" role="alert">
            <span className="cmp-aviso-icono" aria-hidden="true">!</span>
            <p>
              <strong>Máximo {MAX_ENTIDADES} entidades.</strong> No se agregó {nombreDe(comp.aviso.codigo)}.
              Quita una de las seleccionadas para poder agregarla.
            </p>
            <button type="button" className="cmp-aviso-cerrar" onClick={comp.cerrarAviso} aria-label="Cerrar aviso">×</button>
          </div>
        )}

        {/* Un enlace compartido con más de 4 entidades o códigos inexistentes */}
        {comp.listo && comp.avisoEnlace && (
          <div className="cmp-aviso cmp-aviso-info" role="status">
            <span className="cmp-aviso-icono" aria-hidden="true">i</span>
            <p>
              {comp.avisoEnlace.excedentes.length > 0 && (
                <>El enlace traía más de {MAX_ENTIDADES} entidades: se muestran las primeras {MAX_ENTIDADES} y se
                  omitió {listar(comp.avisoEnlace.excedentes)}. </>
              )}
              {comp.avisoEnlace.desconocidos.length > 0 && (
                <>No se encontraron los códigos {listar(comp.avisoEnlace.desconocidos)}.</>
              )}
            </p>
          </div>
        )}

        {cargandoEntidades && (
          <p className="cmp-estado" role="status">
            Cargando entidades… Si el servidor estaba inactivo puede tardar hasta un minuto en responder.
          </p>
        )}

        {errorEntidades && (
          <div className="cmp-estado cmp-estado-error" role="alert">
            <p>No se pudo conectar con el servidor para cargar las entidades.</p>
            <button type="button" className="cmp-boton-secundario" onClick={() => setIntento((n) => n + 1)}>
              Reintentar
            </button>
          </div>
        )}

        {comp.listo && entidades.length === 0 && (
          <p className="cmp-estado" role="status">El servidor no tiene entidades registradas todavía.</p>
        )}

        {comp.listo && entidades.length > 0 && (
          <div className="cmp-panel">
            <SelectorEntidades
              entidades={entidades}
              seleccion={comp.seleccion}
              lleno={comp.lleno}
              onAlternar={comp.alternar}
            />

            <div className="cmp-lado">
              <h3 className="cmp-etiqueta">En comparación</h3>
              <ul className="cmp-elegidas" aria-label="Entidades en comparación">
                {elegidas.map((e) => (
                  <li key={e.codigo} className="cmp-chip">
                    <MuestraLinea serie={e.serie} ancho={24} />
                    <span className="cmp-chip-texto">
                      <span className="cmp-chip-nombre" title={e.nombre}>{e.nombre}</span>
                      <small className="mono-num">{e.codigo}</small>
                    </span>
                    <button
                      type="button"
                      className="cmp-chip-quitar"
                      onClick={() => comp.quitar(e.codigo)}
                      aria-label={`Quitar ${e.nombre} de la comparación`}
                      title="Quitar"
                    >
                      ×
                    </button>
                  </li>
                ))}
                {Array.from({ length: huecos }, (_, i) => (
                  <li key={`hueco-${i}`} className="cmp-hueco" aria-hidden="true">
                    {elegidas.length + i < MIN_ENTIDADES ? 'Elige una entidad' : 'Espacio libre (opcional)'}
                  </li>
                ))}
              </ul>

              <div className="cmp-periodo-grupo">
                <span className="cmp-etiqueta" id="cmp-etiqueta-periodo">Periodo</span>
                <div className="cmp-periodo" role="group" aria-labelledby="cmp-etiqueta-periodo">
                  {PERIODOS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={periodo === p.id}
                      onClick={() => comp.cambiarPeriodo(p.id)}
                    >
                      {p.nombre}
                    </button>
                  ))}
                </div>
              </div>

              <div className="cmp-acciones">
                <button
                  type="button"
                  className="cmp-boton-secundario"
                  onClick={comp.limpiar}
                  disabled={elegidas.length === 0}
                >
                  Limpiar selección
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {comp.listo && entidades.length > 0 && !comp.suficientes && (
        <section className="cmp-tarjeta cmp-vacio" aria-live="polite">
          <p className="cmp-vacio-titulo">
            {comp.faltan === MIN_ENTIDADES
              ? `Elige al menos ${MIN_ENTIDADES} entidades para comparar.`
              : 'Elige 1 entidad más para empezar la comparación.'}
          </p>
          <p className="cmp-nota">Aquí aparecerán la tabla de métricas y la gráfica del IC.</p>
        </section>
      )}

      {comp.listo && comp.suficientes && (
        <>
          <section className="cmp-tarjeta" aria-labelledby="cmp-titulo-metricas">
            <div className="cmp-tarjeta-cabecera">
              <h2 id="cmp-titulo-metricas" className="cmp-tarjeta-titulo">Métricas lado a lado</h2>
              <span className="cmp-etiqueta-periodo">Periodo: {textoPeriodo}</span>
            </div>
            <TablaComparativa filas={filas} periodo={textoPeriodo} cargando={cargandoRanking} />
            {sinDimensiones && (
              <p className="cmp-nota" role="status">
                El servidor aún no publica puntajes por dimensión para el periodo {textoPeriodo}; por eso esas
                columnas aparecen con “—”.
              </p>
            )}
          </section>

          <section className="cmp-tarjeta" aria-labelledby="cmp-titulo-grafica">
            <div className="cmp-tarjeta-cabecera">
              <h2 id="cmp-titulo-grafica" className="cmp-tarjeta-titulo">Índice de Competitividad en el tiempo</h2>
              <span className="cmp-etiqueta-periodo">Periodo: {textoPeriodo}</span>
            </div>
            <GraficaComparativa entidades={elegidas} periodo={periodo} nombrePeriodo={textoPeriodo} />
          </section>
        </>
      )}
    </div>
  )
}
