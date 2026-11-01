// Tests de la regla de fases del frontend (la misma que la del backend)
import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoFases, motivoBloqueo } from './fases.js';

const LIMITES = { minMensajesAntesImagenes: 2, minCaracteresAntesImagenes: 300 };
const est = (contenido) => ({ rol: 'estudiante', contenido });
const tut = (contenido) => ({ rol: 'tutor', contenido });

test('al empezar: fase 1 y botones bloqueados', () => {
  const r = estadoFases([], LIMITES, false);
  assert.equal(r.fase, 1);
  assert.equal(r.puedeVerImagenes, false);
  assert.equal(r.puedeComparar, false);
  assert.match(motivoBloqueo(r), /2 mensajes más y unos 300 caracteres más/);
});

test('un mensaje largo no alcanza: faltan mensajes', () => {
  const r = estadoFases([est('a'.repeat(400)), tut('?')], LIMITES, false);
  assert.equal(r.puedeVerImagenes, false);
  assert.match(motivoBloqueo(r), /1 mensaje más\.$/);
});

test('con la interpretación escrita: fase 2, imágenes y comparación habilitadas', () => {
  const r = estadoFases([est('a'.repeat(150)), tut('?'), est('b'.repeat(150)), tut('?')], LIMITES, false);
  assert.equal(r.fase, 2);
  assert.equal(r.puedeVerImagenes, true);
  assert.equal(r.puedeComparar, true);
});

test('después de pasar a la comparación: fase 3', () => {
  const r = estadoFases([est('a'.repeat(150)), tut('?'), est('b'.repeat(150)), tut('?')], LIMITES, true);
  assert.equal(r.fase, 3);
  assert.equal(r.puedeComparar, false);
  assert.equal(r.puedeVerImagenes, true);
});
