// Lista de la bibliografía disponible (las fuentes que el asistente puede citar)
import { useEffect, useState } from 'react';
import { api } from '../api/client';

const ESTADOS_CARGANDO = ['pendiente', 'sincronizando'];
const SEGUNDOS_ENTRE_CONSULTAS = 15;

export default function Bibliografia() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [abierta, setAbierta] = useState(false);

  const cargando = Boolean(datos) && datos.fuentes.length === 0 && ESTADOS_CARGANDO.includes(datos.estado);

  function pedir() {
    setError('');
    api.bibliografia().then(setDatos).catch((err) => setError(err.message));
  }

  // Se pide recién cuando el grupo abre la sección (y otra vez si estaba vacía)
  function alAbrir(e) {
    const abriendo = e.currentTarget.open;
    setAbierta(abriendo);
    if (abriendo && (!datos || datos.fuentes.length === 0)) pedir();
  }

  // Mientras el servidor está leyendo la bibliografía, se vuelve a consultar sola
  useEffect(() => {
    if (!abierta || !cargando) return undefined;
    const reloj = setInterval(pedir, SEGUNDOS_ENTRE_CONSULTAS * 1000);
    return () => clearInterval(reloj);
  }, [abierta, cargando]);

  return (
    <details className="tarjeta desplegable" onToggle={alAbrir}>
      <summary>
        <span className="eyebrow">Bibliografía</span>
        <span className="desplegable-titulo">Fuentes disponibles</span>
      </summary>
      {error && <p className="mensaje-error">{error}</p>}
      {!datos && !error && <p className="texto-suave">Cargando…</p>}
      {cargando && (
        <p className="texto-suave" role="status">
          La bibliografía se está cargando: cuando el servidor recién despierta tarda unos minutos. Mientras tanto
          pueden seguir trabajando; la lista aparece sola cuando esté lista.
        </p>
      )}
      {datos && datos.fuentes.length === 0 && !ESTADOS_CARGANDO.includes(datos.estado) && (
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
