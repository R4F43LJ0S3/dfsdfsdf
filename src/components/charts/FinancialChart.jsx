import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createChart, ColorType, CandlestickSeries, AreaSeries } from 'lightweight-charts';
import { getEntidades, getOhlc } from '../../services/api';
import { useTema } from '../../context/ThemeContext';
import { PERIODOS, PERIODO_POR_DEFECTO, nombrePeriodo } from '../../constants/periodos';
import { num, pct, fechaIso } from '../../utils/format';
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
  const [periodo, setPeriodo] = useState(PERIODO_POR_DEFECTO);
  const [hoverData, setHoverData] = useState(null);

  const parametroUrl = searchParams.get('entidad');

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
          String(e.codigo_entidad).toUpperCase() === buscado ||
          String(e.codigo_entidad).toUpperCase() === limpio ||
          String(e.id).toUpperCase() === buscado ||
          String(idx + 1) === parametroUrl.trim(),
      );
      if (encontrada) return encontrada;
    }
    return listaEntidades[0];
  }, [listaEntidades, parametroUrl]);

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
        borde: '#E2E8F0',
        cruz: PALETTE.azulAcero,
        etiqueta: PALETTE.azulNoche,
        rojo: PALETTE.rojoBajada,
        linea: PALETTE.azulAcero,
        areaArriba: 'rgba(38, 78, 122, 0.35)',
        areaAbajo: 'rgba(38, 78, 122, 0.0)',
      };

  useEffect(() => {
    if (!chartContainerRef.current || serieOhlc.length === 0) return undefined;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: C.fondo },
        textColor: C.texto,
      },
      grid: {
        vertLines: { color: C.rejilla },
        horzLines: { color: C.rejilla },
      },
      rightPriceScale: { borderColor: C.borde },
      timeScale: { borderColor: C.borde, timeVisible: true, rightOffset: 2 },
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

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoGrafica, tema, serieOhlc]);

  const handleEntidadChange = (e) => {
    const nuevoCodigo = e.target.value;
    setSearchParams({ entidad: nuevoCodigo });
  };

  const cargando = cargandoEntidades || cargandoOhlc;
  const nombreMostrado = entidadActiva?.nombre_entidad ?? entidadNombre ?? (cargando ? 'Cargando…' : 'Sin entidad');
  const codigoMostrado = entidadActiva?.codigo_entidad ?? ticker ?? '—';
  const sectorMostrado = entidadActiva?.sector ?? '—';

  const ultimoDato = serieOhlc[serieOhlc.length - 1];
  const datoMostrar = hoverData || ultimoDato;
  const variacionEntidad = entidadActiva?.variacion_porcentual ?? null;
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
        {/* Cabecera superior */}
        <div className="grafica-header-top">
          <div>
            <div className="grafica-breadcrumb">Gráficas / {nombreMostrado}</div>
            <div className="grafica-title-row">
              <h1 className="grafica-title">{nombreMostrado}</h1>
              <span className="grafica-ticker mono-num">{codigoMostrado}</span>
              <span className="grafica-badge-finanzas">{sectorMostrado}</span>
            </div>
          </div>

          <div className="grafica-header-right-group">
            <div className="grafica-entidad-selector-wrapper">
              <label htmlFor="selector-entidad-grafica" className="grafica-selector-label">
                Entidad
              </label>
              <select
                id="selector-entidad-grafica"
                className="grafica-select-entidad"
                value={entidadActiva?.codigo_entidad ?? ''}
                onChange={handleEntidadChange}
                disabled={listaEntidades.length === 0}
              >
                {listaEntidades.length === 0 ? (
                  <option value="">{cargandoEntidades ? 'Cargando entidades…' : 'Sin entidades'}</option>
                ) : (
                  listaEntidades.map((ent) => (
                    <option key={ent.codigo_entidad} value={ent.codigo_entidad}>
                      {ent.nombre_entidad} · {ent.codigo_entidad}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grafica-price-display-box">
              <span className="grafica-main-value mono-num">
                {num(entidadActiva?.indice_competitividad, 1)}
              </span>
              <span className={`grafica-main-change mono-num ${claseVariacion}`}>
                {simboloVar} {pct(variacionEntidad)}
              </span>
            </div>
          </div>
        </div>

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
                onClick={() => setPeriodo(p.id)}
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
              height: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              border: '1px dashed var(--color-border)',
              color: 'var(--color-text-muted)',
              fontSize: '15px',
            }}
          >
            Cargando serie histórica OHLC…
          </div>
        )}

        {!cargando && errorOhlc && (
          <div
            role="alert"
            style={{
              height: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              border: '1px solid var(--rojo-bajada, #D9534F)',
              backgroundColor: 'rgba(217, 83, 79, 0.08)',
              color: 'var(--rojo-bajada, #D9534F)',
              padding: '24px',
              textAlign: 'center',
              fontSize: '15px',
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
            borderRadius: '12px',
            overflow: 'hidden',
            display: serieOhlc.length > 0 ? 'block' : 'none',
          }}
        />

        {/* Tarjetas inferiores OHLC */}
        <div className="grafica-cards-grid">
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
            <span className="grafica-stat-label">Cierre del día</span>
            <div className="grafica-stat-val-row">
              <strong className="grafica-stat-value mono-num">{num(datoMostrar?.close, 1)}</strong>
              <span className={`grafica-stat-change-tag mono-num ${bajaVela ? 'baja' : !subeVela ? 'igual' : ''}`}>
                {variacionVela === null ? '–' : subeVela ? '▲' : bajaVela ? '▼' : '–'} {pct(variacionVela)}
              </span>
            </div>
          </div>
        </div>

        <div className="grafica-footer-note">
          Serie del Índice de Competitividad ({nombrePeriodo(periodo)}) · Pasa el cursor sobre la gráfica para ver el detalle de cada sesión.
        </div>
      </div>
    </div>
  );
};

export const GraficaEntidad = FinancialChart;
export default FinancialChart;
