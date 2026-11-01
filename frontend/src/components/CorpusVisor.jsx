// Problemática, eje y las 3 imágenes del corpus con su ficha.
// Cada imagen se puede ampliar a pantalla completa (dialog nativo: Esc cierra).
import { useRef, useState } from 'react';
import { urlImagen } from '../api/client';

function Ficha({ imagen }) {
  const datos = [imagen.autor, imagen.anio].filter(Boolean).join(', ');
  return (
    <div className="ficha">
      <p className="ficha-titulo">{imagen.titulo}</p>
      {datos && <p>{datos}</p>}
      {imagen.soporte && <p>Soporte: {imagen.soporte}</p>}
      {imagen.procedencia && <p className="ficha-procedencia">Procedencia: {imagen.procedencia}</p>}
      {imagen.fuente && (
        <p className="ficha-procedencia">
          <a href={imagen.fuente} target="_blank" rel="noopener noreferrer">
            Ver ficha en el museo<span className="sr-only"> (se abre en otra pestaña)</span> ↗
          </a>
        </p>
      )}
    </div>
  );
}

export default function CorpusVisor({ corpus }) {
  const dialogo = useRef(null);
  const [ampliada, setAmpliada] = useState(null);

  function ampliar(imagen) {
    setAmpliada(imagen);
    dialogo.current?.showModal();
  }

  return (
    <section className="tarjeta corpus" aria-labelledby="corpus-titulo">
      <span className="eyebrow">Corpus</span>
      <h2 id="corpus-titulo">{corpus.titulo}</h2>
      <dl className="corpus-datos">
        <dt>Problemática</dt>
        <dd>{corpus.problematica}</dd>
        <dt>Eje de comparabilidad</dt>
        <dd>{corpus.ejeComparabilidad}</dd>
      </dl>

      <ol className="corpus-imagenes">
        {corpus.imagenes.map((imagen, i) => (
          <li key={imagen.id} className="corpus-imagen">
            <button type="button" className="corpus-miniatura" onClick={() => ampliar(imagen)}>
              <img src={urlImagen(imagen.url)} alt={imagen.textoAlternativo} loading="lazy" />
              <span className="corpus-numero">Imagen {i + 1} · ampliar</span>
            </button>
            <Ficha imagen={imagen} />
          </li>
        ))}
      </ol>

      <dialog ref={dialogo} className="visor" onClose={() => setAmpliada(null)} aria-label="Imagen ampliada">
        {ampliada && (
          <>
            <img src={urlImagen(ampliada.url)} alt={ampliada.textoAlternativo} />
            <div className="visor-pie">
              <Ficha imagen={ampliada} />
              <button type="button" className="boton-secundario" onClick={() => dialogo.current?.close()}>
                Cerrar
              </button>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
