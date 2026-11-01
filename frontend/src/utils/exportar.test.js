// Tests de la exportación: metadatos, orden, autoría (grupo / IA) y consentimiento
import test from 'node:test';
import assert from 'node:assert/strict';
import { generarJson, generarTxt, nombreArchivo, VERSION_FORMATO } from './exportar.js';

// Fechas armadas en hora local para que el test no dependa del huso horario
const local = (anio, mes, dia, h, min) => new Date(anio, mes - 1, dia, h, min).toISOString();

function conversacionDePrueba(consentimiento) {
  return {
    version: 1,
    comision: 'manana',
    grupo: 'M3',
    corpusId: 'corpus-1-feminidad',
    corpusTitulo: 'Corpus 1 — Representaciones de la feminidad',
    inicio: local(2026, 11, 12, 9, 5),
    consentimiento,
    mensajesExportados: 0,
    mensajes: [
      { id: 'a', rol: 'estudiante', contenido: 'Primero: vemos una mujer en la calle.', hora: local(2026, 11, 12, 9, 6), fase: 1 },
      { id: 'b', rol: 'tutor', contenido: '¿Qué elementos sostienen esa lectura?', hora: local(2026, 11, 12, 9, 6), fase: 1, modelo: 'gemini-3.5-flash-lite', fuentes: [], imagenesIncluidas: false },
      { id: 'c', rol: 'estudiante', contenido: 'Queremos tus observaciones sobre las imágenes.', hora: local(2026, 11, 12, 9, 20), fase: 2, pidioImagenes: true },
      {
        id: 'd',
        rol: 'tutor',
        contenido: 'Mi lectura visual puede tener errores.',
        hora: local(2026, 11, 12, 9, 21),
        fase: 2,
        modelo: 'gemini-3.1-flash-lite',
        imagenesIncluidas: true,
        fuentes: [{ n: 1, autor: 'Zecchetto, V.', anio: '2002', titulo: 'La danza de los signos', pagina: 'p. 207', extracto: '…' }],
      },
    ],
  };
}

const OPCIONES = { fechaExportacion: local(2026, 11, 12, 11, 40), nombreComision: 'Mañana' };

test('nombre de archivo: LV3_<comision>_<grupo>_<corpus>_<AAAA-MM-DD_HHmm>', () => {
  const conv = conversacionDePrueba(true);
  assert.equal(nombreArchivo(conv, OPCIONES.fechaExportacion, 'txt'), 'LV3_manana_M3_corpus-1-feminidad_2026-11-12_1140.txt');
  assert.equal(nombreArchivo(conv, OPCIONES.fechaExportacion, 'json'), 'LV3_manana_M3_corpus-1-feminidad_2026-11-12_1140.json');
});

test('txt: encabezado con comisión, grupo, corpus, fechas, modelos y consentimiento', () => {
  const txt = generarTxt(conversacionDePrueba(true), OPCIONES);
  for (const esperado of [
    'Comisión: Mañana',
    'Grupo: M3',
    'Corpus: Corpus 1 — Representaciones de la feminidad',
    'Inicio de la conversación: 12/11/2026 09:05',
    'Exportación: 12/11/2026 11:40',
    'Modelo de IA usado: gemini-3.5-flash-lite, gemini-3.1-flash-lite',
    'Consentimiento para documentación: SÍ',
    'Mensajes: 4 (grupo: 2, asistente: 2)',
  ]) {
    assert.ok(txt.includes(esperado), `falta: ${esperado}`);
  }
  assert.ok(!txt.includes('NO AUTORIZADO'));
});

test('txt: mensajes numerados en orden, con autor inequívoco, hora, fase, fuentes e imágenes', () => {
  const txt = generarTxt(conversacionDePrueba(true), OPCIONES);
  const posiciones = [
    '[1] GRUPO — 09:06 — fase 1',
    '[2] ASISTENTE (IA, generado por gemini-3.5-flash-lite) — 09:06 — fase 1',
    '[3] GRUPO — 09:20 — fase 2',
    '[4] ASISTENTE (IA, generado por gemini-3.1-flash-lite) — 09:21 — fase 2',
  ].map((t) => txt.indexOf(t));
  assert.ok(posiciones.every((p) => p >= 0), 'falta algún encabezado de mensaje');
  assert.deepEqual([...posiciones].sort((a, b) => a - b), posiciones, 'los mensajes no están en orden');
  assert.ok(txt.includes('(El grupo pidió observaciones del asistente sobre las imágenes.)'));
  assert.ok(txt.includes('Imágenes: el asistente recibió las tres imágenes del corpus.'));
  assert.ok(txt.includes('- Fuente 1: Zecchetto, V. (2002). La danza de los signos, p. 207.'));
  assert.ok(txt.indexOf('Primero: vemos una mujer') < txt.indexOf('Mi lectura visual'));
});

test('txt sin consentimiento: exporta igual, marcado NO AUTORIZADO al principio y al final', () => {
  const txt = generarTxt(conversacionDePrueba(false), OPCIONES);
  assert.ok(txt.startsWith('*** NO AUTORIZADO PARA DOCUMENTACIÓN ***'));
  assert.ok(txt.trimEnd().endsWith('*** NO AUTORIZADO PARA DOCUMENTACIÓN ***'));
  assert.ok(txt.includes('Consentimiento para documentación: NO — NO AUTORIZADO PARA DOCUMENTACIÓN'));
  assert.ok(txt.includes('[4] ASISTENTE'));
});

test('json: misma información estructurada, con versión del formato y autoría por mensaje', () => {
  const datos = JSON.parse(generarJson(conversacionDePrueba(true), OPCIONES));
  assert.equal(datos.formato, 'botpfilv3-conversacion');
  assert.equal(datos.version, VERSION_FORMATO);
  assert.deepEqual(datos.comision, { id: 'manana', nombre: 'Mañana' });
  assert.equal(datos.grupo, 'M3');
  assert.equal(datos.corpus.id, 'corpus-1-feminidad');
  assert.equal(datos.consentimiento, true);
  assert.equal(datos.autorizadoParaDocumentacion, true);
  assert.equal(datos.aviso, undefined);
  assert.deepEqual(datos.modelos, ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);
  assert.deepEqual(datos.mensajes.map((m) => [m.numero, m.autor, m.generadoPorIA, m.fase]), [
    [1, 'grupo', false, 1],
    [2, 'asistente', true, 1],
    [3, 'grupo', false, 2],
    [4, 'asistente', true, 2],
  ]);
  assert.equal(datos.mensajes[0].modelo, null);
  assert.equal(datos.mensajes[3].modelo, 'gemini-3.1-flash-lite');
  assert.equal(datos.mensajes[2].pidioImagenes, true);
  assert.equal(datos.mensajes[3].imagenesRecibidas, true);
  assert.equal(datos.mensajes[3].fuentes[0].pagina, 'p. 207');
});

test('json sin consentimiento: queda marcado', () => {
  const datos = JSON.parse(generarJson(conversacionDePrueba(false), OPCIONES));
  assert.equal(datos.autorizadoParaDocumentacion, false);
  assert.equal(datos.aviso, 'NO AUTORIZADO PARA DOCUMENTACIÓN');
});
