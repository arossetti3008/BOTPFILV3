// Pantalla de análisis: corpus, dimensiones y bibliografía a un lado; fases,
// chat y acciones al otro (una sola columna en celular).
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api/client';
import Bibliografia from '../components/Bibliografia';
import Chat from '../components/Chat';
import CorpusVisor from '../components/CorpusVisor';
import Dimensiones from '../components/Dimensiones';
import EstadoServidor from '../components/EstadoServidor';
import Fases from '../components/Fases';
import { useSesion } from '../context/SesionContext';
import { useConversacion } from '../hooks/useConversacion';
import { claveConversacion } from '../utils/almacenamiento';
import { motivoBloqueo } from '../utils/fases';

const TEXTO_PEDIR_IMAGENES = 'Queremos tus observaciones sobre las imágenes, para contrastarlas con nuestra lectura.';
const TEXTO_PASAR_A_COMPARACION = 'Ya trabajamos cada imagen. Queremos pasar a la comparación entre las tres.';

function AreaAnalisis({ sesion, corpus, limites }) {
  const {
    conversacion,
    fases,
    enviando,
    error,
    limpiarError,
    guardado,
    historialLleno,
    historialCasiLleno,
    enviar,
  } = useConversacion(sesion, corpus, limites);
  const [texto, setTexto] = useState('');

  // Envía el texto escrito (o uno por defecto para los botones especiales).
  // Si falla, el texto vuelve al cuadro para reenviarlo.
  async function enviarTexto(opciones = {}, porDefecto = '') {
    const escrito = texto;
    const contenido = escrito.trim() || porDefecto;
    if (!contenido) return;
    setTexto('');
    const ok = await enviar(contenido, opciones);
    if (!ok) setTexto(escrito);
  }

  const bloqueo = motivoBloqueo(fases);

  return (
    <div className="analisis">
      <div className="analisis-corpus">
        <CorpusVisor corpus={corpus} />
        <Dimensiones />
        <Bibliografia />
      </div>

      <section className="analisis-chat tarjeta" aria-label="Trabajo con el asistente">
        <div className="analisis-cabecera">
          <p className="texto-suave">
            Grupo <strong>{sesion.grupo}</strong>
          </p>
          <p className={`guardado ${guardado ? '' : 'guardado-no'}`} role="status">
            {guardado
              ? 'Guardado en este dispositivo'
              : 'Este navegador no permite guardar: si recargan se pierde la conversación. Exporten seguido.'}
          </p>
        </div>

        <Fases fase={fases.fase} />

        <Chat
          mensajes={conversacion.mensajes}
          enviando={enviando}
          maxCaracteres={limites.maxCaracteresMensaje}
          bloqueado={historialLleno}
          texto={texto}
          onCambiarTexto={(t) => {
            setTexto(t);
            if (error) limpiarError();
          }}
          onEnviar={() => enviarTexto()}
        />

        {error && (
          <p className="mensaje-error" role="alert">
            {error}
          </p>
        )}
        {historialLleno && (
          <p className="mensaje-error" role="alert">
            Llegaron al máximo de mensajes que se pueden guardar en este dispositivo. Exporten la conversación en
            &quot;Terminar y exportar&quot;.
          </p>
        )}
        {!historialLleno && historialCasiLleno && (
          <p className="aviso-suave">La conversación es larga: les recomendamos exportarla pronto.</p>
        )}

        <div className="acciones">
          <div className="accion">
            <button
              type="button"
              className="boton-secundario"
              disabled={!fases.puedeVerImagenes || enviando || historialLleno}
              onClick={() => enviarTexto({ incluirImagenes: true }, TEXTO_PEDIR_IMAGENES)}
            >
              Pedir observaciones del asistente sobre las imágenes
            </button>
            <p className="ayuda">
              {fases.puedeVerImagenes
                ? 'Habilitado: el asistente va a recibir las tres imágenes solo en ese mensaje.'
                : bloqueo}
            </p>
          </div>

          {fases.fase < 3 && (
            <div className="accion">
              <button
                type="button"
                className="boton-secundario"
                disabled={!fases.puedeComparar || enviando || historialLleno}
                onClick={() => enviarTexto({ comparacion: true }, TEXTO_PASAR_A_COMPARACION)}
              >
                Pasar a la comparación
              </button>
              <p className="ayuda">
                {fases.puedeComparar
                  ? 'Cuando hayan trabajado las tres imágenes, pasen a relacionarlas.'
                  : bloqueo}
              </p>
            </div>
          )}
        </div>

        <Link to="/cierre" className="boton-secundario boton-ancho enlace-boton">
          Terminar y exportar →
        </Link>
      </section>
    </div>
  );
}

export default function Analisis() {
  const { config, estadoConfig, cargarConfig, sesion } = useSesion();
  const [corpus, setCorpus] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sesion) return;
    api
      .obtenerCorpus(sesion.corpusId)
      .then(setCorpus)
      .catch((e) => setError(e.message));
  }, [sesion]);

  if (!sesion) return <Navigate to="/" replace />;
  if (!config) return <EstadoServidor estado={estadoConfig} onReintentar={cargarConfig} />;
  if (error) {
    return (
      <div className="tarjeta">
        <p className="mensaje-error">{error}</p>
        <Link to="/">Volver al inicio</Link>
      </div>
    );
  }
  if (!corpus) return <p className="texto-suave">Cargando el corpus…</p>;

  // La key reinicia el estado si cambia el grupo o el corpus
  return <AreaAnalisis key={claveConversacion(sesion)} sesion={sesion} corpus={corpus} limites={config.limites} />;
}
