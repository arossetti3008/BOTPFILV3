// Tests del servicio de Gemini: respuestas, bloqueos, reintentos y respaldo

const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');
const { crearServicioGemini, leerRetryAfterMs, esCuotaDiaria } = require('../src/services/geminiService');
const { crearCuota } = require('../src/services/cuotaService');

h.silenciarConsola();

const PEDIDO = {
  systemInstruction: 'instrucciones',
  contents: [{ role: 'user', parts: [{ text: 'TEXTO PRIVADO DEL GRUPO' }] }],
};

function servicio({ env, respuestas, esperar } = {}) {
  const config = h.configPrueba(env);
  const cuota = crearCuota({
    rpmMax: config.gemini.rpmMax,
    limitesDiarios: { 'modelo-principal': config.gemini.rpdMax, 'modelo-respaldo': config.gemini.rpdMaxRespaldo },
  });
  const simulado = h.fetchSimulado(respuestas);
  const esperas = [];
  const gemini = crearServicioGemini({
    config,
    cuota,
    fetchImpl: simulado.fetchImpl,
    esperar: esperar || (async (ms) => esperas.push(ms)),
  });
  return { gemini, cuota, llamadas: simulado.llamadas, esperas };
}

test('junta todas las partes de texto y descarta las de razonamiento', async () => {
  const { gemini } = servicio({
    respuestas: () =>
      h.respuestaGemini(null, {
        parts: [{ text: 'pensando...', thought: true }, { text: 'Primera parte. ' }, { text: 'Segunda parte.' }],
      }),
  });
  const r = await gemini.generar(PEDIDO);
  assert.equal(r.texto, 'Primera parte. Segunda parte.');
  assert.equal(r.modelo, 'modelo-principal');
  assert.equal(r.truncada, false);
});

test('nivel de razonamiento: se envía solo si está configurado', async () => {
  const sin = servicio();
  await sin.gemini.generar(PEDIDO);
  assert.equal(sin.llamadas[0].cuerpo.generationConfig.thinkingConfig, undefined);

  const con = servicio({ env: { GEMINI_NIVEL_RAZONAMIENTO: 'LOW' } });
  await con.gemini.generar(PEDIDO);
  assert.deepEqual(con.llamadas[0].cuerpo.generationConfig.thinkingConfig, { thinkingLevel: 'low' });
});

test('temperatura vacía: no se envía', async () => {
  const { gemini, llamadas } = servicio({ env: { GEMINI_TEMPERATURA: '' } });
  await gemini.generar(PEDIDO);
  assert.equal(llamadas[0].cuerpo.generationConfig.temperature, undefined);
});

test('reintenta un 503 y después responde', async () => {
  const { gemini, llamadas, esperas } = servicio({
    respuestas: (_l, n) => (n === 1 ? h.errorGemini(503) : h.respuestaGemini('ok')),
  });
  const r = await gemini.generar(PEDIDO);
  assert.equal(r.texto, 'ok');
  assert.equal(llamadas.length, 2);
  assert.equal(esperas.length, 1);
});

test('respeta Retry-After corto y no espera uno largo (pasa al respaldo)', async () => {
  const corto = servicio({
    respuestas: (_l, n) => (n === 1 ? h.errorGemini(429, {}, { 'Retry-After': '2' }) : h.respuestaGemini('ok')),
  });
  await corto.gemini.generar(PEDIDO);
  assert.deepEqual(corto.esperas, [2000]);

  const largo = servicio({
    respuestas: (l) =>
      l.modelo === 'modelo-principal' ? h.errorGemini(429, {}, { 'Retry-After': '60' }) : h.respuestaGemini('respaldo'),
  });
  const r = await largo.gemini.generar(PEDIDO);
  assert.equal(r.modelo, 'modelo-respaldo');
  assert.deepEqual(largo.esperas, []);
});

