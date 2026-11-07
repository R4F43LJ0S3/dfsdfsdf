import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { tieneRol } from '../constants/roles'

export default function ProtectedRoute({ rolesPermitidos, rol }) {
  const { usuario, estaAutenticado } = useAuth()
  const location = useLocation()
  const desde = location.pathname + location.search

  if (!estaAutenticado || !usuario) {
    return <Navigate to="/login" replace state={{ desde }} />
  }

  const permitidos = rolesPermitidos ?? (rol ? (Array.isArray(rol) ? rol : [rol]) : undefined)

  if (permitidos && permitidos.length > 0 && !tieneRol(usuario, permitidos)) {
    return (
      <div role="alert" style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Acceso restringido</h2>
        <p>Tu rol ({usuario.rol}) no tiene autorización para acceder a esta sección.</p>
        <p><Link to="/dashboard" style={{ fontWeight: 600, textDecoration: 'underline' }}>Volver al tablero</Link></p>
      </div>
    )
  }

  return <Outlet />
}
