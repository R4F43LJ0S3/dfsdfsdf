import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Shield, X, ChevronRight, Upload, RotateCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { extraerMensajeError } from '../services/authService'
import {
  obtenerCatalogoInicialDiccionario,
  buscarDiccionario,
  obtenerFichaDiccionario,
  cargarCsvDiccionario,
  normalizarTipoApi,
  esErrorCancelacion,
  TIPOS_ENTRADA,
  LIMITE_RESULTADOS_API,
} from '../services/diccionarioService'
import {
  ETIQUETA_SENSIBILIDAD,
  nivelesSensibilidadPermitidos,
  puedeCargarDiccionario,
} from '../constants/permisos'
import { claveComparacion } from '../utils/texto'
import FichaTermino from '../components/diccionario/FichaTermino'
import '../components/diccionario/Diccionario.css'

// Accesos directos verificados contra códigos reales de analitica.diccionario en el backend
const ACCESOS_RAPIDOS = Object.freeze([
  { etiqueta: 'IC', codigo: 'GLO-IC-INDICE-DE-COMPETITIVIDAD' },
  { etiqueta: 'ROE', codigo: 'RNT-01' },
  { etiqueta: 'ROA', codigo: 'RNT-02' },
  { etiqueta: 'OHLC', codigo: 'GLO-OHLC' },
  { etiqueta: 'Razón corriente', codigo: 'LIQ-01' },
  { etiqueta: 'Nivel de endeudamiento', codigo: 'END-01' },
  { etiqueta: 'Ranking', codigo: 'GLO-RANKING' },
  { etiqueta: 'Ticker', codigo: 'GLO-TICKER' },
])

