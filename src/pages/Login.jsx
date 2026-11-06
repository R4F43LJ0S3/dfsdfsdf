import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logoAlzaOscuro from '../assets/logo-alza-oscuro.png';
import logoHorizontal from '../assets/logo-alza-horizontal.png';
import { Mail, Lock, ArrowRight, ChartLine, ChartColumnIncreasing, FileSearch, CircleCheck } from 'lucide-react';
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

// Puntos con check debajo del texto principal
const BENEFICIOS = [
  'Información actualizada y confiable',
  'Gráficas interactivas y rankings',
  'Toma decisiones con datos reales',
];

// Tres bloques de la parte de abajo del panel izquierdo
const CARACTERISTICAS = [
  { icono: ChartLine, titulo: 'Índice de competitividad', texto: 'Mide el desempeño de 0 a 100 para cada entidad.' },
  { icono: ChartColumnIncreasing, titulo: 'Gráficas y rankings', texto: 'Visualiza el comportamiento por sector, dimensión y periodo.' },
  { icono: FileSearch, titulo: 'Origen y método', texto: 'Cada valor publicado incluye su origen y regla de cálculo.' },
];

// Llave para recordar solo el usuario (nunca la contrasena) en este navegador
const LLAVE_USUARIO_RECORDADO = 'alza_usuario_recordado';

const leerUsuarioRecordado = () => {
  try {
    return localStorage.getItem(LLAVE_USUARIO_RECORDADO) || '';
  } catch {
    return '';
  }
};

export const Login = () => {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [identificador, setIdentificador] = useState(leerUsuarioRecordado);
  const [recordar, setRecordar] = useState(() => Boolean(leerUsuarioRecordado()));
  const [mostrarAyuda, setMostrarAyuda] = useState(false);
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
      try {
        if (recordar) localStorage.setItem(LLAVE_USUARIO_RECORDADO, identificador.trim());
        else localStorage.removeItem(LLAVE_USUARIO_RECORDADO);
      } catch {
        // Si el navegador no deja guardar, solo se ignora
      }
      setEstadoIntentos(obtenerEstadoIntentos());
      navigate(location.state?.desde ?? '/dashboard', { replace: true });
    } catch (err) {
      console.error('[Login] Error en autenticación:', err);
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

  // Los botones del panel izquierdo guardan a donde ir despues de iniciar sesion
  const irDespuesDeLogin = (ruta) => {
    navigate('/login', { replace: true, state: { desde: ruta } });
    refIdentificador.current?.focus();
  };

  const destinoPendiente =
    location.state?.desde === '/ranking'
      ? 'los rankings'
      : location.state?.desde === '/dashboard'
      ? 'las entidades'
      : '';

  const deshabilitado = cargando || estadoIntentos.bloqueado;

  return (
    <div className="login-container">
      {/* Panel izquierdo: presentacion sobre la imagen */}
      <section className="login-hero">
        <div className="login-hero-arriba">
          <img src={logoAlzaOscuro} alt="ALZA · Compara, decide, avanza" className="login-hero-logo" />
        </div>

        <div className="login-hero-centro">
          <h1 className="login-title">
            Datos trazables.<br />
            Entidades que <span className="login-title-acento">cotizan.</span>
          </h1>

          <p className="login-hero-texto">
            Consulta, compara y sigue el desempeño de las entidades del sistema financiero en tiempo real.
          </p>

          <ul className="login-beneficios">
            {BENEFICIOS.map((texto) => (
              <li key={texto}>
                <CircleCheck size={20} aria-hidden="true" />
                {texto}
              </li>
            ))}
          </ul>

          <div className="login-hero-botones">
            <button type="button" className="login-btn-principal" onClick={() => irDespuesDeLogin('/dashboard')}>
              Explorar entidades
            </button>
            <button type="button" className="login-btn-borde" onClick={() => irDespuesDeLogin('/ranking')}>
              Ver rankings
            </button>
          </div>
        </div>

        <ul className="login-features">
          {CARACTERISTICAS.map(({ icono: Icono, titulo, texto }) => (
            <li className="login-feature-item" key={titulo}>
              <span className="login-feature-icono" aria-hidden="true"><Icono size={30} strokeWidth={1.5} /></span>
              <div>
                <strong className="login-feature-titulo">{titulo}</strong>
                <p className="login-feature-text">{texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Panel derecho: formulario en tema claro */}
      <section className="login-panel-form">
        <div className="login-form-caja">
          <img src={logoHorizontal} alt="Logo ALZA" className="login-logo-img" />

          <h2 className="login-card-title">Iniciar sesión</h2>
          <p className="login-card-subtitle">Ingresa con tu correo o usuario del sistema.</p>

          {destinoPendiente && (
            <p className="login-aviso" role="status">
              Inicia sesión para ver {destinoPendiente}.
            </p>
          )}

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
              <div className="login-input-wrap">
                <span className="login-input-icono" aria-hidden="true"><Mail size={18} /></span>
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
              </div>
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
              <div className="login-input-password-wrapper login-input-wrap">
                <span className="login-input-icono" aria-hidden="true"><Lock size={18} /></span>
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

            <div className="login-opciones">
              <label className="login-recordar">
                <input
                  type="checkbox"
                  checked={recordar}
                  onChange={(e) => setRecordar(e.target.checked)}
                  disabled={deshabilitado}
                />
                <span>Recordarme</span>
              </label>
              <button
                type="button"
                className="login-olvido"
                onClick={() => setMostrarAyuda((v) => !v)}
                aria-expanded={mostrarAyuda}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {mostrarAyuda && (
              <p className="login-ayuda" role="status">
                Por seguridad, el restablecimiento de contraseña lo hace el administrador del sistema. Escríbele para que te asigne una nueva.
              </p>
            )}

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
                : (
                <>
                  Ingresar <ArrowRight size={18} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="login-footer-text">
            Acceso solo para personal autorizado.<br />
            Si no tienes cuenta, pídela al administrador.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Login;
