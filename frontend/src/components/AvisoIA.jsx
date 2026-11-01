// Aviso de IA y privacidad (texto en backend/contenidos/taller.json),
// con la casilla obligatoria para seguir.
export default function AvisoIA({ aviso, aceptado, onCambiar }) {
  return (
    <section className="tarjeta aviso" aria-labelledby="aviso-titulo">
      <h2 id="aviso-titulo">{aviso.titulo}</h2>
      <ul className="aviso-lista">
        {aviso.puntos.map((punto) => (
          <li key={punto}>{punto}</li>
        ))}
      </ul>
      <label className="casilla">
        <input type="checkbox" checked={aceptado} onChange={(e) => onCambiar(e.target.checked)} />
        <span>{aviso.casilla}</span>
      </label>
    </section>
  );
}
