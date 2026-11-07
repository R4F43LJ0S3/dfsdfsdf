import { useSearchParams } from 'react-router-dom'
import { Users, SlidersHorizontal, ShieldCheck } from 'lucide-react'
import UsuariosAdmin from '../components/Admin/UsuariosAdmin'
import PesosAdmin from '../components/Admin/PesosAdmin'
import { API_BASE_URL } from '../services/api'
import '../components/Admin/Admin.css'

// HU-FE-07 Usuarios, roles y parámetros
// Gestión de usuarios, roles y parámetros para el rol Administrador.

const PESTANAS = [
  { id: 'usuarios', titulo: 'Usuarios y roles', icono: Users },
  { id: 'parametros', titulo: 'Parámetros', icono: SlidersHorizontal },
]

export default function Administracion() {
  const [params, setParams] = useSearchParams()
  const activa = PESTANAS.some((p) => p.id === params.get('pestana')) ? params.get('pestana') : 'usuarios'

  const elegir = (id) => setParams(id === 'usuarios' ? {} : { pestana: id }, { replace: true })

  const alTeclado = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const i = PESTANAS.findIndex((p) => p.id === activa)
    const siguiente = PESTANAS[(i + (e.key === 'ArrowRight' ? 1 : PESTANAS.length - 1)) % PESTANAS.length]
    elegir(siguiente.id)
    document.getElementById(`adm-tab-${siguiente.id}`)?.focus()
  }

  return (
    <div className="adm">
      <header className="adm-cabecera">
        <span className="adm-cabecera-icono" aria-hidden="true"><ShieldCheck size={26} /></span>
        <div>
          <h1 className="adm-titulo">Administración</h1>
          <p className="adm-texto-suave">Gestiona usuarios, roles y parámetros del sistema.</p>
        </div>
      </header>

      <div className="adm-pestanas" role="tablist" aria-label="Secciones de administración" onKeyDown={alTeclado}>
        {PESTANAS.map(({ id, titulo, icono: Icono }) => (
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

      <p className="adm-conexion">
        <span className="adm-punto" aria-hidden="true" /> Conectado al backend: <code>{API_BASE_URL}</code>
      </p>

      <div id={`adm-panel-${activa}`} role="tabpanel" aria-labelledby={`adm-tab-${activa}`}>
        {activa === 'usuarios' ? <UsuariosAdmin /> : <PesosAdmin />}
      </div>
    </div>
  )
}
