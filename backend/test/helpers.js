// Utilidades compartidas por los tests: configuración de prueba y un fetch
// simulado que reemplaza a Gemini (los tests nunca llaman a Google).

const { cargarConfig } = require('../src/config');
const { crearApp } = require('../src/app');

const CORPUS_ID = 'EJEMPLO-corpus-1';

// Los tests no necesitan ver los logs del servidor; VERBOSE=1 los muestra
function silenciarConsola() {
  if (process.env.VERBOSE) return;
  for (const metodo of ['log', 'warn', 'error']) console[metodo] = () => {};
}

function configPrueba(envExtra = {}) {
  const config = cargarConfig({
    NODE_ENV: 'test',
    FRONTEND_URL: 'http://localhost:5173',
    LLM_API_KEY: 'clave-de-prueba',
    GEMINI_MODEL: 'modelo-principal',
    GEMINI_MODEL_RESPALDO: 'modelo-respaldo',
    ...envExtra,
  });
  config.gemini.esperasReintentoMs = [0, 0]; // sin esperas reales en los tests
  return config;
}

function respuestaGemini(texto, { finishReason = 'STOP', parts } = {}) {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { role: 'model', parts: parts || [{ text: texto }] }, finishReason }],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

function errorGemini(status, cuerpo = {}, headers = {}) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

const CUOTA_DIARIA_AGOTADA = {
  error: {
    code: 429,
    status: 'RESOURCE_EXHAUSTED',
    message: 'Quota exceeded for metric generate_content_free_tier_requests',
    details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }],
  },
};

// fetch simulado. "respuestas" es una función (url, opciones) => Response.
// Guarda cada llamada para poder revisar qué se le mandó a Gemini.
function fetchSimulado(respuestas = () => respuestaGemini('Respuesta simulada del asistente.')) {
  const llamadas = [];
  const fetchImpl = async (url, opciones) => {
    const llamada = { url, opciones, cuerpo: JSON.parse(opciones.body), modelo: url.split('/models/')[1].split(':')[0] };
    llamadas.push(llamada);
    return respuestas(llamada, llamadas.length);
  };
  return { fetchImpl, llamadas };
}

function appDePrueba({ env, respuestas, esperar } = {}) {
  const simulado = fetchSimulado(respuestas);
  const app = crearApp({ config: configPrueba(env), fetchImpl: simulado.fetchImpl, esperar: esperar || (async () => {}) });
  return { app, llamadas: simulado.llamadas };
}

function pedidoChat(extra = {}) {
  return {
    comision: 'manana',
    grupo: 'M1',
    corpusId: CORPUS_ID,
    mensajes: [{ rol: 'estudiante', contenido: 'Observamos tres afiches con colores saturados.' }],
    incluirImagenes: false,
    ...extra,
  };
}

// Historial en el que el grupo ya escribió su interpretación inicial
// (2 mensajes con más de 300 caracteres) y el asistente respondió
function historialConInterpretacion(mensajeFinal = 'Pasemos a comparar.') {
  const largo = 'En la primera imagen vemos una figura central iluminada y un fondo oscuro que la aísla. '.repeat(2);
  return [
    { rol: 'estudiante', contenido: largo },
    { rol: 'tutor', contenido: '¿Qué elemento concreto sostiene esa lectura?' },
    { rol: 'estudiante', contenido: largo },
    { rol: 'tutor', contenido: '¿Cómo se relaciona con el eje del corpus?' },
    { rol: 'estudiante', contenido: mensajeFinal },
  ];
}

module.exports = {
  CORPUS_ID,
  CUOTA_DIARIA_AGOTADA,
  silenciarConsola,
  configPrueba,
  respuestaGemini,
  errorGemini,
  fetchSimulado,
  appDePrueba,
  pedidoChat,
  historialConInterpretacion,
};
