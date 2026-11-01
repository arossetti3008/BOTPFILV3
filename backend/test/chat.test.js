// Tests de la API: /api/health, /api/config-taller y /api/chat (Gemini simulado)

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const h = require('./helpers');

h.silenciarConsola();

test('GET /api/health informa estado y modelo sin exponer la clave', async () => {
  const { app } = h.appDePrueba();
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.estado, 'ok');
  assert.equal(res.body.modelo, 'modelo-principal');
  assert.equal(res.body.modeloRespaldo, 'modelo-respaldo');
  assert.equal(res.body.fuentesIndexadas, 0);
  assert.ok(!JSON.stringify(res.body).includes('clave-de-prueba'));
});

test('sin LLM_API_KEY el servidor arranca, /api/health y /api/chat lo informan', async () => {
  const { app, llamadas } = h.appDePrueba({ env: { LLM_API_KEY: '' } });
  const salud = await request(app).get('/api/health');
  assert.equal(salud.body.estado, 'incompleto');
  assert.ok(salud.body.problemas.some((p) => p.includes('LLM_API_KEY')));

  const chat = await request(app).post('/api/chat').send(h.pedidoChat());
  assert.equal(chat.status, 503);
  assert.match(chat.body.mensaje, /no está configurado/);
  assert.equal(llamadas.length, 0);
});

test('GET /api/config-taller devuelve comisiones, formato de grupo, límites y aviso', async () => {
  const { app } = h.appDePrueba();
  const res = await request(app).get('/api/config-taller');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.comisiones.map((c) => c.letra), ['M', 'T']);
  assert.equal(res.body.formatoGrupo.patron, '^[MT][0-9]{1,2}$');
  assert.equal(res.body.limites.maxCaracteresMensaje, 2000);
  assert.equal(res.body.limites.mensajesPorMinuto, 6);
  assert.ok(res.body.aviso.puntos.length >= 3);
});

test('POST /api/chat válido responde y arma bien el pedido a Gemini', async () => {
  const { app, llamadas } = h.appDePrueba();
  const res = await request(app).post('/api/chat').send(h.pedidoChat({ grupo: 'm1' }));
  assert.equal(res.status, 200);
  assert.equal(res.body.respuesta, 'Respuesta simulada del asistente.');
  assert.deepEqual(res.body.fuentes, []);
  assert.equal(res.body.imagenesIncluidas, false);
  assert.equal(res.body.fase, 1);
  assert.equal(res.body.modelo, 'modelo-principal');

  assert.equal(llamadas.length, 1);
  const { url, opciones, cuerpo } = llamadas[0];
  assert.match(url, /models\/modelo-principal:generateContent$/);
  assert.equal(opciones.headers['x-goog-api-key'], 'clave-de-prueba');
  assert.equal(cuerpo.generationConfig.maxOutputTokens, 800);
  assert.equal(cuerpo.generationConfig.temperature, 0.6);
  assert.ok(cuerpo.system_instruction.parts[0].text.includes('Lenguaje Visual III'));
  assert.deepEqual(cuerpo.contents, [
    { role: 'user', parts: [{ text: 'Observamos tres afiches con colores saturados.' }] },
  ]);
});

test('un mensaje de 2001 caracteres devuelve 400; uno de 2000 se acepta', async () => {
  const { app } = h.appDePrueba();
  const largo = await request(app)
    .post('/api/chat')
    .send(h.pedidoChat({ mensajes: [{ rol: 'estudiante', contenido: 'a'.repeat(2001) }] }));
  assert.equal(largo.status, 400);
  assert.match(largo.body.mensaje, /demasiado largo.*2001.*2000/);

  const justo = await request(app)
    .post('/api/chat')
    .send(h.pedidoChat({ mensajes: [{ rol: 'estudiante', contenido: 'a'.repeat(2000) }] }));
  assert.equal(justo.status, 200);
});

test('el mensaje 7 en un minuto del mismo grupo devuelve 429 en español; otro grupo no se bloquea', async () => {
  const { app } = h.appDePrueba();
  for (let i = 1; i <= 6; i++) {
    const res = await request(app).post('/api/chat').send(h.pedidoChat());
    assert.equal(res.status, 200, `el mensaje ${i} tendría que pasar`);
  }
  const septimo = await request(app).post('/api/chat').send(h.pedidoChat());
  assert.equal(septimo.status, 429);
  assert.match(septimo.body.mensaje, /muy rápido.*6 por minuto/);

  const otroGrupo = await request(app).post('/api/chat').send(h.pedidoChat({ grupo: 'M2' }));
  assert.equal(otroGrupo.status, 200);
  const otraComision = await request(app).post('/api/chat').send(h.pedidoChat({ comision: 'tarde', grupo: 'T1' }));
  assert.equal(otraComision.status, 200);
});

test('los pedidos inválidos no consumen el límite del grupo', async () => {
  const { app } = h.appDePrueba();
  for (let i = 0; i < 8; i++) {
    await request(app).post('/api/chat').send(h.pedidoChat({ mensajes: [] }));
  }
  const res = await request(app).post('/api/chat').send(h.pedidoChat());
  assert.equal(res.status, 200);
});

test('tope diario por grupo (MAX_MENSAJES_SESION)', async () => {
  const { app } = h.appDePrueba({ env: { MAX_MENSAJES_SESION: '3', MAX_MENSAJES_POR_MINUTO: '50' } });
  for (let i = 0; i < 3; i++) {
    assert.equal((await request(app).post('/api/chat').send(h.pedidoChat())).status, 200);
  }
  const cuarto = await request(app).post('/api/chat').send(h.pedidoChat());
  assert.equal(cuarto.status, 429);
  assert.match(cuarto.body.mensaje, /máximo de 3 mensajes por día/);
});

