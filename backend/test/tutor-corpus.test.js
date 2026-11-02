// Tests de la Etapa 3: prompt del tutor, corpus, dimensiones, consigna e imágenes

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const h = require('./helpers');
const { construirInstruccionesTutor } = require('../src/prompts/tutorLV3');
const { cargarCorpus } = require('../src/services/corpusService');

h.silenciarConsola();

const CORPUS = {
  id: 'c1',
  titulo: 'Título del corpus',
  problematica: 'Problemática del corpus',
  ejeComparabilidad: 'Eje del corpus',
  imagenes: [1, 2, 3].map((n) => ({
    id: `i${n}`,
    archivo: `i${n}.jpg`,
    titulo: `Obra ${n}`,
    autor: `Autor ${n}`,
    anio: '2000',
    soporte: 'afiche',
    procedencia: 'archivo',
    textoAlternativo: `DESCRIPCION-SECRETA-${n}`,
  })),
};

test('prompt: incluye reglas, dimensiones, contexto del corpus y fase', () => {
  const texto = construirInstruccionesTutor(CORPUS, { fase: 2, bibliografiaDisponible: true, fuentesRecibidas: 3 });
  for (const esperado of [
    'Lenguaje Visual III',
    'Nunca uses "vosotros"',
    'No escribís el análisis',
    'No inventás citas',
    'Género y estilo',
    'Nivel retórico',
    'Nivel temático',
    'Nivel enunciativo',
    'Análisis comparativo',
    'Corpus: Título del corpus',
    'Problemática: Problemática del corpus',
    'Eje de comparabilidad: Eje del corpus',
    'Imagen 2: «Obra 2», Autor 2, 2000. Soporte: afiche. Procedencia: archivo.',
    'Fase actual: 2, revisión con bibliografía.',
    'se recibieron 3 fragmento(s)',
    'no recibiste las imágenes.',
  ]) {
    assert.ok(texto.includes(esperado), `falta: ${esperado}`);
  }
});

test('prompt: nunca incluye el texto alternativo (el tutor no "ve" las imágenes)', () => {
  const texto = construirInstruccionesTutor(CORPUS, { fase: 3, imagenesRecibidas: true });
  assert.ok(!texto.includes('DESCRIPCION-SECRETA'));
  assert.ok(texto.includes('recibiste las tres imágenes'));
});

test('prompt: indica el estado de la bibliografía según la fase', () => {
  assert.match(construirInstruccionesTutor(CORPUS, { fase: 1, bibliografiaDisponible: true }), /en la fase 1 no se envía bibliografía/);
  assert.match(construirInstruccionesTutor(CORPUS, { fase: 2 }), /la bibliografía no está disponible/);
  assert.match(
    construirInstruccionesTutor(CORPUS, { fase: 2, bibliografiaDisponible: true, fuentesRecibidas: 0 }),
    /no se encontraron fragmentos/
  );
});

test('GET /api/corpus lista id, título y problemática', async () => {
  const { app } = h.appDePrueba();
  const res = await request(app).get('/api/corpus');
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(res.body[0]).sort(), ['id', 'problematica', 'titulo']);
  assert.equal(res.body[0].id, h.CORPUS_ID);
});

