// Estado de la conversación de un grupo con un corpus: la carga del
// navegador, la guarda en cada cambio y envía los mensajes al backend.
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import {
  almacenamientoDisponible,
  borrarConversacion,
  guardarConversacion,
  leerConversacion,
  nuevaConversacion,
} from '../utils/almacenamiento';
import { estadoFases } from '../utils/fases';

// Mensajes que viajan en cada pedido. El backend usa los últimos 20 para
// Gemini y el resto para verificar las fases.
const MENSAJES_POR_PEDIDO = 40;

function nuevoId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useConversacion(sesion, corpus, limites) {
  const [conversacion, setConversacion] = useState(
    () => leerConversacion(sesion) || nuevaConversacion(sesion, corpus?.titulo)
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState(almacenamientoDisponible);

  // Guarda en el navegador cada vez que cambia algo. El resultado (se pudo o
  // no guardar) viene del almacenamiento externo: por eso se actualiza acá.
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    setGuardado(guardarConversacion(conversacion));
  }, [conversacion]);

  const fases = useMemo(
    () => estadoFases(conversacion.mensajes, limites, conversacion.comparacion),
    [conversacion.mensajes, conversacion.comparacion, limites]
  );

  const maxGuardados = limites.maxMensajesGuardados;
  const historialLleno = conversacion.mensajes.length >= maxGuardados - 1;
  const historialCasiLleno = conversacion.mensajes.length >= Math.floor(maxGuardados * 0.8);

  // Devuelve true si el asistente respondió. Si falla, el mensaje se saca del
  // historial para que el grupo lo pueda reenviar.
  async function enviar(texto, { incluirImagenes = false, comparacion = false } = {}) {
    const contenido = texto.trim();
    if (!contenido || enviando || historialLleno) return false;

    const pasaAComparacion = comparacion || conversacion.comparacion;
    const mensajeGrupo = {
      id: nuevoId(),
      rol: 'estudiante',
      contenido,
      hora: new Date().toISOString(),
      pidioImagenes: incluirImagenes,
      pidioComparacion: comparacion,
    };
    const mensajes = [...conversacion.mensajes, mensajeGrupo];

    setError('');
    setEnviando(true);
    setConversacion((c) => ({ ...c, mensajes }));

    try {
      const r = await api.chat({
        comision: sesion.comision,
        grupo: sesion.grupo,
        corpusId: sesion.corpusId,
        mensajes: mensajes.slice(-MENSAJES_POR_PEDIDO).map(({ rol, contenido: c }) => ({ rol, contenido: c })),
        incluirImagenes,
        comparacion: pasaAComparacion,
      });
      const respuesta = {
        id: nuevoId(),
        rol: 'tutor',
        contenido: r.respuesta,
        hora: new Date().toISOString(),
        fase: r.fase,
        fuentes: r.fuentes || [],
        imagenesIncluidas: Boolean(r.imagenesIncluidas),
        modelo: r.modelo,
        truncada: Boolean(r.truncada),
      };
      setConversacion((c) => ({
        ...c,
        corpusTitulo: c.corpusTitulo || corpus?.titulo || '',
        comparacion: pasaAComparacion,
        mensajes: [...c.mensajes.map((m) => (m.id === mensajeGrupo.id ? { ...m, fase: r.fase } : m)), respuesta],
      }));
      return true;
    } catch (e) {
      setConversacion((c) => ({ ...c, mensajes: c.mensajes.filter((m) => m.id !== mensajeGrupo.id) }));
      setError(e.message);
      return false;
    } finally {
      setEnviando(false);
    }
  }

  function reiniciar() {
    borrarConversacion(sesion);
    setConversacion(nuevaConversacion(sesion, corpus?.titulo));
    setError('');
  }

  function actualizar(cambios) {
    setConversacion((c) => ({ ...c, ...cambios }));
  }

  return {
    conversacion,
    fases,
    enviando,
    error,
    limpiarError: () => setError(''),
    guardado,
    historialLleno,
    historialCasiLleno,
    enviar,
    reiniciar,
    actualizar,
  };
}