test('cuota diaria agotada en el principal: pasa al respaldo y no vuelve a intentar el principal', async () => {
  const { gemini, llamadas } = servicio({
    respuestas: (l) =>
      l.modelo === 'modelo-principal' ? h.errorGemini(429, h.CUOTA_DIARIA_AGOTADA) : h.respuestaGemini('respaldo'),
  });
  const primera = await gemini.generar(PEDIDO);
  assert.equal(primera.modelo, 'modelo-respaldo');
  const segunda = await gemini.generar(PEDIDO);
  assert.equal(segunda.modelo, 'modelo-respaldo');
  assert.deepEqual(
    llamadas.map((l) => l.modelo),
    ['modelo-principal', 'modelo-respaldo', 'modelo-respaldo']
  );
});

test('principal saturado (503 persistente): pasa al respaldo', async () => {
  const { gemini, llamadas } = servicio({
    respuestas: (l) => (l.modelo === 'modelo-principal' ? h.errorGemini(503) : h.respuestaGemini('respaldo')),
  });
  const r = await gemini.generar(PEDIDO);
  assert.equal(r.modelo, 'modelo-respaldo');
  assert.equal(llamadas.filter((l) => l.modelo === 'modelo-principal').length, 3); // 1 + 2 reintentos
});

test('modelo principal inexistente (404): pasa al respaldo', async () => {
  const { gemini } = servicio({
    respuestas: (l) => (l.modelo === 'modelo-principal' ? h.errorGemini(404) : h.respuestaGemini('respaldo')),
  });
  assert.equal((await gemini.generar(PEDIDO)).modelo, 'modelo-respaldo');
});

test('los dos modelos sin cuota diaria: 429 con mensaje comprensible', async () => {
  const { gemini, llamadas } = servicio({ respuestas: () => h.errorGemini(429, h.CUOTA_DIARIA_AGOTADA) });
  await assert.rejects(gemini.generar(PEDIDO), (e) => e.statusCode === 429 && /cuota diaria/.test(e.message));
  // Siguiente pedido: ya sabe que ambos están agotados y no llama a Google
  await assert.rejects(gemini.generar(PEDIDO), (e) => e.statusCode === 429);
  assert.equal(llamadas.length, 2);
});

test('tope diario propio (GEMINI_RPD_MAX): al llegar, usa el respaldo', async () => {
  const { gemini } = servicio({ env: { GEMINI_RPD_MAX: '1' } });
  assert.equal((await gemini.generar(PEDIDO)).modelo, 'modelo-principal');
  assert.equal((await gemini.generar(PEDIDO)).modelo, 'modelo-respaldo');
});

test('clave inválida (403): error claro y sin respaldo', async () => {
  const { gemini, llamadas } = servicio({ respuestas: () => h.errorGemini(403) });
  await assert.rejects(gemini.generar(PEDIDO), (e) => e.statusCode === 502 && /clave de Gemini/.test(e.message));
  assert.equal(llamadas.length, 1);
});

test('clave mal copiada (400 "API key not valid"): error claro', async () => {
  const { gemini } = servicio({
    respuestas: () => h.errorGemini(400, { error: { code: 400, status: 'INVALID_ARGUMENT', message: 'API key not valid. Please pass a valid API key.' } }),
  });
  await assert.rejects(gemini.generar(PEDIDO), (e) => e.statusCode === 502 && /clave de Gemini/.test(e.message));
});

test('otro 400 de Google: error de configuración comprensible', async () => {
  const { gemini } = servicio({ respuestas: () => h.errorGemini(400, { error: { message: 'Invalid value at generation_config' } }) });
  await assert.rejects(gemini.generar(PEDIDO), (e) => e.statusCode === 502 && /configuración del asistente/.test(e.message));
});

test('pedido bloqueado (promptFeedback.blockReason) → 422', async () => {
  const { gemini } = servicio({
    respuestas: () => new Response(JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } }), { status: 200 }),
  });
  await assert.rejects(gemini.generar(PEDIDO), (e) => e.statusCode === 422 && /filtros de seguridad/.test(e.message));
});

