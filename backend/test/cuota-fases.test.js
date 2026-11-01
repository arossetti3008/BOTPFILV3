// Tests de la guardia de cuota, de las fases y de la validación del corpus

const test = require('node:test');
const assert = require('node:assert/strict');
const { crearCuota, claveDiaPacifico } = require('../src/services/cuotaService');
const { analizarFases } = require('../src/utils/fases');
const { validarCorpus } = require('../src/services/corpusService');

test('cuota por minuto: se libera cuando pasa el minuto', () => {
  let t = 0;
  const cuota = crearCuota({ rpmMax: 2, ahora: () => t });
  cuota.registrarLlamada('m');
  cuota.registrarLlamada('m');
  assert.equal(cuota.esperaPorMinuto(), 60);
  t = 45_000;
  assert.equal(cuota.esperaPorMinuto(), 15);
  t = 60_001;
  assert.equal(cuota.esperaPorMinuto(), 0);
});

test('cuota diaria: se reinicia a medianoche del Pacífico (05:00 en Argentina en noviembre)', () => {
  // 12/11/2026 04:59 en Argentina = 07:59 UTC = 23:59 del 11/11 en California
  let t = Date.parse('2026-11-12T07:59:00Z');
  const cuota = crearCuota({ rpmMax: 100, limitesDiarios: { m: 1 }, ahora: () => t });
  assert.equal(claveDiaPacifico(new Date(t)), '2026-11-11');
  cuota.registrarLlamada('m');
  cuota.marcarAgotado('otro');
  assert.equal(cuota.disponibleHoy('m'), false);
  assert.equal(cuota.disponibleHoy('otro'), false);

  t = Date.parse('2026-11-12T08:01:00Z'); // 05:01 en Argentina
  assert.equal(cuota.disponibleHoy('m'), true);
  assert.equal(cuota.disponibleHoy('otro'), true);
});

const UMBRAL = { minMensajes: 2, minCaracteres: 300 };
const est = (contenido) => ({ rol: 'estudiante', contenido });
const tut = (contenido) => ({ rol: 'tutor', contenido });

test('fases: un mensaje largo solo no alcanza; dos que suman 300 sí', () => {
  assert.equal(analizarFases([est('a'.repeat(400))], UMBRAL).fase, 1);
  const dos = [est('a'.repeat(150)), tut('?'), est('b'.repeat(150))];
  const r = analizarFases(dos, UMBRAL);
  assert.equal(r.fase, 2);
  // La interpretación se acaba de completar: todavía no se puede comparar
  assert.equal(r.puedeComparar, false);
  assert.equal(r.puedeVerImagenes, false);
});

test('fases: la comparación y las imágenes se habilitan después de una respuesta en fase 2', () => {
  const historial = [est('a'.repeat(150)), tut('?'), est('b'.repeat(150)), tut('?'), est('comparemos')];
  const r = analizarFases(historial, UMBRAL, true);
  assert.equal(r.fase, 3);
  assert.equal(r.puedeVerImagenes, true);
  assert.equal(analizarFases(historial, UMBRAL, false).fase, 2);
});

test('fases: informa cuánto falta', () => {
  const r = analizarFases([est('a'.repeat(100)), tut('?'), est('pedido')], UMBRAL);
  assert.equal(r.faltan.mensajes, 1);
  assert.equal(r.faltan.caracteres, 200);
});

test('corpus: exige exactamente 3 imágenes y los campos obligatorios', () => {
  const imagen = { id: 'i', archivo: 'a.jpg', titulo: 't', textoAlternativo: 'alt' };
  const base = { id: 'c', titulo: 't', problematica: 'p', ejeComparabilidad: 'e' };
  assert.deepEqual(validarCorpus({ ...base, imagenes: [imagen, imagen, imagen] }, 0), []);
  assert.match(validarCorpus({ ...base, imagenes: [imagen, imagen] }, 0)[0], /exactamente 3 imágenes \(tiene 2\)/);
  assert.match(validarCorpus({ ...base, titulo: '', imagenes: [imagen, imagen, imagen] }, 0)[0], /falta "titulo"/);
});
