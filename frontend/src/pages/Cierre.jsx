// Pantalla de cierre: resumen, consentimiento, exportación (.txt y .json),
// instrucciones de entrega y borrado de la conversación de este dispositivo.
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useSesion } from '../context/SesionContext';
import { useConversacion } from '../hooks/useConversacion';
import { useAvisoSalida } from '../hooks/useAvisoSalida';
import { claveConversacion, mensajesSinExportar } from '../utils/almacenamiento';
import { descargarArchivo, generarJson, generarTxt, nombreArchivo } from '../utils/exportar';
import EstadoServidor from '../components/EstadoServidor';
import Markdown from '../components/Markdown';

const TEXTO_CONSENTIMIENTO = 'Autorizamos el uso anónimo de esta conversación para documentar la experiencia en la Diplomatura.';

function AreaCierre({ sesion, config, onSalir }) {
  const { conversacion, reiniciar, actualizar } = useConversacion(sesion, null, config.limites);
  const sinExportar = mensajesSinExportar(conversacion);
  const hayMensajes = conversacion.mensajes.length > 0;
  const nombreComision = config.comisiones.find((c) => c.id === sesion.comision)?.nombre;

  useAvisoSalida(sinExportar > 0);

  function exportar(formato) {
    const ahora = new Date().toISOString();
    const opciones = { fechaExportacion: ahora, nombreComision };
    const contenido = formato === 'txt' ? generarTxt(conversacion, opciones) : generarJson(conversacion, opciones);
    descargarArchivo(
      contenido,
      nombreArchivo(conversacion, ahora, formato),
      formato === 'txt' ? 'text/plain' : 'application/json'
    );
    actualizar({ mensajesExportados: conversacion.mensajes.length });
  }

  function borrar() {
    const aviso =
      sinExportar > 0
        ? `Hay ${sinExportar} mensajes que todavía no exportaron. Si borran, se pierden. ¿Borrar la conversación de este dispositivo?`
        : '¿Borrar la conversación de este dispositivo? No se puede deshacer.';
    if (!window.confirm(aviso)) return;
    reiniciar();
    onSalir();
  }

  return (
    <div className="cierre">
      <section className="tarjeta">
        <span className="eyebrow">Cierre</span>
        <h1>Terminar el trabajo</h1>
        <dl className="resumen">
          <dt>Comisión</dt>
          <dd>{nombreComision || sesion.comision}</dd>
          <dt>Grupo</dt>
          <dd>{sesion.grupo}</dd>
          <dt>Corpus</dt>
          <dd>{conversacion.corpusTitulo || sesion.corpusId}</dd>
          <dt>Mensajes</dt>
          <dd>
            {conversacion.mensajes.length}
            {sinExportar > 0 ? ` (${sinExportar} sin exportar)` : hayMensajes ? ' (todo exportado)' : ''}
          </dd>
        </dl>
        <Link to="/analisis">← Volver a la conversación</Link>
      </section>

      <section className="tarjeta" aria-labelledby="exportar-titulo">
        <h2 id="exportar-titulo">1. Exportar la conversación</h2>
        <p>
          El archivo distingue lo que escribió el grupo de lo que generó el asistente de IA, con la hora, la fase y las fuentes
          de cada respuesta. Se descarga en este dispositivo: no pasa por el servidor.
        </p>
        <label className="casilla">
          <input
            type="checkbox"
            checked={Boolean(conversacion.consentimiento)}
            onChange={(e) => actualizar({ consentimiento: e.target.checked })}
          />
          <span>{TEXTO_CONSENTIMIENTO}</span>
        </label>
        <p className="ayuda">
          Es opcional. Si no la marcan, la exportación funciona igual y el archivo queda marcado &quot;NO AUTORIZADO PARA
          DOCUMENTACIÓN&quot;.
        </p>
        {hayMensajes ? (
          <div className="botones exportar-botones">
            <button type="button" className="boton-primario" onClick={() => exportar('txt')}>
              Descargar .txt (para leer)
            </button>
            <button type="button" className="boton-secundario" onClick={() => exportar('json')}>
              Descargar .json (datos)
            </button>
          </div>
        ) : (
          <p className="aviso-suave">Todavía no hay mensajes para exportar.</p>
        )}
      </section>

      {config.entregaEvidencias && (
        <section className="tarjeta" aria-labelledby="entrega-titulo">
          <h2 id="entrega-titulo">2. Entregar las evidencias</h2>
          <Markdown texto={config.entregaEvidencias} />
        </section>
      )}

      <section className="tarjeta" aria-labelledby="borrar-titulo">
        <h2 id="borrar-titulo">{config.entregaEvidencias ? '3' : '2'}. Borrar la conversación de este dispositivo</h2>
        <p className="texto-suave">Háganlo al terminar, sobre todo si el dispositivo es compartido. Antes, exporten la conversación.</p>
        <button type="button" className="boton-peligro" onClick={borrar}>
          Borrar conversación
        </button>
      </section>
    </div>
  );
}

export default function Cierre() {
  const { config, estadoConfig, cargarConfig, sesion, cerrarSesion } = useSesion();
  const navigate = useNavigate();

  if (!sesion) return <Navigate to="/" replace />;
  if (!config) return <EstadoServidor estado={estadoConfig} onReintentar={cargarConfig} />;

  return (
    <AreaCierre
      key={claveConversacion(sesion)}
      sesion={sesion}
      config={config}
      onSalir={() => {
        cerrarSesion();
        navigate('/');
      }}
    />
  );
}
