// Recordatorio de las 5 dimensiones de análisis (de la consigna).
// Desplegado en pantallas anchas; plegado en celular para no ocupar lugar.
import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Dimensiones() {
  const [dimensiones, setDimensiones] = useState([]);
  const [error, setError] = useState('');
  const abiertoAlInicio = typeof window !== 'undefined' && window.matchMedia?.('(min-width: 900px)').matches;

  useEffect(() => {
    api
      .dimensiones()
      .then((datos) => setDimensiones(datos.dimensiones))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <details className="tarjeta desplegable" open={abiertoAlInicio}>
      <summary>
        <span className="eyebrow">Metodología</span>
        <span className="desplegable-titulo">Las 5 dimensiones de análisis</span>
      </summary>
      {error && <p className="mensaje-error">{error}</p>}
      <ol className="dimensiones">
        {dimensiones.map((d) => (
          <li key={d.id}>
            <p className="dimension-nombre">{d.nombre}</p>
            <p className="dimension-descripcion">{d.descripcion}</p>
            <ul className="dimension-preguntas">
              {d.preguntasGuia.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </details>
  );
}
