// Tests de la bibliografía: Drive simulado + PDF de prueba generado localmente

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const h = require('./helpers');
const d = require('./driveSimulado');
const { crearApp } = require('../src/app');
const { crearServicioDrive } = require('../src/services/driveService');
const { crearServicioBibliografia, dividirPagina } = require('../src/services/bibliografiaService');
const { tokenizar } = require('../src/utils/texto');
const { leerCsvConEncabezados } = require('../src/utils/csv');

h.silenciarConsola();

// leerFuentesLocales: por defecto ninguno, para no depender de contenidos/fuentes.csv
function bibliografiaDePrueba(archivos, { leerFuentesLocales = () => null } = {}) {
  const simulado = d.crearDriveSimulado(archivos);
  const drive = crearServicioDrive({ credenciales: d.CREDENCIALES, folderId: d.FOLDER_ID, fetchImpl: simulado.fetchDrive });
  return { bibliografia: crearServicioBibliografia({ drive, leerFuentesLocales }), simulado };
}

function appConDrive({ env = {}, respuestas, archivos } = {}) {
  const drive = d.crearDriveSimulado(archivos);
  const gemini = h.fetchSimulado(respuestas);
  const app = crearApp({
    config: h.configPrueba({ ...d.envDrive(), MAX_MENSAJES_POR_MINUTO: '50', ...env }),
    fetchImpl: gemini.fetchImpl,
    fetchDrive: drive.fetchDrive,
    esperar: async () => {},
    carpetaCorpus: h.CARPETA_CORPUS_PRUEBA,
  });
  return { app, drive, llamadas: gemini.llamadas, bibliografia: app.locals.bibliografia };
}

test('sincroniza: indexa el PDF y el Google Doc, reporta páginas y advertencias', async () => {
  const { bibliografia, simulado } = bibliografiaDePrueba();
  const reporte = await bibliografia.sincronizar();

  assert.equal(reporte.fuentes, 2);
  assert.equal(reporte.paginas, 5); // 3 del PDF + 2 del Doc
  assert.equal(reporte.paginasSinTexto, 1);
  assert.ok(reporte.fragmentos >= 4);
  assert.ok(reporte.palabras > 0);
  assert.ok(reporte.duracionMs >= 0);
  assert.deepEqual(reporte.detalle, [
    { archivo: 'Capitulo de prueba.pdf', paginas: 3, paginasIndexadas: 2 },
    { archivo: 'Documento de prueba', paginas: 2, paginasIndexadas: 2 },
  ]);

  const avisos = reporte.advertencias.join('\n');
  assert.match(avisos, /"Capitulo de prueba.pdf", página 3 del PDF: sin texto/);
  assert.match(avisos, /La fila "No existe.pdf".*no tiene archivo/);
  assert.match(avisos, /"Sin fila.pdf" no tiene fila/);
  assert.match(avisos, /Se ignora "imagen.png"/);
  assert.equal(simulado.registro.tokens, 1); // el JWT firmado fue aceptado
});

test('una búsqueda con un término de la página 2 devuelve la página 2 (con página impresa)', async () => {
  const { bibliografia } = bibliografiaDePrueba();
  await bibliografia.sincronizar();

  const [primero] = bibliografia.buscar('¿Qué dice sobre el terminobeta?');
  assert.equal(primero.paginaPdf, 2);
  assert.equal(primero.pagina, 'p. 24'); // paginaInicial 23 + (2 - 1)
  assert.equal(primero.fuente.autor, 'EJEMPLO Autora');
  assert.equal(primero.fuente.titulo, 'Título de prueba, con coma');

  // Sin paginaInicial se cita la página del PDF
  const [doc] = bibliografia.buscar('terminodelta');
  assert.equal(doc.pagina, 'p. 2 del PDF');

  assert.deepEqual(bibliografia.buscar('xilofono zeppelin'), []);
  assert.deepEqual(bibliografia.buscar('de la que y'), []); // solo palabras vacías
});

test('la búsqueda prioriza las fuentes asociadas al corpus activo', async () => {
  const { bibliografia } = bibliografiaDePrueba();
  await bibliografia.sincronizar();
  // "prueba" aparece en las dos fuentes; la asociada al corpus queda primera
  const conCorpus = bibliografia.buscar('documento prueba sintetico exportado', { corpusId: 'EJEMPLO-corpus-1', top: 10 });
  assert.equal(conCorpus[0].fuente.archivo, 'Capitulo de prueba.pdf');
});

