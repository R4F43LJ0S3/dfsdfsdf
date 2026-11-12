import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getRanking, getSectores, getDimensiones, getPeriodos } from '../../services/api'
import { puedeVerPosicionRanking } from '../../constants/permisos'
import RankingTabla from './RankingTabla'
import { PERIODO_POR_DEFECTO } from '../../constants/periodos'
import './Ranking.css'

// HU-FE-04 filtros del ranking
// HU-FE-07 matriz de permisos por rol (Decisión D1: Gerente ve ranking sin posición)

const POR_DEFECTO = { sector: '', dimension: '', periodo: PERIODO_POR_DEFECTO, orden: 'ic', dir: 'desc' }
const ORDENABLES = ['posicion', 'entidad', 'sector', 'ic', 'variacionPct']
const ASC_PRIMERO = ['posicion', 'entidad', 'sector']

function leerFiltros(params) {
  const orden = params.get('orden')
  const dir = params.get('dir')
  return {
    sector: params.get('sector') ?? POR_DEFECTO.sector,
    dimension: params.get('dimension') ?? POR_DEFECTO.dimension,
    periodo: params.get('periodo') || POR_DEFECTO.periodo,
    orden: ORDENABLES.includes(orden) ? orden : POR_DEFECTO.orden,
    dir: dir === 'asc' || dir === 'desc' ? dir : POR_DEFECTO.dir,
  }
}

// por si la api no los devuelve ordenados
function ordenar(items, orden, dir) {
  const signo = dir === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    const x = a[orden]
    const y = b[orden]
    if (x === null || x === undefined) return 1
    if (y === null || y === undefined) return -1
    if (typeof x === 'string') return x.localeCompare(y, 'es') * signo
    return (x - y) * signo
  })
}

export default function Ranking() {
  const { usuario } = useAuth()
  const [params, setSearchParams] = useSearchParams()
  const filtros = leerFiltros(params)
  const { sector, dimension, periodo, orden, dir } = filtros

  const [catalogos, setCatalogos] = useState({ sectores: [], dimensiones: [], periodos: [] })
  const [resultado, setResultado] = useState({ clave: null, datos: null })
  const [error, setError] = useState(null)
  const clave = JSON.stringify([sector, dimension, periodo, orden, dir])
  const datos = resultado.datos
  const cargando = resultado.clave !== clave

  const puedeVerPosicion = puedeVerPosicionRanking(usuario)

  useEffect(() => {
    Promise.all([getSectores(), getDimensiones(), getPeriodos()])
      .then(([sectores, dimensiones, periodos]) => setCatalogos({ sectores, dimensiones, periodos }))
      .catch(() => setError('No se pudieron cargar los catálogos del ranking.'))
  }, [])

  useEffect(() => {
    let vigente = true
    const pedido = Object.fromEntries(
      Object.entries({ sector, dimension, periodo, orden, dir }).filter(([, v]) => v),
    )
    getRanking(pedido)
      .then((respuesta) => {
        if (!vigente) return
        setResultado({ clave, datos: respuesta })
        setError(null)
      })
      .catch((err) => {
        if (!vigente) return
        if (err?.response?.status === 403) {
          setError('Tu rol no tiene autorización para acceder al ranking de competitividad (HTTP 403 Forbidden).')
        } else {
          setError('No se pudo cargar el ranking. Intenta de nuevo.')
        }
      })
    return () => {
      vigente = false
    }
  }, [clave]) // eslint-disable-line react-hooks/exhaustive-deps

  const filas = useMemo(() => {
    if (!datos?.items) return null
    let lista = [...datos.items]

    // Filtrado defensivo en el cliente si el backend no lo aplicó
    if (sector) {
      lista = lista.filter(
        (item) => String(item.sector).trim().toLowerCase() === sector.trim().toLowerCase(),
      )
    }

    return ordenar(lista, orden, dir)
  }, [datos, sector, orden, dir])

  // los filtros se guardan en la url
  const cambiar = (cambios) => {
    const siguiente = { ...filtros, ...cambios }
    const limpio = {}
    Object.entries(siguiente).forEach(([claveFiltro, valor]) => {
      if (valor && valor !== POR_DEFECTO[claveFiltro]) limpio[claveFiltro] = valor
    })
    setSearchParams(limpio)
  }

  const ordenarPor = (campo) => {
    if (orden === campo) cambiar({ dir: dir === 'asc' ? 'desc' : 'asc' })
    else cambiar({ orden: campo, dir: ASC_PRIMERO.includes(campo) ? 'asc' : 'desc' })
  }

  const hayFiltros = params.toString() !== ''
  const nombrePeriodo = catalogos.periodos.find((p) => p.id === periodo)?.nombre ?? periodo

  return (
    <div className="ranking">
      <header>
        <h1 className="titulo-pagina">Ranking de competitividad</h1>
      </header>

      <section className="tarjeta filtros" aria-label="Filtros del ranking">
        <div className="filtros-fila">
          <label className="campo">
            <span>Sector</span>
            <select value={sector} onChange={(e) => cambiar({ sector: e.target.value })}>
              <option value="">Todos los sectores</option>
              {catalogos.sectores.map((s) => (
                <option key={s.id} value={s.nombre}>{s.nombre}</option>
              ))}
            </select>
          </label>

          <label className="campo">
            <span>Dimensión</span>
            <select
              value={dimension}
              onChange={(e) => cambiar({ dimension: e.target.value })}
              disabled={catalogos.dimensiones.length === 0}
            >
              <option value="">
                {catalogos.dimensiones.length === 0 ? 'Sin métricas cargadas' : 'IC general'}
              </option>
              {catalogos.dimensiones.map((d) => (
                <option key={d.id} value={d.nombre}>{d.nombre}</option>
              ))}
            </select>
          </label>

          <label className="campo">
            <span>Periodo</span>
            <select value={periodo} onChange={(e) => cambiar({ periodo: e.target.value })}>
              {catalogos.periodos.length === 0 && <option value={periodo}>{nombrePeriodo}</option>}
              {catalogos.periodos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </label>

          <button type="button" className="boton-limpiar" onClick={() => setSearchParams({})} disabled={!hayFiltros}>
            Limpiar filtros
          </button>
        </div>
        {catalogos.dimensiones.length === 0 && (
          <p className="texto-suave" role="status">
            El servidor todavía no tiene métricas cargadas, así que el filtro de dimensión no está
            disponible. El ranking que ves usa el Índice de Competitividad general.
          </p>
        )}
      </section>

      {error && (
        <p role="alert" className="estado estado-error">{error}</p>
      )}
      {!error && !filas && <p className="estado" aria-live="polite">Cargando ranking…</p>}
      {!error && filas && (
        <RankingTabla
          filas={filas}
          total={sector ? filas.length : (datos.total ?? filas.length)}
          orden={orden}
          dir={dir}
          dimension={dimension}
          periodo={nombrePeriodo}
          periodoId={periodo}
          cargando={cargando}
          onOrdenar={ordenarPor}
          mostrarPosicion={puedeVerPosicion}
        />
      )}
    </div>
  )
}
