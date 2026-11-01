import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { tieneRol } from '../constants/roles'

export default function ProtectedRoute({ rolesPermitidos }) {
  const { usuario } = useAuth()
  const location = useLocation()
  const desde = location.pathname + location.search

  if (!usuario) {
    return <Navigate to="/login" replace state={{ desde }} />
  }

  if (rolesPermitidos && rolesPermitidos.length > 0 && !tieneRol(usuario, rolesPermitidos)) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Acceso restringido</h2>
        <p>Tu rol ({usuario.rol}) no tiene autorización para acceder a esta sección.</p>
      </div>
    )
  }

  return <Outlet />
}
