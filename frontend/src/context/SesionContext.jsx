// Datos compartidos por todas las pantallas:
// - la configuración del taller (comisiones, límites, aviso), pedida una vez
// - la sesión actual: qué comisión, grupo y corpus usa este navegador
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { guardarSesion, leerSesion } from '../utils/almacenamiento';

const SesionContext = createContext(null);
const SEGUNDOS_ANTES_DE_AVISAR = 4;
const SEGUNDOS_REINTENTANDO = 180;
const ESPERA_ENTRE_INTENTOS_MS = 3000;

export function SesionProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [estadoConfig, setEstadoConfig] = useState({ cargando: true, lento: false, error: '' });
  const [sesion, setSesion] = useState(leerSesion);

  // Pide la configuración. Si el servidor tarda, probablemente está
  // despertando (Render gratuito): se avisa y se reintenta solo durante
  // unos minutos, mientras se ve la animación de espera. Mientras Render
  // arranca, el navegador suele ver una falla de red (la página de error de
  // Render no tiene permisos CORS), así que también se reintenta en ese caso.
  const pedirConfig = useCallback(async () => {
    const aviso = setTimeout(() => setEstadoConfig((e) => ({ ...e, lento: true })), SEGUNDOS_ANTES_DE_AVISAR * 1000);
    const inicio = Date.now();
    try {
      for (;;) {
        try {
          setConfig(await api.configTaller());
          setEstadoConfig({ cargando: false, lento: false, error: '' });
          return;
        } catch (error) {
          const conInternet = typeof navigator === 'undefined' || navigator.onLine !== false;
          const reintentable = error.despertando || (error.statusCode === 0 && conInternet);
          if (!reintentable || Date.now() - inicio > SEGUNDOS_REINTENTANDO * 1000) {
            setEstadoConfig({ cargando: false, lento: false, error: error.message });
            return;
          }
          setEstadoConfig((e) => ({ ...e, lento: true }));
          await new Promise((resolver) => setTimeout(resolver, ESPERA_ENTRE_INTENTOS_MS));
        }
      }
    } finally {
      clearTimeout(aviso);
    }
  }, []);

  useEffect(() => {
    pedirConfig();
  }, [pedirConfig]);

  // Botón "Reintentar"
  function cargarConfig() {
    setEstadoConfig({ cargando: true, lento: false, error: '' });
    pedirConfig();
  }

  function iniciarSesion(nueva) {
    guardarSesion(nueva);
    setSesion(nueva);
  }

  function cerrarSesion() {
    guardarSesion(null);
    setSesion(null);
  }

  return (
    <SesionContext.Provider value={{ config, estadoConfig, cargarConfig, sesion, iniciarSesion, cerrarSesion }}>
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error('useSesion debe usarse dentro de un SesionProvider');
  return contexto;
}
