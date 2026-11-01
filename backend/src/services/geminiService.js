// Toda la lógica de llamadas a Gemini vive acá, aislada del resto de la app.
// Si cambia el modelo o el proveedor, solo hay que tocar este archivo y la
// configuración. Basado en el geminiService de Nódos (reintentos, mensajes en
// español, log de fallas de red, clave por header).
//
// Privacidad: nunca se loguea el contenido de los mensajes ni de las
// respuestas, solo metadatos (modelo, código de error, motivo).

const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Errores que suelen ser temporales y vale la pena reintentar
const CODIGOS_REINTENTABLES = [429, 503];

// Motivos de corte que significan "respuesta bloqueada por seguridad"
const MOTIVOS_BLOQUEO = new Set([
  'SAFETY',
  'RECITATION',
  'BLOCKLIST',
  'PROHIBITED_CONTENT',
  'SPII',
  'IMAGE_SAFETY',
  'IMAGE_PROHIBITED_CONTENT',
]);

const MENSAJE_VARIOS_GRUPOS =
  'El asistente está atendiendo a varios grupos, esperá unos segundos y volvé a enviar el mensaje.';
const MENSAJE_SATURADO =
  'El asistente está muy solicitado en este momento. Esperá unos segundos y volvé a intentar.';
const MENSAJE_CUOTA_DIARIA =
  'Se agotó la cuota diaria gratuita del asistente. Se renueva mañana alrededor de las 5 (hora argentina). ' +
  'Mientras tanto, pueden seguir trabajando con la consigna, la bibliografía y su propia observación.';

function crearError(mensaje, statusCode, extra = {}) {
  const error = new Error(mensaje);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
}

// Retry-After puede venir en segundos o como fecha HTTP
function leerRetryAfterMs(valor) {
  if (!valor) return null;
  const segundos = Number(valor);
  if (Number.isFinite(segundos)) return Math.max(0, segundos * 1000);
  const fecha = Date.parse(valor);
  return Number.isNaN(fecha) ? null : Math.max(0, fecha - Date.now());
}

// Resume el cuerpo de error de Google para el log (sin contenido del chat)
function resumirErrorGemini(detalle) {
  try {
    const { error } = JSON.parse(detalle);
    return `${error?.status || error?.code || ''} ${error?.message || ''}`.trim().slice(0, 300);
  } catch {
    return String(detalle).slice(0, 300);
  }
}

// Google informa la cuota diaria agotada con un 429 cuyo detalle menciona
// el límite "por día" (por ejemplo, GenerateRequestsPerDayPerProjectPerModel)
function esCuotaDiaria(detalle) {
  return /PerDay|per day|quota_exceeded|daily/i.test(detalle || '');
}

