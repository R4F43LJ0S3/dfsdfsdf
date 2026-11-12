import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, SlidersHorizontal, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { puedeGestionarUsuarios, puedeLeerParametros } from '../constants/permisos'
import UsuariosAdmin from '../components/Admin/UsuariosAdmin'
import PesosAdmin from '../components/Admin/PesosAdmin'
import '../components/Admin/Admin.css'

// HU-FE-07 Matriz de permisos por rol y sensibilidad del dato
// - Usuarios y roles: Sensibilidad Restringida (solo Administrador)
// - Parámetros: Sensibilidad Interna (Administrador y Analista E, Auditor L)

const TODAS_PESTANAS = [
  { id: 'usuarios', titulo: 'Usuarios y roles', icono: Users, permiso: puedeGestionarUsuarios },
  { id: 'parametros', titulo: 'Parámetros', icono: SlidersHorizontal, permiso: puedeLeerParametros },
]

export default function Administracion() {
  const { usuario } = useAuth()
  const [params, setParams] = useSearchParams()

  const pestanasVisibles = useMemo(
    () => TODAS_PESTANAS.filter((p) => p.permiso(usuario)),
    [usuario],
  )

  const pestanaDefecto = pestanasVisibles[0]?.id ?? 'parametros'
  const pestanaUrl = params.get('pestana')
  const activa = pestanasVisibles.some((p) => p.id === pestanaUrl) ? pestanaUrl : pestanaDefecto

  const elegir = (id) => setParams(id === pestanaDefecto ? {} : { pestana: id }, { replace: true })

  const alTeclado = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const i = pestanasVisibles.findIndex((p) => p.id === activa)
    const siguiente = pestanasVisibles[(i + (e.key === 'ArrowRight' ? 1 : pestanasVisibles.length - 1)) % pestanasVisibles.length]
    elegir(siguiente.id)
    document.getElementById(`adm-tab-${siguiente.id}`)?.focus()
  }

  return (
    <div className="adm">
      <header className="adm-cabecera">
        <span className="adm-cabecera-icono" aria-hidden="true"><ShieldCheck size={26} /></span>
        <div>
          <h1 className="adm-titulo">Administración</h1>
        </div>
      </header>

      {pestanasVisibles.length > 1 && (
        <div className="adm-pestanas" role="tablist" aria-label="Secciones de administración" onKeyDown={alTeclado}>
          {pestanasVisibles.map(({ id, titulo, icono: Icono }) => (
            <button
              key={id}
              id={`adm-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={activa === id}
              aria-controls={`adm-panel-${id}`}
              tabIndex={activa === id ? 0 : -1}
              className={`adm-pestana ${activa === id ? 'activa' : ''}`}
              onClick={() => elegir(id)}
            >
              <Icono size={18} aria-hidden="true" /> {titulo}
            </button>
          ))}
        </div>
      )}

      <div id={`adm-panel-${activa}`} role="tabpanel" aria-labelledby={`adm-tab-${activa}`}>
        {activa === 'usuarios' && puedeGestionarUsuarios(usuario) && <UsuariosAdmin />}
        {activa === 'parametros' && puedeLeerParametros(usuario) && <PesosAdmin />}
      </div>
    </div>
  )
}
