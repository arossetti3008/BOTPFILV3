// Pantalla mientras se conecta con el servidor (que puede estar despertando:
// en Render gratuito tarda hasta un minuto), con una animación para que la
// espera no parezca un error. Si no se pudo conectar, botón para reintentar.
import AnimacionEspera from './AnimacionEspera';

export default function EstadoServidor({ estado, onReintentar }) {
  if (estado.error) {
    return (
      <div className="tarjeta estado-servidor">
        <p className="mensaje-error">{estado.error}</p>
        <button type="button" className="boton-primario" onClick={onReintentar}>
          Reintentar
        </button>
      </div>
    );
  }
  return (
    <div className="tarjeta estado-servidor">
      <AnimacionEspera />
      <p className="texto-suave" role="status">
        Iniciando la aplicación…
      </p>
    </div>
  );
}