test('GET /api/corpus/:id devuelve el corpus con URLs de imágenes y sin rutas internas', async () => {
  const { app } = h.appDePrueba();
  const res = await request(app).get(`/api/corpus/${h.CORPUS_ID}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.imagenes.length, 3);
  assert.equal(res.body.imagenes[0].url, `/imagenes/${h.CORPUS_ID}/img1`);
  assert.ok(res.body.imagenes.every((imagen) => !('archivo' in imagen)));
  assert.ok(!JSON.stringify(res.body).includes('contenidos'));

  const imagen = await request(app).get(res.body.imagenes[0].url);
  assert.equal(imagen.status, 200);
  assert.equal(imagen.headers['content-type'], 'image/jpeg');
  assert.equal(imagen.headers['cross-origin-resource-policy'], 'cross-origin');

  assert.equal((await request(app).get('/api/corpus/no-existe')).status, 404);
});

test('GET /api/dimensiones devuelve las 5 dimensiones de la consigna con preguntas guía', async () => {
  const { app } = h.appDePrueba();
  const res = await request(app).get('/api/dimensiones');
  assert.equal(res.status, 200);
  assert.deepEqual(
    res.body.dimensiones.map((d) => d.nombre),
    ['Género y estilo', 'Nivel retórico', 'Nivel temático', 'Nivel enunciativo', 'Análisis comparativo']
  );
  assert.ok(res.body.dimensiones.every((d) => d.descripcion && d.preguntasGuia.length > 0));
});

test('GET /api/consigna devuelve el texto de contenidos/consigna.md', async () => {
  const { app } = h.appDePrueba();
  const res = await request(app).get('/api/consigna');
  assert.equal(res.status, 200);
  assert.match(res.body.texto, /Trabajo Final Integrador/);
});

test('chat con incluirImagenes: adjunta las 3 imágenes como inline_data solo en ese turno', async () => {
  const { app, llamadas } = h.appDePrueba({ env: { MAX_MENSAJES_POR_MINUTO: '50' } });
  const res = await request(app)
    .post('/api/chat')
    .send(h.pedidoChat({ mensajes: h.historialConInterpretacion('¿Qué observan en las imágenes?'), incluirImagenes: true }));
  assert.equal(res.status, 200);
  assert.equal(res.body.imagenesIncluidas, true);

  const { contents, system_instruction: sistema } = llamadas[0].cuerpo;
  const ultimo = contents.at(-1);
  const imagenes = ultimo.parts.filter((p) => p.inline_data);
  assert.equal(imagenes.length, 3);
  assert.equal(imagenes[0].inline_data.mime_type, 'image/jpeg');
  assert.ok(imagenes[0].inline_data.data.length > 1000);
  assert.equal(ultimo.parts[0].text, 'Imagen 1 del corpus: «EJEMPLO»');
  assert.equal(ultimo.parts.at(-1).text, 'Mensaje del grupo:\n¿Qué observan en las imágenes?');
  assert.match(sistema.parts[0].text, /recibiste las tres imágenes/);
  // Los turnos anteriores no llevan imágenes
  assert.ok(contents.slice(0, -1).every((c) => c.parts.every((p) => !p.inline_data)));

  // El siguiente mensaje, sin pedirlas, ya no las envía
  await request(app).post('/api/chat').send(h.pedidoChat({ mensajes: h.historialConInterpretacion('Seguimos.') }));
  assert.ok(llamadas[1].cuerpo.contents.every((c) => c.parts.every((p) => !p.inline_data)));
});

test('corpus: valida archivos de imagen (que existan y sean JPG, PNG o WEBP)', () => {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'corpus-'));
  fs.mkdirSync(path.join(carpeta, 'imagenes'));
  const imagenes = ['a.jpg', 'b.svg', 'falta.png'].map((archivo, i) => ({
    id: `i${i}`,
    archivo,
    titulo: 't',
    textoAlternativo: 'alt',
  }));
  fs.writeFileSync(path.join(carpeta, 'imagenes', 'a.jpg'), 'x');
  fs.writeFileSync(
    path.join(carpeta, 'corpus.json'),
    JSON.stringify([{ id: 'c', titulo: 't', problematica: 'p', ejeComparabilidad: 'e', imagenes }])
  );
  const servicio = cargarCorpus(carpeta);
  assert.equal(servicio.listar().length, 0);
  const problemas = servicio.problemas.join('\n');
  assert.match(problemas, /"b.svg" tiene que ser JPG, PNG o WEBP/);
  assert.match(problemas, /no se encontró el archivo "falta.png"/);
  fs.rmSync(carpeta, { recursive: true, force: true });
});
