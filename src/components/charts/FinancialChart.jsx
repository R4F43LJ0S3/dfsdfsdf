import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createChart, ColorType, CandlestickSeries, AreaSeries } from 'lightweight-charts';
import { Trophy } from 'lucide-react';
import { getEntidades, getOhlc, getRanking, getMetricas } from '../../services/api';
import { useTema } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { puedeVerPosicionRanking } from '../../constants/permisos';
import { PERIODOS, PERIODO_POR_DEFECTO, nombrePeriodo } from '../../constants/periodos';
import { num, pct, fechaIso } from '../../utils/format';
import MetricasPorDimension from '../ficha/MetricasPorDimension';
import MetricaDetalleModal from '../ficha/MetricaDetalleModal';
import '../ficha/Ficha.css';
import './FinancialChart.css';

const PALETTE = {
  azulNoche: '#151D33',
  azulAcero: '#264E7A',
  verdeAlza: '#24A460',
  rojoBajada: '#D9534F',
  textoGris: '#5A6375',
};

export const FinancialChart = ({ entidadNombre, ticker }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [listaEntidades, setListaEntidades] = useState([]);
  const [cargandoEntidades, setCargandoEntidades] = useState(true);
  const [serieOhlc, setSerieOhlc] = useState([]);
  const [cargandoOhlc, setCargandoOhlc] = useState(false);
  const [errorOhlc, setErrorOhlc] = useState('');
  const [tipoGrafica, setTipoGrafica] = useState('velas');

  const parametroUrl = searchParams.get('entidad');
  const parametroPeriodo = searchParams.get('periodo');

  // Deriva el periodo directamente de la URL (si es válido) o usa el predeterminado
  const periodo = useMemo(() => {
    if (parametroPeriodo) {
      const match = PERIODOS.find(
        (p) =>
          p.id.toLowerCase() === parametroPeriodo.toLowerCase() ||
          p.nombre.toLowerCase() === parametroPeriodo.toLowerCase(),
      );
      if (match) return match.id;
    }
    return PERIODO_POR_DEFECTO;
  }, [parametroPeriodo]);

  const [hoverData, setHoverData] = useState(null);

  // Consulta entidades disponibles (GET /api/v1/entidades)
  useEffect(() => {
    let activo = true;
    getEntidades()
      .then((lista) => {
        if (!activo) return;
        if (Array.isArray(lista) && lista.length > 0) {
          setListaEntidades(lista);
          setErrorOhlc('');
        } else {
          setListaEntidades([]);
          setErrorOhlc('No hay entidades disponibles en el servidor.');
        }
      })
      .catch((err) => {
        if (!activo) return;
        console.error('[Gráfica] Error consultando entidades:', err?.message);
        setListaEntidades([]);
        setErrorOhlc('No se pudo conectar con el servidor para cargar las entidades.');
      })
      .finally(() => {
        if (activo) setCargandoEntidades(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const entidadActiva = useMemo(() => {
    if (listaEntidades.length === 0) return null;
    if (parametroUrl) {
      const buscado = parametroUrl.trim().toUpperCase();
      const limpio = buscado.replace('-', '');
      const encontrada = listaEntidades.find(
        (e, idx) =>
          String(e.codigo ?? e.codigo_entidad).toUpperCase() === buscado ||
          String(e.codigo ?? e.codigo_entidad).toUpperCase() === limpio ||
          String(e.id).toUpperCase() === buscado ||
          String(idx + 1) === parametroUrl.trim(),
      );
      if (encontrada) return encontrada;
    }
    return listaEntidades[0];
  }, [listaEntidades, parametroUrl]);

  const { usuario } = useAuth();
  const puedeVerPosicion = puedeVerPosicionRanking(usuario);

  // Consulta ranking oficial para deducir / obtener la posición de la entidad (HU-FE-03 CA 1 y HU-FE-07 CA 1)
  const [rankingDatos, setRankingDatos] = useState(null);

  useEffect(() => {
    if (!puedeVerPosicion) return undefined;
    let activo = true;
    getRanking({ periodo, limit: 100 })
      .then((res) => {
        if (!activo) return;
        setRankingDatos(res);
      })
      .catch((err) => {
        if (!activo) return;
        console.warn('[Ficha] Error consultando ranking:', err?.message);
        setRankingDatos(null);
      });

    return () => {
      activo = false;
    };
  }, [periodo, puedeVerPosicion]);

  const infoRanking = useMemo(() => {
    if (!entidadActiva || !puedeVerPosicion) return null;
    const entidadId = entidadActiva.id;
    const cod = String(entidadActiva.codigo ?? entidadActiva.codigo_entidad ?? '').toUpperCase();
    const nom = String(entidadActiva.nombre ?? entidadActiva.nombre_entidad ?? '').toUpperCase();

    // 1. Buscar en el ranking oficial del servidor
    if (rankingDatos?.items?.length) {
      const encontrado = rankingDatos.items.find(
        (it) =>
          it.entidadId === entidadId ||
          String(it.codigo ?? '').toUpperCase() === cod ||
          String(it.entidad ?? '').toUpperCase() === nom,
      );
      if (encontrado && encontrado.posicion !== null && encontrado.posicion !== undefined) {
        return {
          puesto: encontrado.posicion,
          total: rankingDatos.total ?? rankingDatos.items.length,
          cambioPosicion: encontrado.cambioPosicion ?? 0,
        };
      }
    }

    // 2. Deducir de la lista de entidades ordenadas por IC si el ranking no estuviera disponible
    if (listaEntidades.length > 0) {
      const ordenadas = [...listaEntidades].sort((a, b) => {
        const icA = Number(a.ic ?? a.indice_competitividad ?? 0);
        const icB = Number(b.ic ?? b.indice_competitividad ?? 0);
        return icB - icA;
      });
      const idx = ordenadas.findIndex(
        (e) =>
          e.id === entidadId ||
          String(e.codigo ?? e.codigo_entidad ?? '').toUpperCase() === cod,
      );
      if (idx !== -1) {
        return {
          puesto: idx + 1,
          total: ordenadas.length,
          cambioPosicion: 0,
        };
      }
    }

    return null;
  }, [entidadActiva, rankingDatos, listaEntidades, puedeVerPosicion]);

  // Consulta métricas reales por entidad (HU-FE-03 CA 1 y CA 2)
  const [metricasServidor, setMetricasServidor] = useState([]);
  const [cargandoMetricas, setCargandoMetricas] = useState(false);
  const [errorMetricas, setErrorMetricas] = useState('');
  const [metricaSeleccionada, setMetricaSeleccionada] = useState(null);

  useEffect(() => {
    if (!entidadActiva) return undefined;
    let activo = true;

    const filtrarDeEntidad = (lista) => {
      const entidadId = entidadActiva.id;
      const cod = String(entidadActiva.codigo ?? entidadActiva.codigo_entidad ?? '').toUpperCase();
      return (Array.isArray(lista) ? lista : []).filter(
        (m) =>
          (m.entidadId && m.entidadId === entidadId) ||
          (m.codigo && String(m.codigo).toUpperCase() === cod) ||
          (m.codigoEntidad && String(m.codigoEntidad).toUpperCase() === cod),
      );
    };

    Promise.resolve().then(() => {
      if (!activo) return;
      setCargandoMetricas(true);
      setErrorMetricas('');
    });

    const baseParams = { sort: 'fecha', dir: 'desc', size: 100 };
    if (entidadActiva.sector) {
      baseParams.sector = entidadActiva.sector;
    }

    getMetricas({ ...baseParams, periodo })
      .then(async (res) => {
        if (!activo) return;
        const lista = Array.isArray(res) ? res : res?.items ?? [];
        const propias = filtrarDeEntidad(lista);

        if (propias.length > 0) {
          setMetricasServidor(propias);
          return;
        }

        // Fallback automático de frecuencia si el backend solo tiene corte mensual consolidado
        const resFallback = await getMetricas(baseParams);
        if (!activo) return;
        const listaFallback = Array.isArray(resFallback) ? resFallback : resFallback?.items ?? [];
        setMetricasServidor(filtrarDeEntidad(listaFallback));
      })
      .catch((err) => {
        if (!activo) return;
        console.warn('[Ficha] Error consultando métricas:', err?.message);
        setErrorMetricas('No se pudieron cargar las métricas desde el servidor.');
        setMetricasServidor([]);
      })
      .finally(() => {
        if (activo) setCargandoMetricas(false);
      });

    return () => {
      activo = false;
    };
  }, [periodo, entidadActiva]);

  const metricasEntidad = useMemo(() => {
    if (!entidadActiva || metricasServidor.length === 0) return [];
    const entidadId = entidadActiva.id;
    const cod = String(entidadActiva.codigo ?? entidadActiva.codigo_entidad ?? '').toUpperCase();
    return metricasServidor.filter(
      (m) =>
        (m.entidadId && m.entidadId === entidadId) ||
        (m.codigo && String(m.codigo).toUpperCase() === cod) ||
        (m.codigoEntidad && String(m.codigoEntidad).toUpperCase() === cod),
    );
  }, [entidadActiva, metricasServidor]);

  // El endpoint GET /api/v1/entidades/{id}/ohlc exige que {id} tenga formato UUID
  const idConsulta = entidadActiva?.id ?? null;

  useEffect(() => {
    if (!idConsulta) return undefined;
    let activo = true;

    Promise.resolve().then(() => {
      if (!activo) return;
      setCargandoOhlc(true);
      setErrorOhlc('');
    });

    getOhlc(idConsulta, periodo)
      .then((datos) => {
        if (!activo) return;
        if (Array.isArray(datos) && datos.length > 0) {
          setSerieOhlc(datos);
          setErrorOhlc('');
          setHoverData(null);
        } else {
          console.warn(`[Gráfica] Sin serie OHLC para ${idConsulta} (${periodo}).`);
          setSerieOhlc([]);
          setErrorOhlc('No hay datos históricos OHLC disponibles para esta entidad en el periodo seleccionado.');
        }
      })
      .catch((err) => {
        if (!activo) return;
        console.error(`[Gráfica] Error pidiendo OHLC de ${idConsulta} (${periodo}):`, err?.message);
        setSerieOhlc([]);
        setErrorOhlc('No se pudo cargar la serie OHLC desde el servidor.');
      })
      .finally(() => {
        if (activo) setCargandoOhlc(false);
      });

    return () => {
      activo = false;
    };
  }, [idConsulta, periodo]);

  // Colores de la gráfica según el tema (claro u oscuro)
  const { tema } = useTema();
  const C = tema === 'dark'
    ? {
        fondo: '#151D33',
        texto: '#A9B3CA',
        rejilla: '#222C47',
        borde: '#2D3958',
        cruz: '#8DB8E8',
        etiqueta: '#2D3958',
        rojo: '#E5645F',
        linea: '#8DB8E8',
        areaArriba: 'rgba(141, 184, 232, 0.35)',
        areaAbajo: 'rgba(141, 184, 232, 0)',
      }
    : {
        fondo: '#FFFFFF',
        texto: PALETTE.textoGris,
        rejilla: '#F1F5F9',
        borde: '#E2E0DC',
        cruz: PALETTE.azulAcero,
        etiqueta: PALETTE.azulNoche,
        rojo: PALETTE.rojoBajada,
        linea: PALETTE.azulAcero,
        areaArriba: 'rgba(38, 78, 122, 0.35)',
        areaAbajo: 'rgba(38, 78, 122, 0.0)',
      };

  useEffect(() => {
    if (!chartContainerRef.current || serieOhlc.length === 0) return undefined;

    const chartHeight = window.innerWidth < 640 ? 270 : 380;
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: C.fondo },
        textColor: C.texto,
      },
      grid: {
        vertLines: { color: C.rejilla },
        horzLines: { color: C.rejilla },
      },
      rightPriceScale: { borderColor: C.borde },
      timeScale: {
        borderColor: C.borde,
        timeVisible: true,
        rightOffset: 3,
        barSpacing: 10,
        maxBarSpacing: 18,
      },
      crosshair: {
        vertLine: { color: C.cruz, labelBackgroundColor: C.etiqueta },
        horzLine: { color: C.cruz, labelBackgroundColor: C.etiqueta },
      },
    });

    chartRef.current = chart;

    if (tipoGrafica === 'velas') {
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: PALETTE.verdeAlza,
        downColor: C.rojo,
        borderUpColor: PALETTE.verdeAlza,
        borderDownColor: C.rojo,
        wickUpColor: PALETTE.verdeAlza,
        wickDownColor: C.rojo,
      });
      candlestickSeries.setData(serieOhlc);
    } else {
      const areaSeries = chart.addSeries(AreaSeries, {
        topColor: C.areaArriba,
        bottomColor: C.areaAbajo,
        lineColor: C.linea,
        lineWidth: 2,
      });
      const lineData = serieOhlc.map((item) => ({ time: item.time, value: item.close }));
      areaSeries.setData(lineData);
    }

    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        setHoverData(null);
        return;
      }
      const dataPoint = serieOhlc.find((d) => d.time === param.time);
      if (dataPoint) setHoverData(dataPoint);
    });

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && chartRef.current) {
        const { width } = entry.contentRect;
        const h = window.innerWidth < 640 ? 270 : 380;
        chartRef.current.applyOptions({ width, height: h });
      }
    });
    ro.observe(chartContainerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoGrafica, tema, serieOhlc]);

  const handleEntidadChange = (e) => {
    const nuevoCodigo = e.target.value;
    const params = new URLSearchParams(searchParams);
    params.set('entidad', nuevoCodigo);
    params.set('periodo', periodo);
    setSearchParams(params);
  };

  const handlePeriodoChange = (nuevoPeriodo) => {
    const params = new URLSearchParams(searchParams);
    params.set('periodo', nuevoPeriodo);
    if (entidadActiva) {
      params.set('entidad', entidadActiva.codigo ?? entidadActiva.codigo_entidad);
    }
    setSearchParams(params);
  };

  const cargando = cargandoEntidades || cargandoOhlc;
  const nombreMostrado = entidadActiva?.nombre ?? entidadActiva?.nombre_entidad ?? entidadNombre ?? (cargando ? 'Cargando…' : 'Sin entidad');
  const codigoMostrado = entidadActiva?.codigo ?? entidadActiva?.codigo_entidad ?? ticker ?? '—';
  const sectorMostrado = entidadActiva?.sector ?? '—';

  const ultimoDato = serieOhlc[serieOhlc.length - 1];
  const datoMostrar = hoverData || ultimoDato;
  const variacionEntidad = entidadActiva?.variacionPct ?? entidadActiva?.variacion_porcentual ?? null;
  const sube = Number(variacionEntidad) > 0;
  const baja = Number(variacionEntidad) < 0;
  const simboloVar = variacionEntidad === null ? '–' : sube ? '▲' : baja ? '▼' : '–';
  const claseVariacion = baja ? 'baja' : !sube ? 'igual' : '';

  const variacionVela = datoMostrar && datoMostrar.open
    ? ((datoMostrar.close - datoMostrar.open) / datoMostrar.open) * 100
    : null;
  const subeVela = Number(variacionVela) > 0;
  const bajaVela = Number(variacionVela) < 0;

  return (
    <div className="grafica-wrapper">
      <div className="grafica-card-container">
        {/* Cabecera superior unificada */}
        <div className="grafica-header-top">
          <div className="grafica-header-left">
            <div className="grafica-title-row">
              <h1 className="grafica-title">{nombreMostrado}</h1>
              <span className="grafica-ticker mono-num">{codigoMostrado}</span>
              <span className="grafica-badge-finanzas">{sectorMostrado}</span>
              {infoRanking && infoRanking.puesto != null && (
                <span
                  className="grafica-badge-ranking"
                  title={`#${infoRanking.puesto} / ${infoRanking.total} (${nombrePeriodo(periodo)})`}
                >
                  <Trophy size={14} aria-hidden="true" />
                  <span>#{infoRanking.puesto} / {infoRanking.total}</span>
                </span>
              )}
            </div>

            <div className="grafica-price-display-box">
              <span className="grafica-main-value mono-num">
                {num(entidadActiva?.ic ?? entidadActiva?.indice_competitividad, 1)}
              </span>
              <span className={`grafica-main-change mono-num ${claseVariacion}`}>
                {simboloVar} {pct(variacionEntidad)}
              </span>
            </div>
          </div>

          <div className="grafica-header-right-group">
            <select
              id="selector-entidad-grafica"
              className="grafica-select-entidad"
              value={entidadActiva?.codigo ?? entidadActiva?.codigo_entidad ?? ''}
              onChange={handleEntidadChange}
              disabled={listaEntidades.length === 0}
              aria-label="Seleccionar entidad"
            >
              {listaEntidades.length === 0 ? (
                <option value="">{cargandoEntidades ? 'Cargando entidades…' : 'Sin entidades'}</option>
              ) : (
                listaEntidades.map((ent) => (
                  <option key={ent.codigo ?? ent.codigo_entidad} value={ent.codigo ?? ent.codigo_entidad}>
                    {ent.nombre ?? ent.nombre_entidad} · {ent.codigo ?? ent.codigo_entidad}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Layout Split de Terminal en Pantallas Grandes (>= 1100px) */}
        <div className="grafica-terminal-grid">
          <div className="grafica-terminal-main">
            {/* Fila de controles (Velas/Línea y Periodos) */}
            <div className="grafica-controls-row">
              <div className="grafica-type-toggle" role="group" aria-label="Tipo de gráfica">
                <button
                  type="button"
                  onClick={() => setTipoGrafica('velas')}
                  className={`grafica-toggle-btn ${tipoGrafica === 'velas' ? 'active' : ''}`}
                >
                  Velas
                </button>
                <button
                  type="button"
                  onClick={() => setTipoGrafica('linea')}
                  className={`grafica-toggle-btn ${tipoGrafica === 'linea' ? 'active' : ''}`}
                >
                  Línea
                </button>
              </div>

              <div className="grafica-period-group" role="group" aria-label="Periodo de tiempo">
                {PERIODOS.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => handlePeriodoChange(p.id)}
                    className={`grafica-period-btn ${periodo === p.id ? 'active' : ''}`}
                  >
                    {p.nombre}
                  </button>
                ))}
              </div>
            </div>

            {/* Lienzo de la Gráfica o Estados de Carga / Error */}
            {cargando && serieOhlc.length === 0 && (
              <div
                role="status"
                style={{
                  height: '380px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  border: '1px dashed var(--color-border)',
                  color: 'var(--color-text-muted)',
                  fontSize: '14px',
                }}
              >
                Cargando serie histórica OHLC…
              </div>
            )}

            {!cargando && errorOhlc && (
              <div
                role="alert"
                style={{
                  height: '380px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  border: '1px solid var(--rojo-bajada, #D9534F)',
                  backgroundColor: 'rgba(217, 83, 79, 0.08)',
                  color: 'var(--rojo-bajada, #D9534F)',
                  padding: '24px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                {errorOhlc}
              </div>
            )}

            <div
              ref={chartContainerRef}
              style={{
                width: '100%',
                borderRadius: '8px',
                overflow: 'hidden',
                display: serieOhlc.length > 0 ? 'block' : 'none',
              }}
            />

            {/* Tira OHLC compacta continua (Data Ribbon) */}
            <div className="grafica-cards-grid" role="region" aria-label="Datos de sesión OHLC">
              <div className="grafica-stat-card">
                <span className="grafica-stat-label">Fecha</span>
                <strong className="grafica-stat-value mono-num">{fechaIso(datoMostrar?.time) || '—'}</strong>
              </div>
              <div className="grafica-stat-card">
                <span className="grafica-stat-label">Apertura</span>
                <strong className="grafica-stat-value mono-num">{num(datoMostrar?.open, 1)}</strong>
              </div>
              <div className="grafica-stat-card">
                <span className="grafica-stat-label">Máximo</span>
                <strong className="grafica-stat-value mono-num">{num(datoMostrar?.high, 1)}</strong>
              </div>
              <div className="grafica-stat-card">
                <span className="grafica-stat-label">Mínimo</span>
                <strong className="grafica-stat-value mono-num">{num(datoMostrar?.low, 1)}</strong>
              </div>
              <div className="grafica-stat-card">
                <span className="grafica-stat-label">Cierre</span>
                <div className="grafica-stat-val-row">
                  <strong className="grafica-stat-value mono-num">{num(datoMostrar?.close, 1)}</strong>
                  <span className={`grafica-stat-change-tag mono-num ${bajaVela ? 'baja' : !subeVela ? 'igual' : ''}`}>
                    {variacionVela === null ? '–' : subeVela ? '▲' : bajaVela ? '▼' : '–'} {pct(variacionVela)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grafica-terminal-side">
            {/* Sección de Métricas por Dimensión (HU-FE-03 CA 1 y CA 2) */}
            <MetricasPorDimension
              metricas={metricasEntidad}
              cargando={cargandoMetricas}
              error={errorMetricas}
              periodo={nombrePeriodo(periodo)}
              onSeleccionarMetrica={(m) => setMetricaSeleccionada(m)}
            />
          </div>
        </div>
      </div>

      {/* Modal Interactivo de Detalle y Fórmula de Métrica (HU-FE-03 CA 3) */}
      {metricaSeleccionada && (
        <MetricaDetalleModal
          metrica={metricaSeleccionada}
          onCerrar={() => setMetricaSeleccionada(null)}
        />
      )}
    </div>
  );
};

export const GraficaEntidad = FinancialChart;
export default FinancialChart;
