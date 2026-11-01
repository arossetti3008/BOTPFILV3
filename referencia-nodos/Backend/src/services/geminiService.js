// Toda la logica de llamadas al LLM vive aca, aislada del resto de la app.
// Si el dia de manana cambian de proveedor (Gemini -> Groq, etc.) o cambia
// el nombre del modelo, solo hay que tocar este archivo.

const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// El modelo se configura por variable de entorno a proposito: Google va
// deprecando versiones de Gemini cada tanto (2.0 y 2.5 ya tienen fecha de
// apagado en 2026), asi que definilo en tu .env sin tocar este codigo.
// Ejemplos validos actuales: gemini-flash-latest, gemini-3-flash
function obtenerModelo() {
  return process.env.GEMINI_MODEL || 'gemini-flash-latest';
}

// Espera la cantidad de ms indicada (usado para el backoff entre reintentos)
function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Codigos de error de Gemini que valen la pena reintentar, porque suelen ser
// temporales (el modelo esta sobrecargado, o se supero un limite momentaneo)
const CODIGOS_REINTENTABLES = [503, 429];
const MAX_INTENTOS = 3;

async function llamarGemini(systemInstruction, contents, intento = 1) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    const error = new Error('Falta configurar LLM_API_KEY en el .env');
    error.statusCode = 500;
    throw error;
  }

  const modelo = obtenerModelo();
  let respuesta;
  try {
    respuesta = await fetch(`${URL_BASE}/${modelo}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
      }),
    });
  } catch (fallaDeRed) {
    // Logueamos la causa real (certificado, DNS, proxy, etc.) para diagnosticar,
    // en vez de dejar pasar el mensaje generico "fetch failed"
    console.error('Fallo de red al llamar a Gemini. Causa:', fallaDeRed.cause || fallaDeRed);
    const error = new Error(
      `No se pudo conectar con la API de Gemini: ${fallaDeRed.cause?.code || fallaDeRed.message}`
    );
    error.statusCode = 502;
    throw error;
  }

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    console.error(`Error de Gemini API (modelo: ${modelo}, intento ${intento}):`, respuesta.status, detalle);

    // Si es un error temporal (modelo sobrecargado, limite momentaneo) y todavia
    // nos quedan intentos, esperamos un poco mas cada vez y reintentamos solos,
    // sin que el estudiante tenga que volver a mandar el mensaje.
    if (CODIGOS_REINTENTABLES.includes(respuesta.status) && intento < MAX_INTENTOS) {
      const esperaMs = intento * 1500; // 1.5s, luego 3s
      console.warn(`Gemini no disponible temporalmente, reintentando en ${esperaMs}ms...`);
      await esperar(esperaMs);
      return llamarGemini(systemInstruction, contents, intento + 1);
    }

    // Se acabaron los reintentos: devolvemos un mensaje claro y accionable
    if (CODIGOS_REINTENTABLES.includes(respuesta.status)) {
      const error = new Error(
        'El tutor IA esta muy solicitado en este momento. Espera unos segundos y volve a intentar.'
      );
      error.statusCode = 503;
      throw error;
    }

    const error = new Error('El servicio de tutor IA no esta disponible en este momento');
    error.statusCode = 502;
    throw error;
  }

  const data = await respuesta.json();
  const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!texto) {
    console.error('Respuesta de Gemini sin texto utilizable:', JSON.stringify(data));
    const error = new Error('Respuesta invalida del servicio de tutor IA');
    error.statusCode = 502;
    throw error;
  }

  return texto;
}

function construirSystemPromptTutor(nodo) {
  return `Sos un tutor de diseno y lenguaje visual, especializado en el concepto "${nodo.concepto}".
Descripcion del concepto: ${nodo.descripcion}

Reglas:
- Hace preguntas guia y ejercicios cortos para verificar que el estudiante entiende el concepto.
- Da feedback constructivo, siempre en espanol.
- Nunca reveles la respuesta correcta de forma directa sin que el estudiante haya intentado responder antes.
- Se breve: maximo 4-5 oraciones por respuesta.
- Tono calido y alentador, como un profesor que quiere que el alumno aprenda, no que se sienta evaluado.
- No uses markdown ni asteriscos, escribi en texto plano.`;
}

function mensajesAContenidoGemini(mensajes) {
  return mensajes.map((m) => ({
    role: m.rol === 'tutor' ? 'model' : 'user',
    parts: [{ text: m.contenido }],
  }));
}

// Genera la siguiente respuesta del tutor dado el historial de la conversacion
async function generarRespuestaTutor(nodo, mensajes) {
  const systemInstruction = construirSystemPromptTutor(nodo);
  const contents = mensajesAContenidoGemini(mensajes);
  return llamarGemini(systemInstruction, contents);
}

// Evalua si el estudiante demuestra dominio del concepto, en base a toda
// la conversacion. Devuelve { resultado: 'aprobado' | 'a_reforzar', feedback }
async function evaluarDominio(nodo, mensajes) {
  const systemInstruction = `Sos un evaluador experto en el concepto de diseno "${nodo.concepto}" (${nodo.descripcion}).
Vas a analizar una conversacion entre un tutor y un estudiante, y vas a decidir si el estudiante demuestra
dominio real del concepto (no solo repetir definiciones, sino aplicarlas correctamente).

Responde UNICAMENTE con un JSON valido, sin texto adicional, sin bloques de codigo markdown, con este formato exacto:
{"resultado": "aprobado", "feedback": "texto"}
o
{"resultado": "a_reforzar", "feedback": "texto"}

El feedback debe tener 2 a 3 oraciones, en espanol, dirigido directamente al estudiante.`;

  const contents = mensajesAContenidoGemini(mensajes);
  contents.push({
    role: 'user',
    parts: [{ text: 'Evalua ahora mi nivel de dominio de este concepto segun la conversacion anterior.' }],
  });

  const textoRespuesta = await llamarGemini(systemInstruction, contents);
  const limpio = textoRespuesta.replace(/```json|```/g, '').trim();

  let evaluacion;
  try {
    evaluacion = JSON.parse(limpio);
  } catch (err) {
    console.error('No se pudo parsear la evaluacion de Gemini como JSON:', textoRespuesta);
    const error = new Error('No se pudo interpretar la evaluacion del tutor IA');
    error.statusCode = 502;
    throw error;
  }

  if (!['aprobado', 'a_reforzar'].includes(evaluacion.resultado) || !evaluacion.feedback) {
    console.error('Evaluacion de Gemini con formato inesperado:', evaluacion);
    const error = new Error('El tutor IA devolvio un formato de evaluacion inesperado');
    error.statusCode = 502;
    throw error;
  }

  return evaluacion;
}

module.exports = { generarRespuestaTutor, evaluarDominio };
