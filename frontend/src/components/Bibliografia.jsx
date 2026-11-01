// Lista de la bibliografía disponible (las fuentes que el asistente puede citar)
import { useState } from 'react';
import { api } from '../api/client';

export default function Bibliografia() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  // Se pide recién cuando el grupo abre la sección
  function alAbrir(e) {
    if (e.currentTarget.open && !datos) {
      api.bibliografia().then(setDatos).catch((err) => setError(err.message));
    }
  }

  return (
    <details className="tarjeta desplegable" onToggle={alAbrir}>
      <summary>
        <span className="eyebrow">Bibliografía</span>
        <span className="desplegable-titulo">Fuentes disponibles</span>
      </summary>
      {error && <p className="mensaje-error">{error}</p>}
      {!datos && !error && <p className="texto-suave">Cargando…</p>}
      {datos && datos.fuentes.length === 0 && (
        <p className="texto-suave">
          Todavía no hay bibliografía cargada. El asistente no va a citar fuentes hasta que el docente la configure.
        </p>
      )}
      {datos && datos.fuentes.length > 0 && (
        <ul className="bibliografia">
          {datos.fuentes.map((f) => (
            <li key={`${f.autor}-${f.titulo}`}>
              {f.referenciaAPA || `${f.autor} (${f.anio}). ${f.titulo}.`}
              <span className="texto-suave"> · {f.paginasIndexadas} páginas</span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
