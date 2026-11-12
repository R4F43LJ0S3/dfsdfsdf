import { useEffect, useMemo, useRef, useState } from 'react'
import { createChart, ColorType, LineSeries, LineStyle } from 'lightweight-charts'
import { getOhlc } from '../../services/api'
import { useTema } from '../../context/ThemeContext'
import { aSerieLinea } from '../../utils/comparador'
import { num, fechaIso } from '../../utils/format'
import MuestraLinea from './MuestraLinea'

// HU-FE-05 · CA 2: el IC de todas las entidades seleccionadas en UNA misma gráfica.
// Usa GET /entidades/{id}/ohlc (ya existente en api.js) y dibuja el cierre de cada periodo.
// Las peticiones van en paralelo con Promise.allSettled: si una entidad no tiene serie,
// las demás se dibujan igual y la leyenda explica cuál faltó.

const ALTO_MOVIL = 260
const ALTO_ESCRITORIO = 360

const ESTILO_LINEA = {
  solida: LineStyle.Solid,
  discontinua: LineStyle.Dashed,
  punteada: LineStyle.Dotted,
  'rayas-largas': LineStyle.LargeDashed,
}

// Mismos tonos que la gráfica de HU-FE-02 para que ambas pantallas se vean iguales.
const COLORES = {
  dark: { fondo: '#151D33', texto: '#A9B3CA', rejilla: '#222C47', borde: '#2D3958', cruz: '#8DB8E8', etiqueta: '#2D3958' },
  light: { fondo: '#FFFFFF', texto: '#5A6375', rejilla: '#F1F5F9', borde: '#E2E8F0', cruz: '#264E7A', etiqueta: '#151D33' },
}

// lightweight-charts puede entregar el tiempo del cursor como texto, objeto {year, month, day} o epoch.
function tiempoATexto(t) {
  if (typeof t === 'string') return t.slice(0, 10)
  if (typeof t === 'number') return new Date(t * 1000).toISOString().slice(0, 10)
  if (t && typeof t === 'object' && t.year) {
    return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
  }
  return null
}

