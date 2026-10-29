import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logoAlza from '../assets/logo-alza.png';
import logoAlzaOscuro from '../assets/logo-alza-oscuro.png';
import BotonTema from '../components/common/BotonTema';
import '../styles/Login.css';
import { useAuth } from '../context/AuthContext';
import { extraerMensajeError } from '../services/authService';
import {
  LIMITES_CAMPOS,
  SEGURIDAD_LOGIN,
  limitarEntradaIdentificador,
  limitarEntradaPassword,
  validarIdentificadorTiempoReal,
  validarPasswordTiempoReal,
  validarIdentificadorAcceso,
  validarPasswordAcceso,
} from '../constants/validaciones';
import {
  obtenerEstadoIntentos,
  marcarInicioPeticionLogin,
  registrarIntentoFallido,
  limpiarIntentosFallidos,
  formatearTiempoBloqueo,
} from '../utils/controlIntentosLogin';

export const Login = () => {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [errorIdentificador, setErrorIdentificador] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [tocadoIdentificador, setTocadoIdentificador] = useState(false);
  const [tocadoPassword, setTocadoPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [estadoIntentos, setEstadoIntentos] = useState(obtenerEstadoIntentos);

  const refIdentificador = useRef(null);
  const refPassword = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Cuenta regresiva en tiempo real cuando se alcanzan los 10 intentos fallidos
  useEffect(() => {
    if (!estadoIntentos.bloqueado) return undefined;

    const timer = setInterval(() => {
      const actual = obtenerEstadoIntentos();
      setEstadoIntentos(actual);
      if (!actual.bloqueado) {
        setError('');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [estadoIntentos.bloqueado]);

  const handleIdentificadorChange = (e) => {
    const nuevoValor = limitarEntradaIdentificador(e.target.value);
    setIdentificador(nuevoValor);
    if (error) setError('');

    if (!nuevoValor) {
      setErrorIdentificador('');
      setTocadoIdentificador(false);
      return;
    }

    // Marca en rojo al instante si se ingresa un carácter o secuencia no permitida
    const rt = validarIdentificadorTiempoReal(nuevoValor);
    if (!rt.valido) {
      setErrorIdentificador(rt.error);
      return;
    }

    if (tocadoIdentificador) {
      const completo = validarIdentificadorAcceso(nuevoValor);
      setErrorIdentificador(completo.valido ? '' : completo.error);
    } else {
      setErrorIdentificador('');
    }
  };

  const handleIdentificadorBlur = () => {
    if (!identificador) return;
    setTocadoIdentificador(true);
    const completo = validarIdentificadorAcceso(identificador);
    setErrorIdentificador(completo.valido ? '' : completo.error);
  };

  const handlePasswordChange = (e) => {
    const nuevoValor = limitarEntradaPassword(e.target.value);
    setPassword(nuevoValor);
    if (error) setError('');

    if (!nuevoValor) {
      setErrorPassword('');
      setTocadoPassword(false);
      return;
    }

    // Marca en rojo al instante si se ingresa un símbolo prohibido o espacio
    const rt = validarPasswordTiempoReal(nuevoValor);
    if (!rt.valido) {
      setErrorPassword(rt.error);
      return;
    }

    if (tocadoPassword) {
      const completo = validarPasswordAcceso(nuevoValor);
      setErrorPassword(completo.valido ? '' : completo.error);
    } else {
      setErrorPassword('');
    }
  };

  const handlePasswordBlur = () => {
    if (!password) return;
    setTocadoPassword(true);
    const completo = validarPasswordAcceso(password);
    setErrorPassword(completo.valido ? '' : completo.error);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cargando) return;

    const revisionActual = obtenerEstadoIntentos();
    setEstadoIntentos(revisionActual);

    if (revisionActual.bloqueado) {
      setError(
        `Has alcanzado el límite de ${SEGURIDAD_LOGIN.MAX_INTENTOS} intentos. Espera ${formatearTiempoBloqueo(revisionActual.segundosRestantes)} para volver a intentar.`,
      );
      return;
    }

    if (revisionActual.enCooldown) {
      return;
    }

    // Validación completa por campo antes de consultar al servidor
    const valUsuario = validarIdentificadorAcceso(identificador);
    const valPass = validarPasswordAcceso(password);

    setTocadoIdentificador(true);
    setTocadoPassword(true);
    setErrorIdentificador(valUsuario.valido ? '' : valUsuario.error);
    setErrorPassword(valPass.valido ? '' : valPass.error);

    if (!valUsuario.valido) {
      refIdentificador.current?.focus();
      return;
    }

    if (!valPass.valido) {
      refPassword.current?.focus();
      return;
    }

    setError('');
    setCargando(true);
    marcarInicioPeticionLogin();

    try {
      await login(identificador, password);
      limpiarIntentosFallidos();
      setEstadoIntentos(obtenerEstadoIntentos());
      navigate(location.state?.desde ?? '/dashboard', { replace: true });
    } catch (err) {
      const esErrorRed = !err?.response && err?.message !== 'Credenciales inválidas';
      if (esErrorRed) {
        setError(extraerMensajeError(err, 'No se pudo conectar con el servidor.'));
      } else {
        const nuevoEstado = registrarIntentoFallido();
        setEstadoIntentos(nuevoEstado);

        if (nuevoEstado.bloqueado) {
          setError(
            `Cuenta bloqueada temporalmente tras ${SEGURIDAD_LOGIN.MAX_INTENTOS} intentos fallidos. Intenta de nuevo en ${formatearTiempoBloqueo(nuevoEstado.segundosRestantes)}.`,
          );
        } else {
          const baseMsg = extraerMensajeError(err, 'Usuario o contraseña incorrectos.');
          const avisoRestantes =
            nuevoEstado.fallos >= SEGURIDAD_LOGIN.UMBRAL_ADVERTENCIA
              ? ` (Quedan ${nuevoEstado.intentosRestantes} ${nuevoEstado.intentosRestantes === 1 ? 'intento' : 'intentos'}).`
              : '';
          setError(`${baseMsg}${avisoRestantes}`);
        }
      }
    } finally {
      setCargando(false);
    }
  };

  const deshabilitado = cargando || estadoIntentos.bloqueado;

  return (
    <div className="login-container">
      <BotonTema className="tema-flotante" />
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
          <img src={logoAlza} alt="Logo ALZA" className="login-logo-img logo-claro" />
          <img src={logoAlzaOscuro} alt="Logo ALZA" className="login-logo-img logo-oscuro" />

          <h2 className="login-card-title">Iniciar sesión</h2>
          <p className="login-card-subtitle">Ingresa con tu correo o usuario del sistema.</p>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="login-field-group">
              <div className="login-label-row">
                <label
                  htmlFor="login-identificador"
                  className={`login-label ${errorIdentificador ? 'login-label-error' : ''}`}
                >
                  Usuario o correo
                </label>
                {identificador.length >= LIMITES_CAMPOS.EMAIL_MAX - 20 && (
                  <span className="login-char-count mono-num">
                    {identificador.length}/{LIMITES_CAMPOS.EMAIL_MAX}
                  </span>
                )}
              </div>
              <input
                ref={refIdentificador}
                id="login-identificador"
                type="text"
                inputMode="email"
                placeholder="ej: analista@siftc.edu.co o analista"
                value={identificador}
                onChange={handleIdentificadorChange}
                onBlur={handleIdentificadorBlur}
                maxLength={LIMITES_CAMPOS.EMAIL_MAX}
                className={`login-input ${errorIdentificador ? 'login-input-error' : ''}`}
                aria-invalid={Boolean(errorIdentificador)}
                aria-describedby={errorIdentificador ? 'login-identificador-error' : undefined}
                autoComplete="username"
                spellCheck={false}
                disabled={deshabilitado}
                required
              />
              {errorIdentificador && (
                <p id="login-identificador-error" className="login-field-error" role="alert">
                  {errorIdentificador}
                </p>
              )}
            </div>

            <div className="login-field-group">
              <div className="login-label-row">
                <label
                  htmlFor="login-password"
                  className={`login-label ${errorPassword ? 'login-label-error' : ''}`}
                >
                  Contraseña
                </label>
                {password.length >= LIMITES_CAMPOS.PASSWORD_MAX - 12 && (
                  <span className="login-char-count mono-num">
                    {password.length}/{LIMITES_CAMPOS.PASSWORD_MAX}
                  </span>
                )}
              </div>
              <div className="login-input-password-wrapper">
                <input
                  ref={refPassword}
                  id="login-password"
                  type={mostrarPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  maxLength={LIMITES_CAMPOS.PASSWORD_MAX}
                  className={`login-input ${errorPassword ? 'login-input-error' : ''}`}
                  aria-invalid={Boolean(errorPassword)}
                  aria-describedby={errorPassword ? 'login-password-error' : undefined}
                  autoComplete="current-password"
                  disabled={deshabilitado}
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="login-toggle-eye"
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  disabled={deshabilitado}
                  tabIndex={-1}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
              {errorPassword && (
                <p id="login-password-error" className="login-field-error" role="alert">
                  {errorPassword}
                </p>
              )}
            </div>

            {estadoIntentos.bloqueado ? (
              <div className="login-lockout" role="alert" aria-live="assertive">
                <strong>Acceso bloqueado temporalmente ({SEGURIDAD_LOGIN.MAX_INTENTOS}/{SEGURIDAD_LOGIN.MAX_INTENTOS} intentos)</strong>
                <span>
                  Por protección del sistema financiero, espera{' '}
                  <strong className="mono-num">{formatearTiempoBloqueo(estadoIntentos.segundosRestantes)}</strong>{' '}
                  para volver a intentar.
                </span>
              </div>
            ) : (
              error && <p className="login-error" role="alert">{error}</p>
            )}

            <button type="submit" className="login-submit-btn" disabled={deshabilitado}>
              {estadoIntentos.bloqueado
                ? `Bloqueado (${formatearTiempoBloqueo(estadoIntentos.segundosRestantes)})`
                : cargando
                ? 'Ingresando…'
                : 'Ingresar'}
            </button>
          </form>

          <p className="login-footer-text">
            Acceso solo para personal autorizado. Si no tienes cuenta, pídela al administrador.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
