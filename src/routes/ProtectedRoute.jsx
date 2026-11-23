import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
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
      <section className="acceso-restringido-card" role="alert">
        <div className="acceso-restringido-icono" aria-hidden="true">
          <ShieldAlert size={22} />
        </div>
        <h2>Acceso restringido</h2>
        <p>
          Tu perfil actual ({usuario.rol}) no tiene permisos para acceder a este recurso.
        </p>
        <Link to="/dashboard" className="acceso-restringido-btn">
          Volver al tablero
        </Link>
      </section>
    )
  }

  return <Outlet />
}
