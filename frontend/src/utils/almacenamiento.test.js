// Tests del guardado en el navegador (con un localStorage simulado)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  almacenamientoDisponible,
  borrarConversacion,
  guardarConversacion,
  guardarSesion,
  leerConversacion,
  leerSesion,
  mensajesSinExportar,
  nuevaConversacion,
} from './almacenamiento.js';

function localStorageSimulado() {
  const datos = new Map();
  return {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k),
    datos,
  };
}

const GRUPO_M1 = { comision: 'manana', grupo: 'M1', corpusId: 'corpus-a' };
const GRUPO_M2 = { comision: 'manana', grupo: 'M2', corpusId: 'corpus-a' };

test('guardar y recargar conserva la conversación', () => {
  globalThis.localStorage = localStorageSimulado();
  const conv = nuevaConversacion(GRUPO_M1, 'Corpus A');
  conv.mensajes.push({ id: '1', rol: 'estudiante', contenido: 'hola', hora: '2026-11-12T12:00:00Z' });
  assert.equal(guardarConversacion(conv), true);
  assert.deepEqual(leerConversacion(GRUPO_M1), conv);
});

test('dos grupos en el mismo navegador no comparten historial', () => {
  globalThis.localStorage = localStorageSimulado();
  const conv = nuevaConversacion(GRUPO_M1);
  conv.mensajes.push({ id: '1', rol: 'estudiante', contenido: 'del grupo M1' });
  guardarConversacion(conv);
  assert.equal(leerConversacion(GRUPO_M2), null);
  assert.equal(leerConversacion({ ...GRUPO_M1, corpusId: 'corpus-b' }), null);
  borrarConversacion(GRUPO_M2);
  assert.equal(leerConversacion(GRUPO_M1).mensajes.length, 1);
});

test('sin localStorage (modo privado) no se rompe: devuelve false o null', () => {
  globalThis.localStorage = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceededError'); },
    removeItem() { throw new Error('SecurityError'); },
  };
  assert.equal(almacenamientoDisponible(), false);
  assert.equal(guardarConversacion(nuevaConversacion(GRUPO_M1)), false);
  assert.equal(leerConversacion(GRUPO_M1), null);
  assert.doesNotThrow(() => borrarConversacion(GRUPO_M1));
  assert.doesNotThrow(() => guardarSesion(GRUPO_M1));
  assert.equal(leerSesion(), null);
});

test('datos corruptos o de otra versión se ignoran', () => {
  globalThis.localStorage = localStorageSimulado();
  localStorage.setItem('botpfilv3_conv_manana_M1_corpus-a', '{no es json');
  assert.equal(leerConversacion(GRUPO_M1), null);
  localStorage.setItem('botpfilv3_conv_manana_M1_corpus-a', JSON.stringify({ version: 99, mensajes: [] }));
  assert.equal(leerConversacion(GRUPO_M1), null);
});

test('mensajes sin exportar', () => {
  const conv = nuevaConversacion(GRUPO_M1);
  conv.mensajes = [{}, {}, {}];
  assert.equal(mensajesSinExportar(conv), 3);
  conv.mensajesExportados = 2;
  assert.equal(mensajesSinExportar(conv), 1);
  assert.equal(mensajesSinExportar(null), 0);
});

test('la sesión actual sobrevive a la recarga', () => {
  globalThis.localStorage = localStorageSimulado();
  guardarSesion(GRUPO_M1);
  assert.deepEqual(leerSesion(), GRUPO_M1);
  guardarSesion(null);
  assert.equal(leerSesion(), null);
});
