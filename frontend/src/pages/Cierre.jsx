// Pantalla de cierre: resumen, exportación (Etapa 5) y borrado de la
// conversación de este dispositivo.
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useSesion } from '../context/SesionContext';
import { useConversacion } from '../hooks/useConversacion';
import { claveConversacion, mensajesSinExportar } from '../utils/almacenamiento';
import EstadoServidor from '../components/EstadoServidor';

function AreaCierre({ sesion, limites, onSalir }) {
  const { conversacion, reiniciar } = useConversacion(sesion, null, limites);
  const sinExportar = mensajesSinExportar(conversacion);

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
          <dt>Grupo</dt>
          <dd>{sesion.grupo}</dd>
          <dt>Corpus</dt>
          <dd>{conversacion.corpusTitulo || sesion.corpusId}</dd>
          <dt>Mensajes</dt>
          <dd>
            {conversacion.mensajes.length}
            {sinExportar > 0 && ` (${sinExportar} sin exportar)`}
          </dd>
        </dl>
        <Link to="/analisis">← Volver a la conversación</Link>
      </section>

      <section className="tarjeta">
        <h2>Borrar la conversación de este dispositivo</h2>
        <p className="texto-suave">
          Háganlo al terminar, sobre todo si el dispositivo es compartido. Antes, exporten la conversación.
        </p>
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
      limites={config.limites}
      onSalir={() => {
        cerrarSesion();
        navigate('/');
      }}
    />
  );
}
