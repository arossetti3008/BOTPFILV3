// Tests de la carpeta contenedora de Drive: bibliografía común y una carpeta
// por corpus con 3 fotos y su ficha (Drive simulado, datos marcados EJEMPLO)

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const h = require('./helpers');
const d = require('./driveSimulado');
const { crearApp } = require('../src/app');
const { parsearFicha } = require('../src/utils/ficha');

h.silenciarConsola();

const FOTOS = ['EJEMPLO-1.jpg', 'EJEMPLO-2.jpg', 'EJEMPLO-3.jpg'].map((nombre) =>
  fs.readFileSync(path.join(h.CARPETA_CORPUS_PRUEBA, 'imagenes', nombre))
);
const T = '2026-11-01T10:00:00Z';

const FICHA = `Problemática: EJEMPLO de problemática sociocultural
del corpus, en dos renglones.
Eje de comparabilidad: EJEMPLO de eje.

Imagen 1
Título: EJEMPLO Obra uno
Autora: EJEMPLO Artista
Año: 1978
Técnica: Fotografía
Procedencia: EJEMPLO Museo
Enlace: https://ejemplo.org/obra-1

Imagen 2
Título: EJEMPLO Obra dos

Imagen 3
Título: EJEMPLO Obra tres
Texto alternativo: EJEMPLO descripción de la tercera.`;

function carpeta(id, name, padre) {
  return { id, name, mimeType: d.TIPOS.carpeta, modifiedTime: T, ...(padre ? { padre } : {}) };
}

function foto(id, name, padre, n) {
  return { id, name, mimeType: 'image/jpeg', modifiedTime: T, padre, contenido: FOTOS[n] };
}

// Contenedora: Bibliografía (con la bibliografía de prueba), Corpus 1 válido
// y Corpus 2 con solo 2 fotos
function contenedorDePrueba() {
  const bibliografia = d.archivosDePrueba().map((a) => ({ ...a, padre: 'bib' }));
  return [
    carpeta('bib', 'Bibliografía'),
    ...bibliografia,
    carpeta('c1', 'Corpus 1'),
    foto('f1', '01.jpg', 'c1', 0),
    foto('f2', '02.jpg', 'c1', 1),
    foto('f3', '03.jpg', 'c1', 2),
    { id: 'ficha1', name: 'Ficha', mimeType: d.TIPOS.doc, modifiedTime: T, padre: 'c1', contenido: FICHA },
    carpeta('c2', 'Corpus 2'),
    foto('g1', 'a.jpg', 'c2', 0),
    foto('g2', 'b.jpg', 'c2', 1),
    { id: 'ficha2', name: 'ficha', mimeType: d.TIPOS.doc, modifiedTime: T, padre: 'c2', contenido: FICHA },
  ];
}

function appConContenedor(archivos = contenedorDePrueba()) {
  const drive = d.crearDriveSimulado(archivos);
  const gemini = h.fetchSimulado();
  const app = crearApp({
    config: h.configPrueba({ ...d.envDrive(), MAX_MENSAJES_POR_MINUTO: '50' }),
    fetchImpl: gemini.fetchImpl,
    fetchDrive: drive.fetchDrive,
    esperar: async () => {},
    carpetaCorpus: h.CARPETA_CORPUS_PRUEBA,
  });
  return { app, drive, llamadas: gemini.llamadas, corpus: app.locals.corpus };
}

function sincronizar(app) {
  return request(app).post('/api/admin/sincronizar').set('x-admin-token', 'token-admin-de-prueba');
}

test('ficha: etiquetas con sinónimos, tildes, viñetas y textos de varios renglones', () => {
  const ficha = parsearFicha(`**Título del corpus:** EJEMPLO
- Problemática: primera parte
segunda parte
EJE DE COMPARACIÓN: el eje

IMAGEN 1 - Obra con título en el encabezado
Artista: EJEMPLO
Fecha: 1990
Link: https://ejemplo.org/a:b
Imagen 2:
Obra: Segunda
Descripción: texto
alternativo largo`);
  assert.equal(ficha.titulo, 'EJEMPLO');
  assert.equal(ficha.problematica, 'primera parte segunda parte');
  assert.equal(ficha.ejeComparabilidad, 'el eje');
  assert.equal(ficha.imagenes.length, 2);
  assert.deepEqual(ficha.imagenes[0], {
    titulo: 'Obra con título en el encabezado',
    autor: 'EJEMPLO',
    anio: '1990',
    fuente: 'https://ejemplo.org/a:b',
  });
  assert.equal(ficha.imagenes[1].titulo, 'Segunda');
  assert.equal(ficha.imagenes[1].textoAlternativo, 'texto alternativo largo');
});