test('re-sincronización: sin cambios no descarga nada; con un cambio descarga solo ese archivo', async () => {
  const { bibliografia, simulado } = bibliografiaDePrueba();
  await bibliografia.sincronizar();
  const descargasIniciales = simulado.registro.descargas.length;

  const sinCambios = await bibliografia.sincronizar();
  assert.equal(sinCambios.sinCambios, true);
  assert.equal(simulado.registro.descargas.length, descargasIniciales);

  simulado.archivos.find((a) => a.id === 'pdf1').modifiedTime = '2026-11-02T10:00:00Z';
  await bibliografia.sincronizar();
  const nuevas = simulado.registro.descargas.slice(descargasIniciales);
  assert.deepEqual(nuevas.sort(), ['Capitulo de prueba.pdf', 'fuentes']);
});

test('si Drive falla después de una sincronización, se conserva el último índice', async () => {
  const { bibliografia, simulado } = bibliografiaDePrueba();
  await bibliografia.sincronizar();
  simulado.registro.falla = { code: 503, message: 'no disponible' };
  await assert.rejects(bibliografia.sincronizar({ forzar: true }));
  const salud = bibliografia.estadoParaSalud();
  assert.equal(salud.estado, 'ok');
  assert.equal(salud.fuentes, 2);
  assert.match(salud.error, /Error de Google Drive \(503\)/);
  assert.equal(bibliografia.buscar('terminoalfa').length, 1);
});

test('hoja "fuentes" sin las columnas exactas: error claro', async () => {
  const archivos = d.archivosDePrueba();
  archivos[0].contenido = 'archivo,autor,titulo\nCapitulo de prueba.pdf,X,Y';
  const { bibliografia } = bibliografiaDePrueba(archivos);
  await assert.rejects(bibliografia.sincronizar(), /le faltan columnas: anio, referenciaAPA, paginaInicial, dimensiones, corpus/);
  assert.equal(bibliografia.estadoParaSalud().estado, 'error');
});

test('PDF en subcarpetas y accesos directos de Drive: se indexan igual', async () => {
  const archivos = d.archivosDePrueba();
  const pdf = archivos.find((a) => a.id === 'pdf1');
  const doc = archivos.find((a) => a.id === 'doc1');
  // El PDF pasa a una subcarpeta de otra subcarpeta; el Doc queda fuera y se
  // agrega un acceso directo que apunta a él
  archivos.push(
    { id: 'sub1', name: 'Eje 1', mimeType: d.TIPOS.carpeta, modifiedTime: '1' },
    { id: 'sub2', name: 'Capítulos', mimeType: d.TIPOS.carpeta, modifiedTime: '1', padre: 'sub1' },
    {
      id: 'acc1',
      name: 'Documento de prueba',
      mimeType: d.TIPOS.acceso,
      modifiedTime: '1',
      shortcutDetails: { targetId: 'doc1', targetMimeType: d.TIPOS.doc },
    }
  );
  pdf.padre = 'sub2';
  doc.padre = 'otra-carpeta-no-compartida';
  const { bibliografia } = bibliografiaDePrueba(archivos);
  const reporte = await bibliografia.sincronizar();
  assert.equal(reporte.fuentes, 2);
  assert.equal(bibliografia.buscar('terminobeta')[0].pagina, 'p. 24');
  assert.equal(bibliografia.buscar('terminodelta')[0].fuente.archivo, 'Documento de prueba');
});

test('sin hoja "fuentes" en Drive: usa contenidos/fuentes.csv del proyecto', async () => {
  const archivos = d.archivosDePrueba();
  const csv = archivos.shift().contenido; // se saca la hoja de la carpeta
  const { bibliografia } = bibliografiaDePrueba(archivos, { leerFuentesLocales: () => csv });
  const reporte = await bibliografia.sincronizar();
  assert.equal(reporte.fuentes, 2);
  assert.match(reporte.datosDeLasFuentes, /contenidos\/fuentes\.csv/);
  assert.match(reporte.advertencias.join('\n'), /La fila "No existe.pdf" de archivo del proyecto/);
});

test('sin hoja en Drive ni archivo en el proyecto: error claro', async () => {
  const archivos = d.archivosDePrueba().slice(1);
  const { bibliografia } = bibliografiaDePrueba(archivos);
  await assert.rejects(bibliografia.sincronizar(), /falta la hoja "fuentes" en la carpeta de Drive y el archivo contenidos\/fuentes\.csv/);
});