function crearServicioGemini({ config, cuota, fetchImpl, esperar }) {
  const g = config.gemini;
  const hacerFetch = fetchImpl || ((...args) => globalThis.fetch(...args));
  const dormir = esperar || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  function armarCuerpo(systemInstruction, contents) {
    const generationConfig = { maxOutputTokens: g.maxTokensSalida };
    if (g.temperatura !== null) generationConfig.temperature = g.temperatura;
    if (g.nivelRazonamiento) generationConfig.thinkingConfig = { thinkingLevel: g.nivelRazonamiento };
    return {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig,
    };
  }

  function interpretarRespuesta(data, modelo) {
    const bloqueoPedido = data?.promptFeedback?.blockReason;
    if (bloqueoPedido) {
      console.error(`Gemini bloqueó el pedido (modelo ${modelo}). Motivo: ${bloqueoPedido}`);
      throw crearError(
        'Google bloqueó el mensaje con sus filtros de seguridad. Reformúlenlo sin datos personales ni contenido ofensivo.',
        422,
        { bloqueado: true }
      );
    }

    const candidato = data?.candidates?.[0];
    const motivo = candidato?.finishReason;

    if (MOTIVOS_BLOQUEO.has(motivo)) {
      console.error(`Gemini bloqueó la respuesta (modelo ${modelo}). Motivo: ${motivo}`);
      throw crearError(
        'La respuesta del asistente fue bloqueada por los filtros de seguridad de Google. Prueben reformular el mensaje.',
        422,
        { bloqueado: true }
      );
    }

    // Se juntan todas las partes de texto; las de razonamiento interno se descartan
    const texto = (candidato?.content?.parts || [])
      .filter((parte) => typeof parte.text === 'string' && !parte.thought)
      .map((parte) => parte.text)
      .join('')
      .trim();

    if (!texto) {
      console.error(`Respuesta de Gemini sin texto (modelo ${modelo}). finishReason: ${motivo || 'ninguno'}`);
      if (motivo === 'MAX_TOKENS') {
        throw crearError(
          'El asistente se quedó sin espacio para responder. Avisale al docente (revisar GEMINI_MAX_TOKENS_SALIDA).',
          502
        );
      }
      throw crearError('El asistente devolvió una respuesta vacía. Intenten de nuevo.', 502);
    }

    return { texto, modelo, truncada: motivo === 'MAX_TOKENS' };
  }

  function errorSinTiempo() {
    return crearError('El asistente tardó demasiado en responder. Intenten de nuevo en unos segundos.', 504);
  }

  // "limite" es el momento en que se acaba el presupuesto total del mensaje
  async function llamarModelo(modelo, cuerpo, limite) {
    for (let intento = 1; ; intento++) {
      const restanteMs = limite - Date.now();
      if (restanteMs < 1000) throw errorSinTiempo();

      const espera = cuota.esperaPorMinuto();
      if (espera > 0) {
        throw crearError(`${MENSAJE_VARIOS_GRUPOS} (Probá en ${espera} segundos.)`, 429, { esperaSegundos: espera });
      }
      cuota.registrarLlamada(modelo);

      const controlador = new AbortController();
      const plazoMs = Math.min(g.timeoutMs, restanteMs);
      const temporizador = setTimeout(() => controlador.abort(), plazoMs);
      let respuesta;
      try {
        respuesta = await hacerFetch(`${URL_BASE}/${encodeURIComponent(modelo)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': g.apiKey },
          body: JSON.stringify(cuerpo),
          signal: controlador.signal,
        });
      } catch (fallaDeRed) {
        if (fallaDeRed.name === 'AbortError') {
          console.error(`Gemini no respondió a tiempo (modelo ${modelo}, ${plazoMs} ms)`);
          throw crearError('El asistente tardó demasiado en responder. Intenten de nuevo.', 504, {
            probarRespaldo: true,
          });
        }
        // La causa real (certificado, DNS, proxy) ayuda a diagnosticar
        console.error('Falla de red al llamar a Gemini. Causa:', fallaDeRed.cause?.code || fallaDeRed.message);
        throw crearError('No se pudo conectar con el servicio de Gemini. Intenten de nuevo en unos segundos.', 502);
      } finally {
        clearTimeout(temporizador);
      }

      if (respuesta.ok) return interpretarRespuesta(await respuesta.json(), modelo);

      const detalle = await respuesta.text().catch(() => '');
      const estado = respuesta.status;
      console.error(`Error de Gemini (modelo ${modelo}, intento ${intento}): ${estado} ${resumirErrorGemini(detalle)}`);

      if (estado === 429 && esCuotaDiaria(detalle)) {
        cuota.marcarAgotado(modelo);
        throw crearError(MENSAJE_CUOTA_DIARIA, 429, { probarRespaldo: true });
      }

      if (CODIGOS_REINTENTABLES.includes(estado)) {
        const quedanIntentos = intento <= g.esperasReintentoMs.length;
        const retryAfterMs = leerRetryAfterMs(respuesta.headers.get('retry-after'));
        const esperaLarga = retryAfterMs !== null && retryAfterMs > g.esperaMaximaRetryAfterMs;
        const esperaMs = quedanIntentos ? Math.max(g.esperasReintentoMs[intento - 1], retryAfterMs || 0) : 0;
        // Solo se reintenta si después de esperar queda tiempo razonable
        if (quedanIntentos && !esperaLarga && limite - Date.now() - esperaMs > 5000) {
          console.warn(`Gemini no disponible temporalmente (modelo ${modelo}), reintentando en ${esperaMs} ms`);
          await dormir(esperaMs);
          continue;
        }
        throw crearError(MENSAJE_SATURADO, 503, { probarRespaldo: true });
      }

      if (estado === 404) {
        throw crearError(`El modelo "${modelo}" no existe o ya no está disponible. Avisale al docente.`, 502, {
          probarRespaldo: true,
        });
      }
      if (estado === 401 || estado === 403) {
        throw crearError('La clave de Gemini no es válida o no tiene permisos. Avisale al docente.', 502);
      }
      throw crearError('El servicio del asistente no está disponible en este momento. Intenten de nuevo.', 502);
    }
  }

  // Genera una respuesta. Prueba el modelo principal y, si se agotó su cuota,
  // está saturado o ya no existe, pasa solo al modelo de respaldo.
  async function generar({ systemInstruction, contents }) {
    if (!config.geminiListo) {
      throw crearError(
        'El asistente todavía no está configurado (falta LLM_API_KEY o GEMINI_MODEL). Avisale al docente.',
        503
      );
    }

    const espera = cuota.esperaPorMinuto();
    if (espera > 0) {
      throw crearError(`${MENSAJE_VARIOS_GRUPOS} (Probá en ${espera} segundos.)`, 429, { esperaSegundos: espera });
    }

    const cuerpo = armarCuerpo(systemInstruction, contents);
    const limite = Date.now() + g.presupuestoTotalMs;
    const modelos = [g.modelo, g.modeloRespaldo].filter((m, i, lista) => m && lista.indexOf(m) === i);
    let ultimoError = crearError(MENSAJE_CUOTA_DIARIA, 429);

    for (const modelo of modelos) {
      if (!cuota.disponibleHoy(modelo)) continue;
      try {
        return await llamarModelo(modelo, cuerpo, limite);
      } catch (error) {
        if (!error.probarRespaldo) throw error;
        ultimoError = error;
        console.warn(`Modelo ${modelo} no disponible (${error.statusCode}); se prueba el siguiente si hay.`);
      }
    }
    throw ultimoError;
  }

  return { generar };
}

module.exports = { crearServicioGemini, esCuotaDiaria, leerRetryAfterMs };