test('respuesta bloqueada (finishReason SAFETY) → 422', async () => {
  const { gemini } = servicio({ respuestas: () => h.respuestaGemini('', { finishReason: 'SAFETY', parts: [] }) });
  await assert.rejects(gemini.generar(PEDIDO), (e) => e.statusCode === 422);
});

test('MAX_TOKENS con texto se devuelve marcado; sin texto es error', async () => {
  const conTexto = servicio({ respuestas: () => h.respuestaGemini('Respuesta cortada', { finishReason: 'MAX_TOKENS' }) });
  const r = await conTexto.gemini.generar(PEDIDO);
  assert.equal(r.truncada, true);

  const sinTexto = servicio({ respuestas: () => h.respuestaGemini('', { finishReason: 'MAX_TOKENS', parts: [] }) });
  await assert.rejects(sinTexto.gemini.generar(PEDIDO), (e) => e.statusCode === 502 && /sin espacio/.test(e.message));
});

test('falla de red: 502 comprensible y el log no incluye el contenido del grupo', async () => {
  const registros = [];
  const originalError = console.error;
  console.error = (...args) => registros.push(args.join(' '));
  try {
    const { gemini } = servicio({
      respuestas: () => {
        throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } });
      },
    });
    await assert.rejects(gemini.generar(PEDIDO), (e) => e.statusCode === 502 && /No se pudo conectar/.test(e.message));
  } finally {
    console.error = originalError;
  }
  assert.ok(registros.some((r) => r.includes('ENOTFOUND')));
  assert.ok(registros.every((r) => !r.includes('TEXTO PRIVADO DEL GRUPO')));
});

// Simula un modelo que no responde nunca (hasta que se cancela el pedido)
function colgado(llamada) {
  return new Promise((_resolve, reject) => {
    llamada.opciones.signal.addEventListener('abort', () =>
      reject(Object.assign(new Error('cancelado'), { name: 'AbortError' }))
    );
  });
}

function servicioConTiempos(respuestas, { timeoutMs, presupuestoTotalMs }) {
  const config = h.configPrueba();
  Object.assign(config.gemini, { timeoutMs, presupuestoTotalMs });
  const simulado = h.fetchSimulado(respuestas);
  return crearServicioGemini({ config, cuota: crearCuota({ rpmMax: 100 }), fetchImpl: simulado.fetchImpl, esperar: async () => {} });
}

test('presupuesto de tiempo: si el principal no responde, el respaldo llega a tiempo', async () => {
  const gemini = servicioConTiempos(
    (l) => (l.modelo === 'modelo-principal' ? colgado(l) : h.respuestaGemini('respaldo')),
    { timeoutMs: 1000, presupuestoTotalMs: 3000 }
  );
  assert.equal((await gemini.generar(PEDIDO)).modelo, 'modelo-respaldo');
});

test('presupuesto de tiempo: nunca supera el total aunque ningún modelo responda', async () => {
  const gemini = servicioConTiempos(colgado, { timeoutMs: 1000, presupuestoTotalMs: 2500 });
  const inicio = Date.now();
  await assert.rejects(gemini.generar(PEDIDO), (e) => e.statusCode === 504 && /tardó demasiado/.test(e.message));
  assert.ok(Date.now() - inicio < 2700, `tardó ${Date.now() - inicio} ms`);
});

test('utilidades: Retry-After y detección de cuota diaria', () => {
  assert.equal(leerRetryAfterMs('3'), 3000);
  assert.equal(leerRetryAfterMs(null), null);
  assert.ok(esCuotaDiaria(JSON.stringify(h.CUOTA_DIARIA_AGOTADA)));
  assert.ok(!esCuotaDiaria('{"error":{"message":"Resource exhausted. Please try again later."}}'));
});
