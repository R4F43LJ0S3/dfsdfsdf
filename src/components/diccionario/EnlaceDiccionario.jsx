import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import './EnlaceDiccionario.css'

// Enlace contextual hacia un término o métrica del Diccionario Oficial (/diccionario?termino=...)
export default function EnlaceDiccionario({
  termino,
  etiqueta = 'Ver en el diccionario',
  compacto = false,
  onClick,
}) {
  if (!termino) return null
  const destino = `/diccionario?termino=${encodeURIComponent(termino)}`

  return (
    <Link
      to={destino}
      className={`dic-enlace ${compacto ? 'dic-enlace-compacto' : ''}`}
      title={`Consultar "${termino}" en el diccionario de datos`}
      aria-label={`Consultar ${termino} en el diccionario de datos`}
      onClick={onClick}
    >
      <BookOpen size={14} aria-hidden="true" />
      {!compacto && <span>{etiqueta}</span>}
    </Link>
  )
}
