import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Shield, X, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  cargarCatalogoLocal,
  buscarEnLista,
  encontrarTermino,
  TIPOS_ENTRADA,
} from '../services/diccionarioService'
import {
  ETIQUETA_SENSIBILIDAD,
  nivelesSensibilidadPermitidos,
  puedeVerSensibilidad,
} from '../constants/permisos'
import FichaTermino from '../components/diccionario/FichaTermino'
import '../components/diccionario/Diccionario.css'

// Accesos rápidos a las métricas y conceptos centrales de SIFTC
const ACCESOS_RAPIDOS = ['IC', 'ROE', 'OHLC', 'Razón corriente', 'Nivel de endeudamiento', 'Ranking', 'Ticker']

export default function Diccionario() {
  const { usuario } = useAuth()
  const [params, setParams] = useSearchParams()

  const [consulta, setConsulta] = useState(() => params.get('q') || '')
  const [tipo, setTipo] = useState(() => params.get('tipo') || 'todos')
  const [terminoManual, setTerminoManual] = useState(null)

  const nivelesPermitidos = useMemo(() => nivelesSensibilidadPermitidos(usuario), [usuario])
  const catalogoCompleto = useMemo(() => cargarCatalogoLocal(), [])

  const totalVisible = useMemo(
    () => catalogoCompleto.filter((t) => puedeVerSensibilidad(usuario, t.clasificacion)).length,
    [catalogoCompleto, usuario],
  )

  const resultados = useMemo(
    () => buscarEnLista(catalogoCompleto, { q: consulta, tipo, usuario }),
    [catalogoCompleto, consulta, tipo, usuario],
  )

  const refUrl = params.get('termino')
  const seleccionado = useMemo(() => {
    if (terminoManual) return terminoManual
    if (refUrl) return encontrarTermino(refUrl, usuario)
    return null
  }, [terminoManual, refUrl, usuario])

  const actualizarUrl = (nuevaConsulta, nuevoTipo, nuevoTerminoId = null) => {
    const siguientes = {}
    if (nuevaConsulta.trim()) siguientes.q = nuevaConsulta.trim()
    if (nuevoTipo && nuevoTipo !== 'todos') siguientes.tipo = nuevoTipo
    if (nuevoTerminoId) siguientes.termino = nuevoTerminoId
    setParams(siguientes, { replace: true })
  }

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
    setTerminoManual(null)
    setParams({}, { replace: true })
  }

  const abrirTermino = (termino) => {
    setTerminoManual(termino)
    actualizarUrl(consulta, tipo, termino.codigo || termino.id || termino.nombre)
  }

  const cerrarFicha = () => {
    setTerminoManual(null)
    actualizarUrl(consulta, tipo, null)
  }

  const abrirRelacionado = (nombreRelacionado) => {
    const encontrado = encontrarTermino(nombreRelacionado, usuario)
    if (encontrado) {
      abrirTermino(encontrado)
    } else {
      setTerminoManual(null)
      setTipo('todos')
      setConsulta(nombreRelacionado)
      actualizarUrl(nombreRelacionado, 'todos', null)
    }
  }

  return (
    <section className="dic-pagina" aria-labelledby="dic-titulo">
      <header className="dic-encabezado">
        <div className="dic-encabezado-izq">
          <h1 id="dic-titulo">Diccionario de datos</h1>
          <span className="dic-contador-badge mono-num">
            {resultados.length} / {totalVisible} entradas
          </span>
        </div>

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
      </header>

      {/* Barra de búsqueda y filtro segmentado */}
      <div className="dic-controles" role="search" aria-label="Buscar en el diccionario de datos">
        <div className="dic-buscador">
          <Search size={16} aria-hidden="true" className="dic-buscador-icono" />
          <input
            type="search"
            value={consulta}
            onChange={(e) => cambiarConsulta(e.target.value)}
            placeholder="Buscar por código (RNT-01), métrica (ROE), término (OHLC) o campo…"
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

      {/* Accesos directos a conceptos clave */}
      {!consulta && tipo === 'todos' && (
        <div className="dic-sugerencias" aria-label="Conceptos frecuentes">
          <span className="dic-sugerencias-label">Frecuentes:</span>
          {ACCESOS_RAPIDOS.map((s) => (
            <button
              key={s}
              type="button"
              className="dic-sugerencia-btn"
              onClick={() => {
                const directo = encontrarTermino(s, usuario)
                if (directo) abrirTermino(directo)
                else cambiarConsulta(s)
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Resultados */}
      {resultados.length === 0 ? (
        <div className="dic-vacio" role="status">
          <p>
            No se encontraron entradas visibles para tu rol con{' '}
            <strong>“{consulta || tipo}”</strong>.
          </p>
          <button type="button" className="dic-btn-secundario" onClick={limpiar}>
            Restablecer filtros
          </button>
        </div>
      ) : (
        <ul className="dic-lista" aria-label="Entradas del diccionario">
          {resultados.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className="dic-item"
                onClick={() => abrirTermino(t)}
              >
                <div className="dic-item-top">
                  <div className="dic-item-etiquetas">
                    <span className={`dic-chip dic-chip-tipo dic-tipo-${t.tipo.toLowerCase()}`}>
                      {t.tipo}
                    </span>
                    {t.codigo && <span className="dic-codigo mono-num">{t.codigo}</span>}
                    {t.nombreTecnico && (
                      <code className="dic-tecnico mono-num">{t.nombreTecnico}</code>
                    )}
                    <span className={`dic-chip dic-sens-${t.nivelSensibilidad}`}>
                      {ETIQUETA_SENSIBILIDAD[t.nivelSensibilidad] || t.clasificacion}
                    </span>
                  </div>
                  <ChevronRight size={16} aria-hidden="true" className="dic-item-flecha" />
                </div>

                <h2 className="dic-item-nombre">{t.nombre}</h2>
                <p className="dic-item-desc">{t.descripcion}</p>

                {(t.formula || t.unidad || t.frecuencia) && (
                  <div className="dic-item-meta">
                    {t.formula && <code className="dic-item-formula">{t.formula}</code>}
                    {t.unidad && <span>Unidad: {t.unidad}</span>}
                    {t.frecuencia && <span>Frecuencia: {t.frecuencia}</span>}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <FichaTermino
        termino={seleccionado}
        onCerrar={cerrarFicha}
        onSeleccionarRelacionado={abrirRelacionado}
      />
    </section>
  )
}
