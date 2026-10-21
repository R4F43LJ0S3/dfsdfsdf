import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { usuario } = useAuth()
  const location = useLocation()
  // para volver a la misma pagina despues del login
  const desde = location.pathname + location.search
  return usuario ? <Outlet /> : <Navigate to="/login" replace state={{ desde }} />
}