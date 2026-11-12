import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import logoAlza from '../../assets/logo-alza.png'
import logoAlzaOscuro from '../../assets/logo-alza-oscuro.png'
import Ticker from '../ticker/Ticker'
import BotonTema from '../common/BotonTema'
import {
  puedeConsultarRanking,
  puedeConsultarComparador,
  puedeConsultarAprobaciones,
  puedeAccederModuloAdministracion,
} from '../../constants/permisos'
import './Layout.css'

export default function Layout() {
  const { usuario, logout } = useAuth()
  const nombre = usuario?.nombre ?? usuario?.usuario ?? ''
  const navigate = useNavigate()
  const location = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [rutaAnterior, setRutaAnterior] = useState(location.pathname)

  // Cierra automáticamente al cambiar de ruta ajustando estado en render (sin efecto en cascada)
  if (rutaAnterior !== location.pathname) {
    setRutaAnterior(location.pathname)
    setMenuAbierto(false)
  }

  // Permisos según la matriz oficial HU-FE-07 CA 1
  const verRanking = puedeConsultarRanking(usuario)
  const verComparador = puedeConsultarComparador(usuario)
  const verAprobaciones = puedeConsultarAprobaciones(usuario)
  const verAdmin = puedeAccederModuloAdministracion(usuario)

  const salir = () => {
    logout()
    navigate('/login')
  }

  // Cierra el menú al presionar Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMenuAbierto(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Bloquea el scroll del body mientras el menú lateral esté abierto
  useEffect(() => {
    if (menuAbierto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuAbierto])

  return (
    <>
      <header className="nav">
        <NavLink to="/dashboard" className="nav-logo-link" aria-label="Inicio">
          <img src={logoAlza} alt="ALZA" className="nav-logo logo-claro" />
          <img src={logoAlzaOscuro} alt="ALZA" className="nav-logo logo-oscuro" />
        </NavLink>

        {/* Navegación de escritorio (> 768px) */}
        <nav className="nav-links" aria-label="Navegación principal">
          <NavLink to="/dashboard">Tablero</NavLink>
          <NavLink to="/grafica">Gráficas</NavLink>
          {verRanking && <NavLink to="/ranking">Ranking</NavLink>}
          {verComparador && <NavLink to="/comparar">Comparar</NavLink>}
          {verAprobaciones && <NavLink to="/aprobaciones">Aprobaciones</NavLink>}
          <NavLink to="/diccionario">Diccionario</NavLink>
          {verAdmin && <NavLink to="/administracion">Administración</NavLink>}
        </nav>

        {/* Acciones de usuario y tema en escritorio (> 768px) */}
        <div className="nav-acciones">
          <BotonTema />
          <div className="nav-user">
            <span className="nav-avatar" title={`${nombre}${usuario?.rol ? ` · ${usuario.rol}` : ''}`}>
              {nombre[0]?.toUpperCase()}
            </span>
            <span className="nav-user-info">
              {nombre}
              <small>{usuario?.rol}</small>
            </span>
            <button onClick={salir} className="nav-salir" type="button">Salir</button>
          </div>
        </div>

        {/* Controles móviles (<= 768px): BotonTema + Hamburguesa */}
        <div className="nav-movil-controles">
          <BotonTema />
          <button
            type="button"
            className="nav-toggle"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
            aria-expanded={menuAbierto}
            aria-label="Menú de navegación"
          >
            {menuAbierto ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </header>

      {/* Backdrop y Panel Lateral (Side Drawer) para móvil/tablet (<= 768px) */}
      {menuAbierto && (
        <>
          <div
            className="nav-backdrop"
            onClick={() => setMenuAbierto(false)}
            aria-hidden="true"
          />
          <aside
            className="nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
          >
            <div className="nav-drawer-header">
              <div className="nav-drawer-logo">
                <img src={logoAlza} alt="ALZA" className="nav-logo logo-claro" />
                <img src={logoAlzaOscuro} alt="ALZA" className="nav-logo logo-oscuro" />
              </div>
              <button
                type="button"
                className="nav-drawer-close"
                onClick={() => setMenuAbierto(false)}
                aria-label="Cerrar menú"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <nav className="nav-drawer-links" aria-label="Navegación móvil">
              <NavLink to="/dashboard" onClick={() => setMenuAbierto(false)}>Tablero</NavLink>
              <NavLink to="/grafica" onClick={() => setMenuAbierto(false)}>Gráficas</NavLink>
              {verRanking && <NavLink to="/ranking" onClick={() => setMenuAbierto(false)}>Ranking</NavLink>}
              {verComparador && <NavLink to="/comparar" onClick={() => setMenuAbierto(false)}>Comparar</NavLink>}
              {verAprobaciones && (
                <NavLink to="/aprobaciones" onClick={() => setMenuAbierto(false)}>
                  Aprobaciones
                </NavLink>
              )}
              <NavLink to="/diccionario" onClick={() => setMenuAbierto(false)}>Diccionario</NavLink>
              {verAdmin && (
                <NavLink to="/administracion" onClick={() => setMenuAbierto(false)}>
                  Administración
                </NavLink>
              )}
            </nav>

            <div className="nav-drawer-footer">
              <div className="nav-user">
                <span className="nav-avatar" title={`${nombre}${usuario?.rol ? ` · ${usuario.rol}` : ''}`}>
                  {nombre[0]?.toUpperCase()}
                </span>
                <span className="nav-user-info">
                  {nombre}
                  <small>{usuario?.rol}</small>
                </span>
              </div>
              <button onClick={salir} className="nav-salir" type="button" aria-label="Cerrar sesión">
                <LogOut size={14} aria-hidden="true" />
                <span>Salir</span>
              </button>
            </div>
          </aside>
        </>
      )}

      <Ticker />
      <main className="contenido"><Outlet /></main>
    </>
  )
}