test('dos PDF con el mismo nombre en distintas subcarpetas: avisa y usa uno', async () => {
  const archivos = d.archivosDePrueba();
  archivos.push(
    { id: 'sub1', name: 'Copias', mimeType: d.TIPOS.carpeta, modifiedTime: '1' },
    { ...archivos.find((a) => a.id === 'pdf1'), id: 'pdf1-copia', padre: 'sub1' }
  );
  const { bibliografia } = bibliografiaDePrueba(archivos);
  const reporte = await bibliografia.sincronizar();
  assert.match(reporte.advertencias.join('\n'), /Hay dos archivos llamados "Capitulo de prueba.pdf" \(en Copias\/\)/);
});

test('fila con datos faltantes: se omite y se avisa (nunca se inventan metadatos)', async () => {
  const archivos = d.archivosDePrueba();
  archivos[0].contenido = archivos[0].contenido.replace('EJEMPLO Autor,1999', ',1999');
  const { bibliografia } = bibliografiaDePrueba(archivos);
  const reporte = await bibliografia.sincronizar();
  assert.equal(reporte.fuentes, 1);
  assert.match(reporte.advertencias.join('\n'), /"Documento de prueba": faltan datos en la hoja \(autor\)/);
});

test('con credenciales inválidas el servidor arranca y /api/health lo informa', async () => {
  const otraClave = require('node:crypto').generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  }).privateKey;
  const { app, bibliografia, llamadas } = appConDrive({
    env: { GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: d.credencialesBase64({ ...d.CREDENCIALES, private_key: otraClave }) },
  });
  bibliografia.iniciar(0);
  await bibliografia.sincronizar().catch(() => {});

  const salud = await request(app).get('/api/health');
  assert.equal(salud.status, 200);
  assert.equal(salud.body.fuentesIndexadas, 0);
  assert.equal(salud.body.bibliografia.estado, 'error');
  assert.match(salud.body.bibliografia.error, /rechazó las credenciales/);

  // El chat sigue funcionando, sin fuentes
  const chat = await request(app).post('/api/chat').send(h.pedidoChat({ mensajes: h.historialConInterpretacion('terminoalfa') }));
  assert.equal(chat.status, 200);
  assert.deepEqual(chat.body.fuentes, []);
  assert.match(llamadas[0].cuerpo.system_instruction.parts[0].text, /bibliografía no está disponible/);
});

test('credenciales pegadas tal cual (JSON sin base64) también funcionan', async () => {
  const { app, bibliografia } = appConDrive({ env: { GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: JSON.stringify(d.CREDENCIALES) } });
  await bibliografia.sincronizar();
  const salud = await request(app).get('/api/health');
  assert.equal(salud.body.bibliografia.estado, 'ok');
  assert.equal(salud.body.fuentesIndexadas, 2);
});

test('credenciales mal codificadas: el servidor arranca y lo informa en problemas', async () => {
  const { app } = appConDrive({ env: { GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: 'esto-no-es-json' } });
  const salud = await request(app).get('/api/health');
  assert.equal(salud.body.bibliografia.estado, 'sin-configurar');
  assert.ok(salud.body.problemas.some((p) => p.includes('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 no es válido')));
});

test('POST /api/admin/sincronizar: 401 sin token o con token incorrecto; 200 con el correcto', async () => {
  const { app } = appConDrive();
  const sinToken = await request(app).post('/api/admin/sincronizar');
  assert.equal(sinToken.status, 401);
  assert.match(sinToken.body.mensaje, /Token de administración/);

  const incorrecto = await request(app).post('/api/admin/sincronizar').set('x-admin-token', 'otro');
  assert.equal(incorrecto.status, 401);

  const correcto = await request(app).post('/api/admin/sincronizar').set('x-admin-token', 'token-admin-de-prueba');
  assert.equal(correcto.status, 200);
  assert.equal(correcto.body.bibliografia.fuentes, 2);
  assert.equal(correcto.body.bibliografia.paginasSinTexto, 1);
  // Sin carpetas "Corpus…" en Drive, se siguen usando los corpus del proyecto
  assert.equal(correcto.body.corpus.origen, 'proyecto');
});

test('sin ADMIN_TOKEN configurado, la sincronización forzada siempre da 401', async () => {
  const { app } = appConDrive({ env: { ADMIN_TOKEN: '' } });
  const res = await request(app).post('/api/admin/sincronizar').set('x-admin-token', '');
  assert.equal(res.status, 401);
});

