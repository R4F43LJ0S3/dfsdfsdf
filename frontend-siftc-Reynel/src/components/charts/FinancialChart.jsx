import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, AreaSeries } from 'lightweight-charts';
import { mockOhlcData } from '../../services/mocks/ohlcMocks';
import './FinancialChart.css';

const PALETTE = {
  azulNoche: '#151D33',
  azulAcero: '#264E7A',
  verdeAlza: '#24A460',
  rojoBajada: '#D9534F',
  textoGris: '#5A6375'
};

export const FinancialChart = ({ entidadNombre = 'Entidad Beta', ticker = 'ENT-02' }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  const [tipoGrafica, setTipoGrafica] = useState('velas');
  const [periodo, setPeriodo] = useState('1M');
  const [hoverData, setHoverData] = useState(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: '#FFFFFF' },
        textColor: PALETTE.textoGris,
      },
      grid: {
        vertLines: { color: '#F1F5F9' },
        horzLines: { color: '#F1F5F9' },
      },
      rightPriceScale: { borderColor: '#E2E8F0' },
      timeScale: { borderColor: '#E2E8F0', timeVisible: true, rightOffset: 2 }, // para que no se corte la ultima fecha
      crosshair: {
        vertLine: { color: PALETTE.azulAcero, labelBackgroundColor: PALETTE.azulNoche },
        horzLine: { color: PALETTE.azulAcero, labelBackgroundColor: PALETTE.azulNoche },
      },
    });

    chartRef.current = chart;

    if (tipoGrafica === 'velas') {
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: PALETTE.verdeAlza,
        downColor: PALETTE.rojoBajada,
        borderUpColor: PALETTE.verdeAlza,
        borderDownColor: PALETTE.rojoBajada,
        wickUpColor: PALETTE.verdeAlza,
        wickDownColor: PALETTE.rojoBajada,
      });
      candlestickSeries.setData(mockOhlcData);
    } else {
      const areaSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(38, 78, 122, 0.35)',
        bottomColor: 'rgba(38, 78, 122, 0.0)',
        lineColor: PALETTE.azulAcero,
        lineWidth: 2,
      });
      const lineData = mockOhlcData.map(item => ({ time: item.time, value: item.close }));
      areaSeries.setData(lineData);
    }

    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || param.point.x < 0 || param.point.y < 0) {
        setHoverData(null);
        return;
      }
      const dataPoint = mockOhlcData.find((d) => d.time === param.time);
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
  }, [tipoGrafica]);

  const handlePeriodoChange = (nuevoPeriodo) => {
    setPeriodo(nuevoPeriodo);
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  const ultimoDato = mockOhlcData[mockOhlcData.length - 1];
  const datoMostrar = hoverData || ultimoDato;

  return (
    <div className="grafica-wrapper">
      <div className="grafica-card-container">
        
        {/* Cabecera superior idéntica al Mockup */}
        <div className="grafica-header-top">
          <div>
            <div className="grafica-breadcrumb">Gráficas / {entidadNombre}</div>
            <div className="grafica-title-row">
              <h1 className="grafica-title">{entidadNombre}</h1>
              <span className="grafica-ticker">{ticker}</span>
              <span className="grafica-badge-finanzas">Finanzas</span>
            </div>
          </div>

          <div className="grafica-header-right-group">
            <div className="grafica-entidad-selector-wrapper">
              <span className="grafica-selector-label">Entidad</span>
              <select className="grafica-select-entidad" defaultValue="ENT-02">
                <option value="ENT-01">Entidad Alfa · ENT-01</option>
                <option value="ENT-02">Entidad Beta · ENT-02</option>
                <option value="ENT-03">Entidad Gamma · ENT-03</option>
              </select>
            </div>

            <div className="grafica-price-display-box">
              <span className="grafica-main-value">78,5</span>
              <span className="grafica-main-change">▲ +1,55 %</span>
            </div>
          </div>
        </div>

        {/* Fila de controles (Velas/Línea y Periodos) */}
        <div className="grafica-controls-row">
          <div className="grafica-type-toggle">
            <button
              onClick={() => setTipoGrafica('velas')}
              className={`grafica-toggle-btn ${tipoGrafica === 'velas' ? 'active' : ''}`}
            >
              Velas
            </button>
            <button
              onClick={() => setTipoGrafica('linea')}
              className={`grafica-toggle-btn ${tipoGrafica === 'linea' ? 'active' : ''}`}
            >
              Línea
            </button>
          </div>

          <div className="grafica-period-group">
            {['1D', '1S', '1M', '1A', 'Máx.'].map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodoChange(p)}
                className={`grafica-period-btn ${periodo === p ? 'active' : ''}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Lienzo de la Gráfica */}
        <div ref={chartContainerRef} style={{ width: '100%', borderRadius: '12px', overflow: 'hidden' }} />

        {/* Tarjetas inferiores OHLC idénticas al mockup */}
        <div className="grafica-cards-grid">
          <div className="grafica-stat-card">
            <span className="grafica-stat-label">Fecha</span>
            <strong className="grafica-stat-value">{datoMostrar?.time}</strong>
          </div>
          <div className="grafica-stat-card">
            <span className="grafica-stat-label">Apertura</span>
            <strong className="grafica-stat-value">{datoMostrar?.open?.toFixed(1)}</strong>
          </div>
          <div className="grafica-stat-card">
            <span className="grafica-stat-label">Máximo</span>
            <strong className="grafica-stat-value">{datoMostrar?.high?.toFixed(1)}</strong>
          </div>
          <div className="grafica-stat-card">
            <span className="grafica-stat-label">Mínimo</span>
            <strong className="grafica-stat-value">{datoMostrar?.low?.toFixed(1)}</strong>
          </div>
          <div className="grafica-stat-card">
            <span className="grafica-stat-label">Cierre del día</span>
            <div className="grafica-stat-val-row">
              <strong className="grafica-stat-value">{datoMostrar?.close?.toFixed(1)}</strong>
              <span className="grafica-stat-change-tag">▲ +1,55 %</span>
            </div>
          </div>
        </div>

        <div className="grafica-footer-note">
          Datos de ejemplo · Serie diaria del Índice de Competitividad · Pasa el cursor sobre la gráfica para ver el detalle de cada día.
        </div>

      </div>
    </div>
  );
};

export const GraficaEntidad = FinancialChart;
export default FinancialChart;