test('contenedora: los corpus salen de las carpetas "Corpus…" y la bibliografía de "Bibliografía"', async () => {
  const { app } = appConContenedor();
  const res = await sincronizar(app);
  assert.equal(res.status, 200);

  // Bibliografía: solo la carpeta "Bibliografía"
  assert.equal(res.body.bibliografia.fuentes, 2);
  assert.equal(res.body.bibliografia.carpetaBibliografia, 'carpeta "Bibliografía"');

  // Corpus: el de Drive reemplaza a los del proyecto; Corpus 2 no es válido
  assert.equal(res.body.corpus.origen, 'drive');
  assert.deepEqual(res.body.corpus.corpus, [{ id: 'corpus-1', titulo: 'Corpus 1' }]);
  assert.ok(res.body.corpus.advertencias.some((a) => a.includes('Carpeta "Corpus 2": Tiene 2 fotos')));

  const lista = await request(app).get('/api/corpus');
  assert.deepEqual(
    lista.body.map((c) => c.id),
    ['corpus-1']
  );

  const corpus = (await request(app).get('/api/corpus/corpus-1')).body;
  assert.equal(corpus.problematica, 'EJEMPLO de problemática sociocultural del corpus, en dos renglones.');
  assert.deepEqual(corpus.imagenes[0], {
    id: 'img1',
    url: '/imagenes/corpus-1/img1?v=20261101T100000Z',
    titulo: 'EJEMPLO Obra uno',
    autor: 'EJEMPLO Artista',
    anio: '1978',
    soporte: 'Fotografía',
    procedencia: 'EJEMPLO Museo',
    fuente: 'https://ejemplo.org/obra-1',
    textoAlternativo: 'Imagen del corpus: «EJEMPLO Obra uno», de EJEMPLO Artista.',
  });
  assert.equal(corpus.imagenes[2].textoAlternativo, 'EJEMPLO descripción de la tercera.');
  assert.ok(!JSON.stringify(corpus).includes('f1'), 'no expone ids de Drive');

  const imagen = await request(app).get(corpus.imagenes[1].url);
  assert.equal(imagen.status, 200);
  assert.equal(imagen.headers['content-type'], 'image/jpeg');
  assert.ok(imagen.body.equals(FOTOS[1]));
  assert.equal((await request(app).get('/imagenes/corpus-1/img9')).status, 404);

  const salud = await request(app).get('/api/health');
  assert.equal(salud.body.corpus.origen, 'drive');
  assert.equal(salud.body.corpusDisponibles, 1);
});

test('contenedora: el chat usa la ficha y las fotos del corpus de Drive', async () => {
  const { app, llamadas } = appConContenedor();
  await sincronizar(app);
  const res = await request(app)
    .post('/api/chat')
    .send(h.pedidoChat({ corpusId: 'corpus-1', mensajes: h.historialConInterpretacion('Miremos las imágenes.'), incluirImagenes: true }));
  assert.equal(res.status, 200);
  const { contents, system_instruction: sistema } = llamadas[0].cuerpo;
  const imagenes = contents.at(-1).parts.filter((p) => p.inline_data);
  assert.equal(imagenes.length, 3);
  assert.equal(imagenes[2].inline_data.data, FOTOS[2].toString('base64'));
  assert.match(sistema.parts[0].text, /EJEMPLO de eje/);
  assert.match(sistema.parts[0].text, /EJEMPLO Obra dos/);
});

test('contenedora: "Archivo:" en la ficha asigna cada foto aunque no estén en orden', async () => {
  const archivos = contenedorDePrueba();
  archivos.find((a) => a.id === 'ficha1').contenido = FICHA.replace(
    'Título: EJEMPLO Obra uno',
    'Archivo: 03\nTítulo: EJEMPLO Obra uno'
  ).replace('Título: EJEMPLO Obra tres', 'Archivo: 01.JPG\nTítulo: EJEMPLO Obra tres');
  const { app } = appConContenedor(archivos);
  await sincronizar(app);
  const imagen = await request(app).get('/imagenes/corpus-1/img1');
  assert.ok(imagen.body.equals(FOTOS[2]));
  assert.ok((await request(app).get('/imagenes/corpus-1/img3')).body.equals(FOTOS[0]));
});

test('contenedora: si una ficha se rompe, se sigue usando la última versión válida', async () => {
  const { app, drive } = appConContenedor();
  await sincronizar(app);

  const ficha = drive.archivos.find((a) => a.id === 'ficha1');
  ficha.contenido = 'Problemática: sin imágenes';
  ficha.modifiedTime = '2026-11-02T10:00:00Z';
  const res = await sincronizar(app);
  assert.deepEqual(
    res.body.corpus.corpus.map((c) => c.id),
    ['corpus-1']
  );
  assert.ok(res.body.corpus.advertencias.some((a) => a.includes('La ficha describe 0 imágenes')));
  assert.ok(res.body.corpus.advertencias.some((a) => a.includes('se sigue usando la última versión que funcionó')));

  // Si Drive deja de responder, también se conserva lo que había
  drive.registro.falla = { code: 500, message: 'error' };
  const caido = await sincronizar(app);
  assert.equal(caido.status, 502);
  assert.equal((await request(app).get('/api/corpus')).body[0].id, 'corpus-1');
  assert.equal((await request(app).get('/api/health')).body.corpus.estado, 'error');
});

test('contenedora sin carpeta "Bibliografía": se usa toda la carpeta, salteando las de corpus', async () => {
  const archivos = contenedorDePrueba()
    .filter((a) => a.id !== 'bib')
    .map((a) => (a.padre === 'bib' ? { ...a, padre: undefined } : a));
  archivos.push({ id: 'pdf-corpus', name: 'No es bibliografia.pdf', mimeType: d.TIPOS.pdf, modifiedTime: T, padre: 'c1', contenido: 'x' });
  const { app } = appConContenedor(archivos);
  const res = await sincronizar(app);
  assert.equal(res.body.bibliografia.fuentes, 2);
  assert.match(res.body.bibliografia.carpetaBibliografia, /carpeta principal/);
  assert.ok(!JSON.stringify(res.body.bibliografia).includes('No es bibliografia'));
  // El PDF de la carpeta de corpus se avisa ahí, no como bibliografía
  assert.ok(res.body.corpus.advertencias.some((a) => a.includes('Se ignora "No es bibliografia.pdf"')));
});

test('al arrancar, /api/corpus espera la primera lectura de Drive', async () => {
  const { app, corpus } = appConContenedor();
  corpus.iniciar(0);
  const lista = await request(app).get('/api/corpus');
  assert.deepEqual(
    lista.body.map((c) => c.id),
    ['corpus-1']
  );
});
