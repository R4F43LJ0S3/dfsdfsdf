import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import logoAlza from '../../assets/logo-alza.png'
import logoAlzaOscuro from '../../assets/logo-alza-oscuro.png'
import Ticker from '../ticker/Ticker'
import BotonTema from '../common/BotonTema'
import './Layout.css'

export default function Layout() {
  const { usuario, logout } = useAuth()
  const nombre = usuario?.nombre ?? usuario?.usuario ?? ''
  const navigate = useNavigate()

  const salir = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      <header className="nav">
        <img src={logoAlza} alt="ALZA" className="nav-logo logo-claro" />
        <img src={logoAlzaOscuro} alt="ALZA" className="nav-logo logo-oscuro" />
        <nav className="nav-links" aria-label="Navegación principal">
          <NavLink to="/dashboard">Tablero</NavLink>
          <NavLink to="/grafica">Gráficas</NavLink>
          <NavLink to="/ranking">Ranking</NavLink>
        </nav>
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
            <button onClick={salir} className="nav-salir">Salir</button>
          </div>
        </div>
      </header>
      <Ticker />
      <main className="contenido"><Outlet /></main>
    </>
  )
}
