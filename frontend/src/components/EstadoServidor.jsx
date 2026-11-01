// Mensaje mientras se conecta con el servidor (que puede estar despertando)
// o si no se pudo conectar, con un botón para reintentar.
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
    <div className="tarjeta estado-servidor" role="status">
      <p>Conectando con el servidor…</p>
      {estado.lento && (
        <p className="texto-suave">
          El servidor está despertando: en el plan gratuito puede tardar hasta un minuto la primera vez. No cierren la página.
        </p>
      )}
    </div>
  );
}
