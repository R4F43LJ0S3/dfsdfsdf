import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

function temaInicial() {
  try {
    const guardado = localStorage.getItem('tema')
    if (guardado === 'dark' || guardado === 'light') return guardado
  } catch { /* sin almacenamiento: se usa la preferencia del sistema */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(temaInicial)

  useEffect(() => {
    document.documentElement.dataset.theme = tema
    try { localStorage.setItem('tema', tema) } catch { /* ignorar */ }
  }, [tema])

  const alternar = () => setTema((t) => (t === 'dark' ? 'light' : 'dark'))

  return <ThemeContext.Provider value={{ tema, alternar }}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTema = () => useContext(ThemeContext)
