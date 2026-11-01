// Chat con el asistente (basado en NodoActivo de Nódos): burbujas por rol,
// indicador "pensando…", scroll al último mensaje, textarea con contador y
// botón para copiar cada mensaje.
import { useEffect, useRef, useState } from 'react';
import Fuentes from './Fuentes';

function horaCorta(iso) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Navegadores sin API de portapapeles: copia con una selección temporal
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'absolute';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

function BotonCopiar({ texto }) {
  const [estado, setEstado] = useState('');
  async function copiar() {
    setEstado((await copiarTexto(texto)) ? 'Copiado' : 'No se pudo copiar');
    setTimeout(() => setEstado(''), 2000);
  }
  return (
    <button type="button" className="boton-mini" onClick={copiar}>
      {estado || 'Copiar'}
    </button>
  );
}

function Mensaje({ mensaje }) {
  const esTutor = mensaje.rol === 'tutor';
  return (
    <article className={`burbuja ${esTutor ? 'burbuja-tutor' : 'burbuja-grupo'}`}>
      <header className="burbuja-cabecera">
        <span className="burbuja-autor">{esTutor ? 'Asistente (IA)' : 'Grupo'}</span>
        <time dateTime={mensaje.hora}>{horaCorta(mensaje.hora)}</time>
      </header>
      {mensaje.pidioImagenes && <p className="burbuja-marca">Pidieron observaciones sobre las imágenes</p>}
      {mensaje.pidioComparacion && <p className="burbuja-marca">Pasaron a la comparación</p>}
      {esTutor && mensaje.imagenesIncluidas && (
        <p className="burbuja-marca">El asistente recibió las imágenes. Su lectura visual puede tener errores.</p>
      )}
      <p className="burbuja-texto">{mensaje.contenido}</p>
      {esTutor && mensaje.truncada && <p className="burbuja-marca">La respuesta quedó cortada por su largo.</p>}
      {esTutor && <Fuentes fuentes={mensaje.fuentes} />}
      <div className="burbuja-acciones">
        <BotonCopiar texto={mensaje.contenido} />
      </div>
    </article>
  );
}

export default function Chat({ mensajes, enviando, maxCaracteres, bloqueado, onEnviar, texto, onCambiarTexto }) {
  const historialRef = useRef(null);
  const largo = texto.length;
  const excedido = largo > maxCaracteres;

  // Lleva al último mensaje desplazando solo el cuadro del chat (no la
  // página: en celular haría saltar la pantalla por encima del corpus)
  useEffect(() => {
    const historial = historialRef.current;
    if (historial) historial.scrollTo({ top: historial.scrollHeight, behavior: 'smooth' });
  }, [mensajes.length, enviando]);

  function manejarEnvio(e) {
    e.preventDefault();
    if (!texto.trim() || excedido || enviando || bloqueado) return;
    onEnviar();
  }

  // Ctrl+Enter (o Cmd+Enter) envía; Enter solo hace un salto de línea
  function manejarTecla(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) manejarEnvio(e);
  }

  return (
    <div className="chat">
      <div
        ref={historialRef}
        className="chat-historial"
        role="log"
        aria-live="polite"
        aria-label="Conversación con el asistente"
      >
        {mensajes.length === 0 && (
          <p className="chat-vacio">
            Empiecen contando qué observan en las imágenes y qué interpretan. El asistente va a guiarlos con preguntas.
          </p>
        )}
        {mensajes.map((m) => (
          <Mensaje key={m.id} mensaje={m} />
        ))}
        {enviando && <p className="chat-pensando">El asistente está pensando…</p>}
      </div>

      <form className="chat-formulario" onSubmit={manejarEnvio}>
        <label htmlFor="mensaje" className="sr-only">
          Mensaje para el asistente
        </label>
        <textarea
          id="mensaje"
          className="campo-texto"
          rows={3}
          value={texto}
          onChange={(e) => onCambiarTexto(e.target.value)}
          onKeyDown={manejarTecla}
          placeholder="Escriban su observación, interpretación o pregunta…"
          disabled={bloqueado}
          aria-describedby="contador"
        />
        <div className="chat-pie">
          <span id="contador" className={`contador ${excedido ? 'contador-excedido' : ''}`}>
            {largo}/{maxCaracteres}
            {excedido && ' — demasiado largo'}
          </span>
          <button type="submit" className="boton-primario" disabled={!texto.trim() || excedido || enviando || bloqueado}>
            {enviando ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </form>
    </div>
  );
}