test('validaciones de comisión, grupo, corpus y mensajes devuelven 400 en español', async () => {
  const { app, llamadas } = h.appDePrueba();
  const casos = [
    [{ comision: 'noche' }, /comisión válida/],
    [{ grupo: 'X1' }, /código de grupo no es válido/],
    [{ grupo: 'M123' }, /código de grupo no es válido/],
    [{ comision: 'manana', grupo: 'T1' }, /tiene que empezar con M/],
    [{ corpusId: 'no-existe' }, /corpus elegido no existe/],
    [{ mensajes: [] }, /ningún mensaje/],
    [{ mensajes: [{ rol: 'otro', contenido: 'hola' }] }, /formato inválido/],
    [{ mensajes: [{ rol: 'estudiante', contenido: '   ' }] }, /formato inválido/],
    [
      { mensajes: [{ rol: 'estudiante', contenido: 'hola' }, { rol: 'tutor', contenido: 'hola' }] },
      /último mensaje tiene que ser del grupo/,
    ],
  ];
  for (const [cambio, esperado] of casos) {
    const res = await request(app).post('/api/chat').send(h.pedidoChat(cambio));
    assert.equal(res.status, 400, JSON.stringify(cambio));
    assert.match(res.body.mensaje, esperado);
  }
  assert.equal(llamadas.length, 0);
});

test('el backend recorta el historial a MAX_MENSAJES_HISTORIAL', async () => {
  const { app, llamadas } = h.appDePrueba();
  const mensajes = [];
  for (let i = 0; i < 15; i++) {
    mensajes.push({ rol: 'estudiante', contenido: `mensaje del grupo ${i}` });
    mensajes.push({ rol: 'tutor', contenido: `respuesta ${i}` });
  }
  mensajes.push({ rol: 'estudiante', contenido: 'último mensaje' });
  const res = await request(app).post('/api/chat').send(h.pedidoChat({ mensajes }));
  assert.equal(res.status, 200);
  const { contents } = llamadas[0].cuerpo;
  assert.ok(contents.length <= 20);
  assert.equal(contents[0].role, 'user'); // nunca empieza con un turno del modelo
  assert.equal(contents.at(-1).parts[0].text, 'último mensaje');
});

test('fases: 1 al empezar, 2 con la interpretación escrita, 3 solo después de la fase 2', async () => {
  const { app } = h.appDePrueba({ env: { MAX_MENSAJES_POR_MINUTO: '50' } });

  const inicio = await request(app).post('/api/chat').send(h.pedidoChat());
  assert.equal(inicio.body.fase, 1);

  const comparacionTemprana = await request(app).post('/api/chat').send(h.pedidoChat({ comparacion: true }));
  assert.equal(comparacionTemprana.status, 400);
  assert.match(comparacionTemprana.body.mensaje, /primero tienen que escribir su propia interpretación/);

  const imagenesTemprano = await request(app).post('/api/chat').send(h.pedidoChat({ incluirImagenes: true }));
  assert.equal(imagenesTemprano.status, 400);
  assert.match(imagenesTemprano.body.mensaje, /observaciones del asistente sobre las imágenes/);

  const conInterpretacion = await request(app)
    .post('/api/chat')
    .send(h.pedidoChat({ mensajes: h.historialConInterpretacion() }));
  assert.equal(conInterpretacion.body.fase, 2);

  const comparacion = await request(app)
    .post('/api/chat')
    .send(h.pedidoChat({ mensajes: h.historialConInterpretacion(), comparacion: true }));
  assert.equal(comparacion.status, 200);
  assert.equal(comparacion.body.fase, 3);
});

test('guardia global por minuto: no llama a Gemini y responde 429 con tiempo sugerido', async () => {
  const { app, llamadas } = h.appDePrueba({ env: { GEMINI_RPM_MAX: '2' } });
  assert.equal((await request(app).post('/api/chat').send(h.pedidoChat({ grupo: 'M1' }))).status, 200);
  assert.equal((await request(app).post('/api/chat').send(h.pedidoChat({ grupo: 'M2' }))).status, 200);
  const tercero = await request(app).post('/api/chat').send(h.pedidoChat({ grupo: 'M3' }));
  assert.equal(tercero.status, 429);
  assert.match(tercero.body.mensaje, /atendiendo a varios grupos/);
  assert.ok(Number(tercero.headers['retry-after']) > 0);
  assert.equal(llamadas.length, 2);
});

test('CORS solo acepta el origen configurado', async () => {
  const { app } = h.appDePrueba();
  const permitido = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
  assert.equal(permitido.headers['access-control-allow-origin'], 'http://localhost:5173');
  // Se responde siempre con el origen fijo: el navegador del sitio ajeno lo rechaza
  const ajeno = await request(app).get('/api/health').set('Origin', 'https://otro-sitio.com');
  assert.equal(ajeno.headers['access-control-allow-origin'], 'http://localhost:5173');
  assert.notEqual(ajeno.headers['access-control-allow-origin'], '*');
});

test('ruta inexistente devuelve 404 con mensaje', async () => {
  const { app } = h.appDePrueba();
  const res = await request(app).get('/api/no-existe');
  assert.equal(res.status, 404);
  assert.match(res.body.mensaje, /Ruta no encontrada/);
});
