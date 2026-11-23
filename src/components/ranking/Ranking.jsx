import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getRanking, getSectores, getDimensiones, getPeriodos, limpiarCacheApi } from '../../services/api'
import { extraerMensajeError } from '../../services/authService'
import { puedeVerPosicionRanking, puedeConsultarRanking } from '../../constants/permisos'
import RankingTabla from './RankingTabla'
import { PERIODO_POR_DEFECTO } from '../../constants/periodos'
import './Ranking.css'

// HU-FE-04 filtros del ranking
// HU-FE-07 matriz de permisos por rol (Decisión D1: Gerente ve ranking sin posición; Usuario móvil SA -> 403)

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
  const [esPermisoDenegado, setEsPermisoDenegado] = useState(false)
  const [intento, setIntento] = useState(0)
  const clave = JSON.stringify([sector, dimension, periodo, orden, dir, intento])
  const datos = resultado.datos
  const cargando = resultado.clave !== clave

  const tieneAcceso = puedeConsultarRanking(usuario)
  const puedeVerPosicion = puedeVerPosicionRanking(usuario)

  useEffect(() => {
    if (!tieneAcceso) return undefined
    Promise.all([getSectores(), getDimensiones(), getPeriodos()])
      .then(([sectores, dimensiones, periodos]) => setCatalogos({ sectores, dimensiones, periodos }))
      .catch(() => setError('No se pudieron cargar los catálogos del ranking.'))
  }, [tieneAcceso])

  useEffect(() => {
    if (!tieneAcceso) return undefined
    let vigente = true
    const pedido = Object.fromEntries(
      Object.entries({ sector, dimension, periodo, orden, dir }).filter(([, v]) => v),
    )
    getRanking(pedido)
      .then((respuesta) => {
        if (!vigente) return
        setResultado({ clave, datos: respuesta })
        setError(null)
        setEsPermisoDenegado(false)
      })
      .catch((err) => {
        if (!vigente) return
        setResultado({ clave, datos: null })
        if (err?.response?.status === 403) {
          setEsPermisoDenegado(true)
          setError('Acceso denegado: tu rol actual no tiene permisos para consultar el ranking de competitividad.')
        } else {
          setEsPermisoDenegado(false)
          setError(extraerMensajeError(err, 'No se pudo cargar el ranking. Intenta de nuevo.'))
        }
      })
    return () => {
      vigente = false
    }
  }, [clave, tieneAcceso]) // eslint-disable-line react-hooks/exhaustive-deps

  const filas = useMemo(() => {
    if (!datos?.items) return null
    let lista = [...datos.items]

    if (sector) {
      lista = lista.filter(
        (item) => String(item.sector).trim().toLowerCase() === sector.trim().toLowerCase(),
      )
    }

    return ordenar(lista, orden, dir)
  }, [datos, sector, orden, dir])

  if (!tieneAcceso) {
    return (
      <div className="ranking">
        <p role="alert" className="estado estado-error">
          Acceso denegado: tu perfil ({usuario?.rol || 'Usuario móvil'}) no tiene autorización para consultar el ranking de competitividad.
        </p>
      </div>
    )
  }

  const cambiar = (nuevos) => {
    const siguiente = { ...filtros, ...nuevos }
    const limpios = Object.entries(siguiente).filter(([k, v]) => v && v !== POR_DEFECTO[k])
    setSearchParams(Object.fromEntries(limpios), { replace: true })
  }

  const ordenarPor = (campo) => {
    if (orden === campo) {
      cambiar({ dir: dir === 'asc' ? 'desc' : 'asc' })
    } else {
      cambiar({ orden: campo, dir: ASC_PRIMERO.includes(campo) ? 'asc' : 'desc' })
    }
  }

  const hayFiltros = sector !== '' || dimension !== '' || periodo !== POR_DEFECTO.periodo
  const nombrePeriodo = catalogos.periodos.find((p) => p.id === periodo)?.nombre ?? periodo

  const reintentar = () => {
    limpiarCacheApi()
    setError(null)
    setIntento((n) => n + 1)
  }

  return (
    <div className="ranking">
      <header className="encabezado-ranking">
        <div>
          <h1 className="titulo-pagina">Ranking de competitividad</h1>
        </div>
      </header>

      <section className="tarjeta filtros" aria-label="Filtros del ranking">
        <div className="filtros-fila">
          <label className="campo">
            <span className="etiqueta">Sector</span>
            <select value={sector} onChange={(e) => cambiar({ sector: e.target.value })}>
              <option value="">Todos los sectores</option>
              {catalogos.sectores.map((s) => (
                <option key={s.id} value={s.nombre}>{s.nombre}</option>
              ))}
            </select>
          </label>

          <label className="campo">
            <span className="etiqueta">Dimensión</span>
            <select
              value={dimension}
              onChange={(e) => cambiar({ dimension: e.target.value })}
              disabled={catalogos.dimensiones.length === 0}
            >
              <option value="">IC general</option>
              {catalogos.dimensiones.map((d) => (
                <option key={d.id} value={d.nombre}>{d.nombre}</option>
              ))}
            </select>
          </label>

          <label className="campo">
            <span className="etiqueta">Periodo</span>
            <select value={periodo} onChange={(e) => cambiar({ periodo: e.target.value })}>
              {catalogos.periodos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="boton-secundario boton-limpiar"
            onClick={() => setSearchParams({}, { replace: true })}
            disabled={!hayFiltros}
          >
            Limpiar filtros
          </button>
        </div>
      </section>

      {error && (
        <div role="alert" className="tarjeta ranking-error-card">
          <p className="ranking-error-texto">{error}</p>
          {!esPermisoDenegado && (
            <button type="button" className="boton-secundario boton-limpiar" onClick={reintentar}>
              Reintentar
            </button>
          )}
        </div>
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
