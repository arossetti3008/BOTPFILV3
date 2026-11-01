// Pantalla de inicio: presentación, aviso de IA, datos del grupo y corpus.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import AvisoIA from '../components/AvisoIA';
import EstadoServidor from '../components/EstadoServidor';
import { useSesion } from '../context/SesionContext';
import { borrarConversacion, leerConversacion, mensajesSinExportar } from '../utils/almacenamiento';

function fechaLegible(iso) {
  return new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Inicio() {
  const { config, estadoConfig, cargarConfig, sesion, iniciarSesion } = useSesion();
  const navigate = useNavigate();

  const [corpusLista, setCorpusLista] = useState([]);
  const [errorCorpus, setErrorCorpus] = useState('');
  const [aceptado, setAceptado] = useState(false);
  const [comision, setComision] = useState(sesion?.comision || '');
  const [grupo, setGrupo] = useState(sesion?.grupo || '');
  const [corpusId, setCorpusId] = useState(sesion?.corpusId || '');
  const [error, setError] = useState('');
  const [previa, setPrevia] = useState(null); // conversación guardada para esa combinación
  const formularioRef = useRef(null);
  const previaRef = useRef(null);

  // Si aparece el aviso de conversación guardada, se lleva la vista hasta él
  useEffect(() => {
    if (previa) previaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [previa]);

  // Al aceptar el aviso, la vista baja a los datos del grupo
  function cambiarAceptado(valor) {
    setAceptado(valor);
    if (valor) {
      setTimeout(() => {
        formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        formularioRef.current?.querySelector('input')?.focus({ preventScroll: true });
      }, 50);
    }
  }

  useEffect(() => {
    if (!config) return;
    api
      .listarCorpus()
      .then((lista) => {
        setCorpusLista(lista);
        if (lista.length === 1) setCorpusId((actual) => actual || lista[0].id);
      })
      .catch((e) => setErrorCorpus(e.message));
  }, [config]);

  if (!config) return <EstadoServidor estado={estadoConfig} onReintentar={cargarConfig} />;

  // Conversación en curso en este dispositivo (la última sesión usada)
  const enCurso = sesion ? leerConversacion(sesion) : null;
  const hayEnCurso = Boolean(enCurso?.mensajes.length);

  const comisionElegida = config.comisiones.find((c) => c.id === comision);
  const patron = new RegExp(config.formatoGrupo.patron);
  const ejemplos = config.formatoGrupo.ejemplos.join(' o ');

  function validar() {
    if (!aceptado) return 'Para seguir, lean el aviso y marquen la casilla.';
    if (!comisionElegida) return 'Elijan la comisión.';
    const codigo = grupo.trim().toUpperCase();
    if (!patron.test(codigo)) return `El código de grupo no es válido. Usen el formato indicado (por ejemplo ${ejemplos}).`;
    if (codigo[0] !== comisionElegida.letra) {
      return `En la comisión ${comisionElegida.nombre}, el código empieza con ${comisionElegida.letra} (por ejemplo ${comisionElegida.letra}1).`;
    }
    if (!corpusId) return 'Elijan el corpus con el que van a trabajar.';
    return '';
  }

  // Si cambian los datos, la conversación guardada encontrada ya no corresponde
  function cambiar(asignar) {
    return (valor) => {
      asignar(valor);
      setPrevia(null);
    };
  }
  const cambiarComision = cambiar(setComision);
  const cambiarGrupo = cambiar(setGrupo);
  const cambiarCorpus = cambiar(setCorpusId);

  function datosSesion() {
    return { comision, grupo: grupo.trim().toUpperCase(), corpusId };
  }

  function entrar(continuar) {
    const nueva = datosSesion();
    if (!continuar) {
      const sinExportar = mensajesSinExportar(previa);
      if (
        sinExportar > 0 &&
        !window.confirm(
          `Hay ${sinExportar} mensajes que todavía no exportaron. Si empiezan de nuevo, se borran de este dispositivo. ¿Quieren seguir?`
        )
      ) {
        return;
      }
      borrarConversacion(nueva);
    }
    iniciarSesion(nueva);
    navigate('/analisis');
  }

  function alEnviar(e) {
    e.preventDefault();
    const problema = validar();
    setError(problema);
    if (problema) return;
    const guardada = leerConversacion(datosSesion());
    if (guardada?.mensajes.length) setPrevia(guardada);
    else entrar(true);
  }

  return (
    <div className="inicio">
      {hayEnCurso && (
        <section className="tarjeta en-curso" aria-labelledby="en-curso-titulo">
          <h2 id="en-curso-titulo">Tienen una conversación en curso</h2>
          <p>
            Grupo <strong>{sesion.grupo}</strong>
            {enCurso.corpusTitulo && <> · {enCurso.corpusTitulo}</>} · {enCurso.mensajes.length} mensajes, guardados en
            este dispositivo.
          </p>
          <button type="button" className="boton-primario" onClick={() => navigate('/analisis')}>
            Volver a la conversación
          </button>
          <p className="ayuda">Si son otro grupo o quieren otro corpus, completen los datos de abajo.</p>
        </section>
      )}

      <section className="presentacion">
        <span className="eyebrow">Lenguaje Visual III · IFDC Villa Mercedes</span>
        <h1>Análisis discursivo de imágenes</h1>
        <p>
          En este taller van a analizar en grupo un corpus de tres imágenes, con la metodología de la cátedra. El asistente no
          hace el análisis por ustedes: les pregunta, les pide evidencias y los ayuda a revisar su interpretación con la
          bibliografía.
        </p>
        <p>
          <Link to="/consigna">Leer la consigna del trabajo</Link>
        </p>
      </section>

      <AvisoIA aviso={config.aviso} aceptado={aceptado} onCambiar={cambiarAceptado} />

      <form
        ref={formularioRef}
        className={`tarjeta formulario-inicio ${aceptado ? '' : 'formulario-bloqueado'}`}
        onSubmit={alEnviar}
        noValidate
      >
        <h2>Datos del grupo</h2>
        {!aceptado && (
          <p className="aviso-suave">Para completar los datos, primero lean el aviso y marquen “{config.aviso.casilla}”.</p>
        )}
        <fieldset className="sin-borde" disabled={!aceptado}>

        <fieldset className="campo">
          <legend>Comisión</legend>
          <div className="opciones">
            {config.comisiones.map((c) => (
              <label key={c.id} className="opcion">
                <input
                  type="radio"
                  name="comision"
                  value={c.id}
                  checked={comision === c.id}
                  onChange={() => cambiarComision(c.id)}
                />
                <span>{c.nombre}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="campo">
          <label htmlFor="grupo">Código de grupo</label>
          <input
            id="grupo"
            value={grupo}
            onChange={(e) => cambiarGrupo(e.target.value.toUpperCase())}
            placeholder={comisionElegida ? `${comisionElegida.letra}1` : ejemplos}
            autoComplete="off"
            maxLength={4}
            aria-describedby="grupo-ayuda"
          />
          <p id="grupo-ayuda" className="ayuda">
            Lo indica el docente (por ejemplo {ejemplos}). No escriban nombres.
          </p>
        </div>

        <div className="campo">
          <label htmlFor="corpus">Corpus</label>
          <select id="corpus" value={corpusId} onChange={(e) => cambiarCorpus(e.target.value)}>
            <option value="">Elijan un corpus…</option>
            {corpusLista.map((c) => (
              <option key={c.id} value={c.id}>
                {c.titulo}
              </option>
            ))}
          </select>
          {errorCorpus && <p className="mensaje-error">{errorCorpus}</p>}
        </div>

        {error && (
          <p className="mensaje-error" role="alert">
            {error}
          </p>
        )}

        {previa ? (
          <div className="previa" role="alert" ref={previaRef}>
            <p>
              Este dispositivo tiene una conversación guardada de este grupo con este corpus ({previa.mensajes.length}{' '}
              mensajes, empezada el {fechaLegible(previa.inicio)}).
            </p>
            <div className="botones">
              <button type="button" className="boton-primario" onClick={() => entrar(true)}>
                Continuar conversación
              </button>
              <button type="button" className="boton-secundario" onClick={() => entrar(false)}>
                Empezar de nuevo
              </button>
            </div>
          </div>
        ) : (
          <button type="submit" className="boton-primario boton-ancho">
            Empezar
          </button>
        )}
        </fieldset>
      </form>
    </div>
  );
}
