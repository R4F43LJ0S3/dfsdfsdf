import { PlugZap } from 'lucide-react'

// Aviso cuando el backend aún no publica una ruta que esta pantalla necesita.
// No se muestran datos inventados: se indica exactamente qué ruta falta en el backend.
export default function RutaPendiente({ texto, rutas = [] }) {
  return (
    <div className="adm-pendiente" role="status">
      <span className="adm-pendiente-icono" aria-hidden="true"><PlugZap size={22} /></span>
      <div>
        <strong>Pendiente del backend</strong>
        <p>{texto}</p>
        <ul>
          {rutas.map((r) => <li key={r}><code>{r}</code></li>)}
        </ul>
      </div>
    </div>
  )
}
