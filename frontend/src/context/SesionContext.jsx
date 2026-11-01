// Datos compartidos por todas las pantallas:
// - la configuración del taller (comisiones, límites, aviso), pedida una vez
// - la sesión actual: qué comisión, grupo y corpus usa este navegador
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { guardarSesion, leerSesion } from '../utils/almacenamiento';

const SesionContext = createContext(null);
const SEGUNDOS_ANTES_DE_AVISAR = 4;

export function SesionProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [estadoConfig, setEstadoConfig] = useState({ cargando: true, lento: false, error: '' });
  const [sesion, setSesion] = useState(leerSesion);

  // Pide la configuración. Si el servidor tarda, probablemente está
  // despertando (Render gratuito) y se avisa.
  const pedirConfig = useCallback(async () => {
    const aviso = setTimeout(() => setEstadoConfig((e) => ({ ...e, lento: true })), SEGUNDOS_ANTES_DE_AVISAR * 1000);
    try {
      setConfig(await api.configTaller());
      setEstadoConfig({ cargando: false, lento: false, error: '' });
    } catch (error) {
      setEstadoConfig({ cargando: false, lento: false, error: error.message });
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
