// "Fuentes consultadas" debajo de una respuesta del asistente
export default function Fuentes({ fuentes }) {
  if (!fuentes?.length) return null;
  return (
    <details className="fuentes">
      <summary>Fuentes consultadas ({fuentes.length})</summary>
      <ol>
        {fuentes.map((f) => (
          <li key={f.n}>
            <p className="fuentes-cita">
              <strong>Fuente {f.n}:</strong> {f.autor} ({f.anio}). <em>{f.titulo}</em>, {f.pagina}.
            </p>
            <p className="fuentes-extracto">“{f.extracto}”</p>
          </li>
        ))}
      </ol>
    </details>
  );
}
