import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext';
import logoAlza from '../../assets/logo-alza.png'
import './Layout.css'
import Ticker from '../ticker/Ticker'

export default function Layout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  const salir = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      <header className="nav">
        <img src={logoAlza} alt="ALZA" className="nav-logo" />
        <nav className="nav-links">
          <NavLink to="/dashboard">Tablero</NavLink>
          <NavLink to="/grafica">Gráficas</NavLink>
          <NavLink to="/ranking">Ranking</NavLink>
        </nav>
        <div className="nav-user">
          <span className="nav-avatar">{usuario?.nombre?.[0]?.toUpperCase()}</span>
          <span>{usuario?.nombre}<small>{usuario?.rol}</small></span>
          <button onClick={salir} className="nav-salir">Salir</button>
        </div>
      </header>
      <Ticker />
      <main className="contenido"><Outlet /></main>
    </>
  )
}