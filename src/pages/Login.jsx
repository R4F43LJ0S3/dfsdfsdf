import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoAlza from '../assets/logo-alza.png';
import { login } from '../services/api';
import '../styles/Login.css';

export const Login = () => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      // Llamada al endpoint real de Render a través de api.js
      const data = await login(usuario, password);

      // Guardamos el token y los datos de usuario exactamente como los pide el interceptor
      if (data && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));

        // Redirigimos al tablero principal de forma exitosa
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      setError('Credenciales inválidas o error de conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-container">
      {/* Panel Izquierdo Oscuro */}
      <div className="login-panel-left">
        <span className="login-tag">SIFTC · PORTAL WEB</span>

        <h1 className="login-title">
          Datos trazables.<br />
          Entidades que<br />
          cotizan.
        </h1>

        <div className="login-features">
          <div className="login-feature-item">
            <span className="login-feature-num">01</span>
            <p className="login-feature-text">
              Índice de Competitividad de 0 a 100 para cada entidad.
            </p>
          </div>
          <div className="login-feature-item">
            <span className="login-feature-num">02</span>
            <p className="login-feature-text">
              Gráficas de velas y ranking por sector, dimensión y periodo.
            </p>
          </div>
          <div className="login-feature-item">
            <span className="login-feature-num">03</span>
            <p className="login-feature-text">
              Cada valor publicado con su origen y su regla de cálculo.
            </p>
          </div>
        </div>
      </div>

      {/* Panel Derecho Claro */}
      <div className="login-panel-right">
        <div className="login-card">
          <img src={logoAlza} alt="Logo ALZA" className="login-logo-img" />

          <h2 className="login-card-title">Iniciar sesión</h2>
          <p className="login-card-subtitle">Ingresa con tu usuario y contraseña del sistema.</p>

          {error && (
            <div style={{ color: '#d9534f', fontSize: '13px', marginBottom: '15px', fontWeight: '500' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field-group">
              <label className="login-label">Usuario</label>
              <input
                type="text"
                placeholder="Escribe tu usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="login-input"
                required
              />
            </div>

            <div className="login-field-group">
              <label className="login-label">Contraseña</label>
              <div className="login-input-password-wrapper">
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  placeholder="Escribe tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="login-toggle-eye"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" className="login-submit-btn" disabled={cargando}>
              {cargando ? 'Validando...' : 'Ingresar'}
            </button>
          </form>

          <footer className="login-footer-text">
            Sistema de Información Financiera de Trazabilidad y Competitividad
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Login;