export default function Diccionario() {
  const { usuario } = useAuth()
  const [params, setParams] = useSearchParams()

  const [consulta, setConsulta] = useState(() => params.get('q') || '')
  const [tipo, setTipo] = useState(() => normalizarTipoApi(params.get('tipo')) || 'todos')
  const [recargaKey, setRecargaKey] = useState(0)

  const [estadoBusqueda, setEstadoBusqueda] = useState({
    clave: '',
    items: [],
    error: '',
    esPermisoDenegado: false,
  })

  const [estadoFicha, setEstadoFicha] = useState({
    clave: '',
    ficha: null,
    error: '',
  })

  const inputCsvRef = useRef(null)
  const [cargandoCsv, setCargandoCsv] = useState(false)
  const [avisoCarga, setAvisoCarga] = useState(null)

  const nivelesPermitidos = useMemo(() => nivelesSensibilidadPermitidos(usuario), [usuario])
  const puedeCargar = useMemo(() => puedeCargarDiccionario(usuario), [usuario])

  const consultaLimpia = consulta.trim()
  const claveConsulta = `${consultaLimpia}|${tipo}|${recargaKey}`
  const refUrl = (params.get('termino') || '').trim()
  const claveFicha = refUrl ? `${refUrl}|${recargaKey}` : ''

  // Carga inicial automática y búsqueda asíncrona contra GET /api/v1/diccionario
  useEffect(() => {
    let activo = true
    const controlador = new AbortController()

    const ejecutarConsulta = async () => {
      try {
        const items = consultaLimpia
          ? await buscarDiccionario({
              buscar: consultaLimpia,
              tipo,
              signal: controlador.signal,
            })
          : await obtenerCatalogoInicialDiccionario({
              tipo,
              signal: controlador.signal,
            })
        if (activo) {
          setEstadoBusqueda({
            clave: claveConsulta,
            items,
            error: '',
            esPermisoDenegado: false,
          })
        }
      } catch (err) {
        if (!activo || esErrorCancelacion(err)) return
        const esPermisoDenegado = err?.response?.status === 403
        setEstadoBusqueda({
          clave: claveConsulta,
          items: [],
          error: esPermisoDenegado
            ? extraerMensajeError(err, 'Tu perfil no tiene permisos para consultar el diccionario.')
            : extraerMensajeError(err, 'No se pudo consultar el diccionario en el servidor.'),
          esPermisoDenegado,
        })
      }
    }

    const timer = consultaLimpia ? setTimeout(ejecutarConsulta, 280) : null
    if (!consultaLimpia) {
      ejecutarConsulta()
    }

    return () => {
      activo = false
      controlador.abort()
      if (timer) clearTimeout(timer)
    }
  }, [claveConsulta, consultaLimpia, tipo])

  // Carga de ficha individual contra GET /api/v1/diccionario/{codigo}
  useEffect(() => {
    if (!claveFicha) return undefined

    let activo = true
    const controlador = new AbortController()

    ;(async () => {
      try {
        let ficha = null
        try {
          ficha = await obtenerFichaDiccionario(refUrl, { signal: controlador.signal })
        } catch (err) {
          if (esErrorCancelacion(err)) throw err
          if (err?.response?.status === 404) {
            // Compatibilidad con enlaces que pasan nombre exacto o abreviatura en lugar de código (ej. ?termino=ROE)
            const candidatos = await buscarDiccionario({
              buscar: refUrl,
              signal: controlador.signal,
            })
            const refNorm = claveComparacion(refUrl)
            const exacta =
              candidatos.find(
                (item) =>
                  claveComparacion(item.codigo) === refNorm ||
                  claveComparacion(item.nombre) === refNorm,
              ) ||
              candidatos.find((item) => claveComparacion(item.nombre).startsWith(`${refNorm} (`))
            if (exacta?.codigo && claveComparacion(exacta.codigo) !== refNorm) {
              ficha = await obtenerFichaDiccionario(exacta.codigo, {
                signal: controlador.signal,
              })
            } else {
              throw err
            }
          } else {
            throw err
          }
        }

        if (activo) {
          setEstadoFicha({ clave: claveFicha, ficha, error: '' })
        }
      } catch (err) {
        if (!activo || esErrorCancelacion(err)) return
        const msg =
          err?.response?.status === 404
            ? 'No se encontró el término solicitado o tu perfil no cuenta con permisos para consultar su clasificación.'
            : extraerMensajeError(err, 'No se pudo cargar la ficha del término.')
        setEstadoFicha({ clave: claveFicha, ficha: null, error: msg })
      }
    })()

    return () => {
      activo = false
      controlador.abort()
    }
  }, [claveFicha, refUrl])

  const busquedaResuelta = estadoBusqueda.clave === claveConsulta
  const cargandoBusqueda = !busquedaResuelta
  const resultados = busquedaResuelta ? estadoBusqueda.items : []
  const errorBusqueda = busquedaResuelta ? estadoBusqueda.error : ''
  const esPermisoDenegado = busquedaResuelta ? estadoBusqueda.esPermisoDenegado : false

  const fichaAbierta = Boolean(refUrl)
  const fichaResuelta = Boolean(claveFicha) && estadoFicha.clave === claveFicha
  const cargandoFicha = fichaAbierta && !fichaResuelta
  const fichaActual = fichaResuelta ? estadoFicha.ficha : null
  const errorFicha = fichaResuelta ? estadoFicha.error : ''

  const actualizarUrl = useCallback(
    (nuevaConsulta, nuevoTipo, nuevoTermino = null) => {
      const siguientes = {}
      if (nuevaConsulta.trim()) siguientes.q = nuevaConsulta.trim()
      if (nuevoTipo && nuevoTipo !== 'todos') siguientes.tipo = nuevoTipo
      if (nuevoTermino) siguientes.termino = nuevoTermino
      setParams(siguientes, { replace: true })
    },
    [setParams],
  )

  const cambiarConsulta = (valor) => {
    setConsulta(valor)
    actualizarUrl(valor, tipo, refUrl)
  }

  const cambiarTipo = (nuevoTipo) => {
    setTipo(nuevoTipo)
    actualizarUrl(consulta, nuevoTipo, refUrl)
  }

  const limpiar = () => {
    setConsulta('')
    setTipo('todos')
    setParams({}, { replace: true })
  }

  const abrirTerminoPorCodigo = (codigo) => {
    actualizarUrl(consulta, tipo, codigo)
  }

  const cerrarFicha = useCallback(() => {
    actualizarUrl(consulta, tipo, null)
  }, [actualizarUrl, consulta, tipo])

  const manejarArchivoCsv = async (e) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    setAvisoCarga(null)
    if (!/\.csv$/i.test(archivo.name) || archivo.size === 0) {
      setAvisoCarga({
        tipo: 'error',
        texto: 'El archivo seleccionado debe tener extensión .csv y contenido válido.',
      })
      e.target.value = ''
      return
    }

    setCargandoCsv(true)
    try {
      const res = await cargarCsvDiccionario(archivo)
      setAvisoCarga({
        tipo: 'ok',
        texto: `Diccionario actualizado en el servidor: ${res.registros} registros cargados.`,
      })
      setRecargaKey((k) => k + 1)
    } catch (err) {
      setAvisoCarga({
        tipo: 'error',
        texto: extraerMensajeError(err, 'No se pudo cargar el archivo CSV en el servidor.'),
      })
    } finally {
      setCargandoCsv(false)
      e.target.value = ''
    }
  }

  return (
    <section className="dic-pagina" aria-labelledby="dic-titulo">
      <header className="dic-encabezado">
        <div className="dic-encabezado-izq">
          <h1 id="dic-titulo">Diccionario de datos</h1>
          {busquedaResuelta && !errorBusqueda && (
            <span className="dic-contador-badge mono-num">
              {resultados.length >= LIMITE_RESULTADOS_API
                ? `${resultados.length} (máx. ${LIMITE_RESULTADOS_API})`
                : `${resultados.length} ${resultados.length === 1 ? 'resultado' : 'resultados'}`}
            </span>
          )}
        </div>

        <div className="dic-encabezado-der">
          <div className="dic-acceso" aria-label="Niveles de sensibilidad autorizados para tu rol">
            <Shield size={14} aria-hidden="true" />
            <span className="dic-acceso-rol">{usuario?.rol || 'Sesión activa'}:</span>
            <div className="dic-acceso-niveles">
              {nivelesPermitidos.map((n) => (
                <span key={n} className={`dic-chip dic-sens-${n}`}>
                  {ETIQUETA_SENSIBILIDAD[n]}
                </span>
              ))}
            </div>
          </div>

          {puedeCargar && (
            <>
              <input
                ref={inputCsvRef}
                type="file"
                accept=".csv,text/csv"
                onChange={manejarArchivoCsv}
                hidden
              />
              <button
                type="button"
                className="dic-btn-cargar"
                disabled={cargandoCsv}
                onClick={() => inputCsvRef.current?.click()}
              >
                <Upload size={14} aria-hidden="true" />
                <span>{cargandoCsv ? 'Cargando...' : 'Cargar CSV'}</span>
              </button>
            </>
          )}
        </div>
      </header>

      {avisoCarga && (
        <div
          className={`dic-aviso dic-aviso-${avisoCarga.tipo}`}
          role={avisoCarga.tipo === 'error' ? 'alert' : 'status'}
        >
          <span>{avisoCarga.texto}</span>
          <button
            type="button"
            className="dic-aviso-cerrar"
            onClick={() => setAvisoCarga(null)}
            aria-label="Cerrar aviso"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Barra de búsqueda y filtro segmentado */}
      <div className="dic-controles" role="search" aria-label="Buscar en el diccionario de datos">
        <div className="dic-buscador">
          <Search size={16} aria-hidden="true" className="dic-buscador-icono" />
          <input
            type="search"
            value={consulta}
            onChange={(e) => cambiarConsulta(e.target.value)}
            placeholder="Buscar por código (RNT-01), métrica (ROE), término (OHLC) o sinónimo…"
            aria-label="Buscar término, métrica o dato"
          />
          {consulta && (
            <button
              type="button"
              className="dic-buscador-limpiar"
              onClick={() => cambiarConsulta('')}
              aria-label="Limpiar texto de búsqueda"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="dic-tipos" role="tablist" aria-label="Filtrar por categoría">
          {TIPOS_ENTRADA.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tipo === t.id}
              className={`dic-tipo-btn ${tipo === t.id ? 'activo' : ''}`}
              onClick={() => cambiarTipo(t.id)}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {/* Accesos rápidos hacia fichas verificadas */}
      {!consultaLimpia && (
        <div className="dic-sugerencias" aria-label="Conceptos frecuentes">
          <span className="dic-sugerencias-label">Frecuentes:</span>
          {ACCESOS_RAPIDOS.map((item) => (
            <button
              key={item.codigo}
              type="button"
              className="dic-sugerencia-btn"
              onClick={() => abrirTerminoPorCodigo(item.codigo)}
            >
              {item.etiqueta}
            </button>
          ))}
        </div>
      )}

      {/* Estado de búsqueda y resultados de la API */}
      {cargandoBusqueda ? (
        <div className="dic-vacio" role="status">
          <p>{consultaLimpia ? 'Buscando en el diccionario...' : 'Cargando diccionario...'}</p>
        </div>
      ) : errorBusqueda ? (
        <div className="dic-vacio" role="alert">
          <p>{errorBusqueda}</p>
          {!esPermisoDenegado && (
            <button
              type="button"
              className="dic-btn-secundario"
              onClick={() => setRecargaKey((k) => k + 1)}
            >
              <RotateCw size={14} aria-hidden="true" />
              <span>Reintentar</span>
            </button>
          )}
        </div>
      ) : resultados.length === 0 ? (
        <div className="dic-vacio" role="status">
          <p>
            {consultaLimpia ? (
              <>
                Sin coincidencias para <strong>“{consultaLimpia}”</strong>.
              </>
            ) : (
              'Sin resultados en el diccionario.'
            )}
          </p>
          {(consultaLimpia || tipo !== 'todos') && (
            <button type="button" className="dic-btn-secundario" onClick={limpiar}>
              Restablecer filtros
            </button>
          )}
        </div>
      ) : (
        <ul className="dic-lista" aria-label="Entradas del diccionario">
          {resultados.map((t) => (
            <li key={`${t.tipo}-${t.codigo}`}>
              <button
                type="button"
                className="dic-item"
                onClick={() => abrirTerminoPorCodigo(t.codigo)}
              >
                <div className="dic-item-top">
                  <div className="dic-item-etiquetas">
                    <span className={`dic-chip dic-chip-tipo dic-tipo-${t.tipo}`}>
                      {t.tipoEtiqueta}
                    </span>
                    {t.codigo && <span className="dic-codigo mono-num">{t.codigo}</span>}
                  </div>
                  <ChevronRight size={16} aria-hidden="true" className="dic-item-flecha" />
                </div>

                <h2 className="dic-item-nombre">{t.nombre}</h2>
                <p className="dic-item-desc">{t.definicion}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <FichaTermino
        abierto={fichaAbierta}
        ficha={fichaActual}
        cargando={cargandoFicha}
        error={errorFicha}
        codigoSolicitado={refUrl}
        onCerrar={cerrarFicha}
      />
    </section>
  )
}
