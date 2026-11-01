// Si hay mensajes sin exportar, el navegador pide confirmación antes de
// cerrar la pestaña o recargar (el texto del aviso lo pone el navegador).
import { useEffect } from 'react';

export function useAvisoSalida(activo) {
  useEffect(() => {
    if (!activo) return undefined;
    const avisar = (evento) => {
      evento.preventDefault();
      evento.returnValue = '';
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [activo]);
}
