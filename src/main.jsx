import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import './styles/tema.css'
import App from './App.jsx'
import { despertarBackend } from './services/api'

// Render (plan gratuito) duerme el servicio tras ~15 min sin tráfico. Se le pega a /health
// apenas carga la app para que la instancia ya esté despierta cuando el usuario envíe el login.
// No bloquea el render: si falla, el error se verá en la petición real.
despertarBackend()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
