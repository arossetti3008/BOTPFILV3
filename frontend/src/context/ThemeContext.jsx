// Alternancia claro/oscuro (de Nódos). Se recuerda en localStorage; si no
// hay preferencia guardada, se usa la del sistema operativo.
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const CLAVE_TEMA = 'botpfilv3_tema';

function temaInicial() {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA);
    if (guardado === 'dark' || guardado === 'light') return guardado;
  } catch {
    // localStorage no disponible (modo privado): se usa el del sistema
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema);
    try {
      localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
      // sin almacenamiento: el tema vale solo para esta visita
    }
  }, [tema]);

  function alternarTema() {
    setTema((actual) => (actual === 'dark' ? 'light' : 'dark'));
  }

  return <ThemeContext.Provider value={{ tema, alternarTema }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const contexto = useContext(ThemeContext);
  if (!contexto) throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  return contexto;
}
