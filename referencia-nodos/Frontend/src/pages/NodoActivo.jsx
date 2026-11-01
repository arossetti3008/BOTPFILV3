import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { obtenerContenido } from '../data/conceptosContenido';
import IlustracionConcepto from '../components/IlustracionConcepto';

export default function NodoActivo() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [nodo, setNodo] = useState(null);
  // El chat siempre arranca vacio en pantalla al entrar a un nodo, aunque el
  // backend guarde el historial completo (lo necesita el tutor para evaluar
  // con contexto). Es una decision de UX: cada visita se siente como un
  // repaso nuevo, sin arrastrar mensajes viejos de sesiones anteriores.
  const [mensajes, setMensajes] = useState([]);
  const [textoInput, setTextoInput] = useState('');
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [evaluando, setEvaluando] = useState(false);
  const [error, setError] = useState('');
  const [resultadoEvaluacion, setResultadoEvaluacion] = useState(null);
  const finDelChatRef = useRef(null);

  useEffect(() => {
    setMensajes([]);
    setResultadoEvaluacion(null);
    cargarNodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    finDelChatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [mensajes]);

  async function cargarNodo() {
    setCargandoInicial(true);
    setError('');
    try {
      const { nodos } = await api.listarNodos();
      const nodoActual = nodos.find((n) => n._id === id);
      if (!nodoActual) {
        setError('No se encontró este nodo');
      } else {
        setNodo(nodoActual);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargandoInicial(false);
    }
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    const mensaje = textoInput.trim();
    if (!mensaje || enviando) return;

    setError('');
    setEnviando(true);
    setTextoInput('');
    setMensajes((prev) => [...prev, { rol: 'estudiante', contenido: mensaje }]);

    try {
      const data = await api.enviarMensajeTutor(id, mensaje);
      setMensajes((prev) => [...prev, { rol: 'tutor', contenido: data.respuesta }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function manejarEvaluacion() {
    setError('');
    setEvaluando(true);
    setResultadoEvaluacion(null);
    try {
      const data = await api.evaluarNodo(id);
      setResultadoEvaluacion(data);
      if (data.resultado === 'aprobado' && data.nodos) {
        const actualizado = data.nodos.find((n) => n._id === id);
        if (actualizado) setNodo(actualizado);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setEvaluando(false);
    }
  }

  if (cargandoInicial) {
    return (
      <div className="pantalla">
        <div className="contenido">
          <p style={{ textAlign: 'center', color: 'var(--texto-suave)', padding: '60px 0' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (error && !nodo) {
    return (
      <div className="pantalla">
        <div className="contenido">
          <button className="boton-secundario" onClick={() => navigate('/')} style={{ marginBottom: 20 }}>
            ← Volver al árbol
          </button>
          <div className="mensaje-error">{error}</div>
        </div>
      </div>
    );
  }

  const yaDominado = nodo.estado === 'dominado';
  const contenido = obtenerContenido(nodo.slug);

  return (
    <div className="pantalla">
      <div className="contenido">
        <button className="boton-secundario" onClick={() => navigate('/')} style={{ marginBottom: 14, padding: '8px 14px', fontSize: 13 }}>
          ← Volver al árbol
        </button>

        <p style={{ fontSize: 12, color: 'var(--acento)', marginBottom: 10 }}>
          Árbol de habilidades / Diseño visual
        </p>

        <span className="eyebrow">Concepto</span>
        <h1 style={{ fontSize: 24, margin: '4px 0 8px' }}>
          {nodo.concepto} <span style={{ color: 'var(--acento)' }}>visual</span>{' '}
          {yaDominado && <span style={{ fontSize: 16 }}>✓</span>}
        </h1>
        <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
          {nodo.descripcion}
        </p>

        <span className="eyebrow">Imagen de referencia</span>
        <div className="tarjeta" style={{ marginTop: 6, marginBottom: 16, padding: 14 }}>
          <IlustracionConcepto slug={nodo.slug} />
          <p style={{ fontSize: 12, marginTop: 10, color: 'var(--texto)' }}>{contenido.caption}</p>
          {contenido.etiquetaVisual && (
            <p style={{ fontSize: 11, color: 'var(--texto-suave)', marginTop: 2 }}>{contenido.etiquetaVisual}</p>
          )}
        </div>

        {contenido.terminos.length > 0 && (
          <>
            <span className="eyebrow">Términos clave</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6, marginBottom: 20 }}>
              {contenido.terminos.map((t) => (
                <div key={t.termino} style={{ background: 'var(--acento-suave)', borderRadius: 10, padding: '8px 12px', fontSize: 12 }}>
                  <strong style={{ color: 'var(--acento)' }}>{t.termino}</strong>
                  <span style={{ color: 'var(--texto)' }}> — {t.definicion}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 14, borderBottom: '1px solid var(--borde)', marginBottom: 14 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'var(--acento)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            💬
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700 }}>Tutor de {nodo.concepto.toLowerCase()}</p>
            <p style={{ fontSize: 11, color: 'var(--texto-suave)' }}>Listo para guiarte</p>
          </div>
        </div>

        {/* Chat: altura fija con scroll propio, para no empujar el resto de la pagina */}
        <div
          className="tarjeta"
          style={{
            height: 320,
            overflowY: 'auto',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              alignSelf: 'flex-start',
              maxWidth: '85%',
              background: 'var(--bg-card)',
              border: '1px solid var(--borde)',
              padding: '12px 14px',
              borderRadius: 14,
              fontSize: 14,
              color: 'var(--texto)',
            }}
          >
            ¡Hola! ¿Podés identificar los elementos clave de {nodo.concepto.toLowerCase()} en el ejemplo de arriba?
            Contame lo que ves.
          </div>

          {mensajes.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.rol === 'tutor' ? 'flex-start' : 'flex-end',
                maxWidth: '85%',
                background: m.rol === 'tutor' ? 'var(--bg-card)' : 'var(--acento)',
                color: m.rol === 'tutor' ? 'var(--texto)' : '#fff',
                padding: '10px 14px',
                borderRadius: 14,
                fontSize: 14,
                lineHeight: 1.4,
              }}
            >
              {m.contenido}
            </div>
          ))}

          {enviando && (
            <div style={{ alignSelf: 'flex-start', color: 'var(--texto-suave)', fontSize: 13, fontStyle: 'italic' }}>
              El tutor está escribiendo...
            </div>
          )}

          {resultadoEvaluacion && (
            <div
              style={{
                background:
                  resultadoEvaluacion.resultado === 'aprobado'
                    ? 'color-mix(in srgb, var(--exito) 20%, transparent)'
                    : 'color-mix(in srgb, var(--amarillo) 20%, transparent)',
                border: `1px solid ${resultadoEvaluacion.resultado === 'aprobado' ? 'var(--exito)' : 'var(--amarillo)'}`,
                borderRadius: 12,
                padding: 12,
                fontSize: 13,
              }}
            >
              <strong>{resultadoEvaluacion.resultado === 'aprobado' ? '¡Concepto dominado!' : 'Todavía no, sigamos practicando'}</strong>
              <p style={{ marginTop: 6 }}>{resultadoEvaluacion.feedback}</p>
            </div>
          )}

          <div ref={finDelChatRef} />
        </div>

        {error && <div className="mensaje-error">{error}</div>}

        <form onSubmit={manejarEnvio} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={textoInput}
            onChange={(e) => setTextoInput(e.target.value)}
            placeholder="Escribí tu respuesta..."
            disabled={enviando}
            maxLength={2000}
            style={{
              flex: 1,
              border: '1.5px solid var(--borde)',
              borderRadius: 20,
              padding: '10px 16px',
              fontSize: 14,
              background: 'var(--bg-card)',
              color: 'var(--texto)',
            }}
          />
          <button type="submit" className="boton-primario" disabled={enviando || !textoInput.trim()} style={{ borderRadius: 20, padding: '10px 20px' }}>
            Enviar
          </button>
        </form>

        <button
          className="boton-primario"
          style={{ width: '100%' }}
          onClick={manejarEvaluacion}
          disabled={evaluando || mensajes.length < 2 || yaDominado}
        >
          {yaDominado ? 'Ya dominaste este concepto' : evaluando ? 'Evaluando...' : 'Marcar como dominado'}
        </button>
        {!yaDominado && mensajes.length < 2 && (
          <p style={{ fontSize: 12, color: 'var(--texto-suave)', textAlign: 'center', marginTop: 6 }}>
            Conversá un poco con el tutor antes de pedir la evaluación
          </p>
        )}
      </div>
    </div>
  );
}