export default function GraficaComparativa({ entidades, periodo, nombrePeriodo }) {
  const contenedorRef = useRef(null)
  const cacheRef = useRef(new Map()) // `${id}|${periodo}` -> serie de línea ya normalizada
  const { tema } = useTema()
  const [resultado, setResultado] = useState({ clave: null, series: {} })
  const [cursor, setCursor] = useState(null)

  const clave = `${periodo}|${entidades.map((e) => e.id).join(',')}`
  const vigente = resultado.clave === clave

  useEffect(() => {
    let activo = true
    const cache = cacheRef.current
    Promise.allSettled(
      entidades.map(async (e) => {
        const llave = `${e.id}|${periodo}`
        if (!cache.has(llave)) cache.set(llave, aSerieLinea(await getOhlc(e.id, periodo)))
        return cache.get(llave)
      }),
    ).then((respuestas) => {
      if (!activo) return
      const series = {}
      respuestas.forEach((r, i) => {
        const { codigo, nombre } = entidades[i]
        if (r.status === 'fulfilled') {
          series[codigo] = r.value.length > 0 ? { estado: 'ok', puntos: r.value } : { estado: 'vacia', puntos: [] }
        } else {
          console.error(`[Comparador] No se pudo cargar la serie del IC de ${nombre}:`, r.reason?.message)
          series[codigo] = { estado: 'error', puntos: [] }
        }
      })
      setResultado({ clave, series })
    })
    return () => {
      activo = false
    }
  }, [clave, entidades, periodo])

  const lineas = useMemo(
    () => (vigente
      ? entidades.map((e) => ({ ...e, ...(resultado.series[e.codigo] ?? { estado: 'error', puntos: [] }) }))
      : []),
    [vigente, entidades, resultado],
  )
  const conDatos = useMemo(() => lineas.filter((l) => l.estado === 'ok'), [lineas])
  const hayDatos = conDatos.length > 0

  useEffect(() => {
    const contenedor = contenedorRef.current
    if (!contenedor || conDatos.length === 0) return undefined
    const oscuro = tema === 'dark'
    const C = oscuro ? COLORES.dark : COLORES.light

    const altoResp = window.innerWidth < 640 ? ALTO_MOVIL : ALTO_ESCRITORIO
    const chart = createChart(contenedor, {
      width: contenedor.clientWidth || 600,
      height: altoResp,
      layout: { background: { type: ColorType.Solid, color: C.fondo }, textColor: C.texto },
      grid: { vertLines: { color: C.rejilla }, horzLines: { color: C.rejilla } },
      rightPriceScale: { borderColor: C.borde },
      timeScale: { borderColor: C.borde, rightOffset: 2 },
      crosshair: {
        vertLine: { color: C.cruz, labelBackgroundColor: C.etiqueta },
        horzLine: { color: C.cruz, labelBackgroundColor: C.etiqueta },
      },
      localization: { locale: 'es-CO', priceFormatter: (v) => num(v, 1) },
    })

    const series = conDatos.map((l) => {
      const s = chart.addSeries(LineSeries, {
        color: oscuro ? l.serie.oscuro : l.serie.claro,
        lineWidth: 2,
        lineStyle: ESTILO_LINEA[l.serie.patron] ?? LineStyle.Solid,
        title: l.codigo,
        priceLineVisible: false,
      })
      s.setData(l.puntos)
      return [l.codigo, s]
    })
    chart.timeScale().fitContent()

    chart.subscribeCrosshairMove((param) => {
      if (!param?.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        setCursor(null)
        return
      }
      const valores = {}
      for (const [codigo, s] of series) {
        const dato = param.seriesData.get(s)
        if (dato && Number.isFinite(dato.value)) valores[codigo] = dato.value
      }
      setCursor({ fecha: tiempoATexto(param.time), valores })
    })

    const observador = new ResizeObserver(() => {
      if (contenedor.clientWidth > 0) {
        const h = window.innerWidth < 640 ? ALTO_MOVIL : ALTO_ESCRITORIO
        chart.applyOptions({ width: contenedor.clientWidth, height: h })
      }
    })
    observador.observe(contenedor)

    return () => {
      observador.disconnect()
      chart.remove()
    }
  }, [conDatos, tema])

  const nombres = entidades.map((e) => e.nombre).join(', ')

  return (
    <div className="cmp-grafica">
      {!vigente && (
        <div className="cmp-grafica-estado" role="status">
          Cargando la serie del IC de {entidades.length} entidades…
        </div>
      )}
      {vigente && !hayDatos && (
        <div className="cmp-grafica-estado" role="status">
          Ninguna de las entidades seleccionadas tiene serie del IC en el periodo {nombrePeriodo}.
          Prueba con otro periodo.
        </div>
      )}
      <div
        ref={contenedorRef}
        className="cmp-grafica-lienzo"
        role="img"
        aria-label={`Gráfica de líneas del Índice de Competitividad (${nombrePeriodo}) de: ${nombres}. Los valores también están en la leyenda y en la tabla.`}
        style={{ display: vigente && hayDatos ? 'block' : 'none' }}
      />

      {vigente && (
        <>
          <ul className="cmp-leyenda" aria-label="Leyenda de la gráfica">
            {lineas.map((l) => {
              const valor = cursor?.valores[l.codigo] ?? l.puntos.at(-1)?.value
              return (
                <li key={l.codigo}>
                  <MuestraLinea serie={l.serie} />
                  <span className="cmp-leyenda-nombre" title={l.nombre}>
                    {l.nombre}
                    <span className="cmp-sr">, {l.serie.descripcion}</span>
                  </span>
                  {l.estado === 'ok' ? (
                    <strong className="mono-num">{num(valor, 1)}</strong>
                  ) : (
                    <span className="cmp-leyenda-sin">
                      {l.estado === 'vacia' ? 'Sin serie en este periodo' : 'No se pudo cargar'}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="cmp-nota" aria-live="polite">
            {cursor?.fecha
              ? `Valores del IC al ${fechaIso(cursor.fecha)}.`
              : 'Se muestra el último IC de cada entidad. Pasa el cursor por la gráfica para ver otra fecha.'}
          </p>
        </>
      )}
    </div>
  )
}