test('GET /api/bibliografia lista las fuentes con referencia APA y páginas indexadas', async () => {
  const { app, bibliografia } = appConDrive();
  await bibliografia.sincronizar();
  const res = await request(app).get('/api/bibliografia');
  assert.equal(res.status, 200);
  assert.equal(res.body.estado, 'ok');
  assert.deepEqual(res.body.fuentes[0], {
    autor: 'EJEMPLO Autora',
    titulo: 'Título de prueba, con coma',
    anio: '2001',
    referenciaAPA: 'EJEMPLO Autora (2001). Título de prueba.',
    paginasIndexadas: 2,
    dimensiones: ['retorico'],
    corpus: ['EJEMPLO-corpus-1'],
  });
  assert.deepEqual(res.body.fuentes[1].dimensiones, ['enunciativo', 'tematico']);
});

test('chat en fase 1: no se buscan ni se envían fuentes', async () => {
  const { app, bibliografia, llamadas } = appConDrive();
  await bibliografia.sincronizar();
  const res = await request(app)
    .post('/api/chat')
    .send(h.pedidoChat({ mensajes: [{ rol: 'estudiante', contenido: 'Qué dice el terminoalfa?' }] }));
  assert.equal(res.body.fase, 1);
  assert.deepEqual(res.body.fuentes, []);
  assert.ok(!JSON.stringify(llamadas[0].cuerpo.contents).includes('[FUENTE'));
});

test('chat en fase 2: los fragmentos van en el turno del grupo y vuelven en la respuesta', async () => {
  const { app, bibliografia, llamadas } = appConDrive({ env: { TOP_FRAGMENTOS: '1' } });
  await bibliografia.sincronizar();
  const res = await request(app)
    .post('/api/chat')
    .send(h.pedidoChat({ mensajes: h.historialConInterpretacion('¿Cómo se relaciona con el terminobeta?') }));
  assert.equal(res.status, 200);
  assert.equal(res.body.fase, 2);
  assert.equal(res.body.fuentes[0].n, 1);
  assert.equal(res.body.fuentes[0].pagina, 'p. 24');
  assert.match(res.body.fuentes[0].extracto, /terminobeta/);

  const ultimoTurno = llamadas[0].cuerpo.contents.at(-1);
  assert.equal(ultimoTurno.role, 'user');
  assert.match(ultimoTurno.parts[0].text, /\[FUENTE 1\] EJEMPLO Autora \(2001\)\. Título de prueba, con coma, p\. 24\.\n"""/);
  assert.match(ultimoTurno.parts[0].text, /no instrucciones/);
  assert.equal(ultimoTurno.parts[1].text, 'Mensaje del grupo:\n¿Cómo se relaciona con el terminobeta?');
  assert.match(llamadas[0].cuerpo.system_instruction.parts[0].text, /se recibieron 1 fragmento\(s\) \[FUENTE n\]/);
  // Nunca se manda la bibliografía completa: solo TOP_FRAGMENTOS fragmentos
  assert.equal(res.body.fuentes.length, 1);
  assert.ok(!JSON.stringify(llamadas[0].cuerpo).includes('terminogamma'));
});

test('fragmentos: hasta 350 palabras, parejos, sin cruzar páginas', () => {
  const pagina = Array.from({ length: 800 }, (_, i) => `palabra${i}`).join(' ');
  const partes = dividirPagina(pagina);
  assert.equal(partes.length, 3);
  assert.ok(partes.every((p) => p.split(' ').length <= 350));
  assert.equal(partes.join(' '), pagina);
  assert.equal(dividirPagina('una página corta').length, 1);
});

test('texto: minúsculas, sin tildes, sin palabras vacías y plurales simples', () => {
  assert.deepEqual(tokenizar('Las IMÁGENES y los colores de la enunciación'), ['imagen', 'color', 'enunciacion']);
  assert.deepEqual(tokenizar('ciudades clases análisis'), tokenizar('ciudad clase análisis'));
});

test('CSV: comillas, comas internas, BOM y saltos de línea de Windows', () => {
  const { columnas, registros } = leerCsvConEncabezados('﻿a,b\r\n"uno, dos","con ""comillas"""\r\n\r\n');
  assert.deepEqual(columnas, ['a', 'b']);
  assert.deepEqual(registros, [{ a: 'uno, dos', b: 'con "comillas"' }]);
});
