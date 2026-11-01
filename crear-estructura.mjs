// crear-estructura.mjs — arma la estructura base de BOTPFILV3.
// Uso (desde la raíz del repo, DESPUÉS de crear el frontend con Vite):
//   node crear-estructura.mjs
// No pisa archivos existentes: si algo ya existe, lo informa y sigue.
// Funciona igual en Windows, macOS y Linux.

import { mkdirSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const raiz = process.cwd();
const creados = [];
const omitidos = [];

function carpeta(ruta) {
  const destino = join(raiz, ruta);
  if (!existsSync(destino)) {
    mkdirSync(destino, { recursive: true });
    creados.push(ruta + '/');
  }
  // .gitkeep para que Git conserve las carpetas vacías
  const keep = join(destino, '.gitkeep');
  if (!existsSync(keep)) writeFileSync(keep, '');
}

function archivo(ruta, contenido) {
  const destino = join(raiz, ruta);
  if (existsSync(destino)) {
    omitidos.push(ruta);
    return;
  }
  writeFileSync(destino, contenido, 'utf8');
  creados.push(ruta);
}

// --- Comprobaciones previas ---
const versionNode = Number(process.versions.node.split('.')[0]);
if (versionNode < 20) {
  console.error(`Necesitás Node 20 o superior (tenés ${process.versions.node}).`);
  process.exit(1);
}
if (!existsSync(join(raiz, 'PROMPT_MAESTRO.md'))) {
  console.error('Corré este script desde la raíz del repo (donde está PROMPT_MAESTRO.md).');
  process.exit(1);
}
if (!existsSync(join(raiz, 'frontend', 'package.json'))) {
  console.warn('Aviso: no encontré frontend/package.json. Creá primero el frontend con Vite (ver Paso a paso).');
}

// --- Backend ---
[
  'backend/contenidos/corpus/imagenes',
  'backend/src/config',
  'backend/src/services',
  'backend/src/prompts',
  'backend/src/routes',
  'backend/src/middleware',
  'backend/src/utils',
  'backend/test',
].forEach(carpeta);

archivo(
  'backend/package.json',
  JSON.stringify(
    {
      name: 'botpfilv3-backend',
      version: '0.1.0',
      description: 'Backend de BOTPFILV3 — asistente de análisis discursivo visual',
      main: 'server.js',
      type: 'commonjs',
      engines: { node: '>=20' },
      scripts: {
        start: 'node server.js',
        dev: 'nodemon server.js',
        test: 'node --test test/',
      },
      dependencies: {
        cors: '^2.8.5',
        dotenv: '^16.4.5',
        express: '^4.19.2',
        'express-rate-limit': '^7.4.0',
        helmet: '^7.1.0',
      },
      devDependencies: {
        nodemon: '^3.1.4',
        supertest: '^7.0.0',
      },
    },
    null,
    2
  ) + '\n'
);

// Corpus de EJEMPLO: se reemplaza por los materiales reales del docente
archivo(
  'backend/contenidos/corpus/corpus.json',
  JSON.stringify(
    [
      {
        id: 'EJEMPLO-corpus-1',
        titulo: 'EJEMPLO — reemplazar',
        problematica: 'EJEMPLO — reemplazar',
        ejeComparabilidad: 'EJEMPLO — reemplazar',
        imagenes: [1, 2, 3].map((n) => ({
          id: `img${n}`,
          archivo: `EJEMPLO-${n}.jpg`,
          titulo: 'EJEMPLO',
          autor: 'EJEMPLO',
          anio: 'EJEMPLO',
          soporte: 'EJEMPLO (afiche, fotografía publicitaria, pintura…)',
          procedencia: 'EJEMPLO (fuente, URL o archivo de origen)',
          textoAlternativo: 'EJEMPLO — descripción breve para lectores de pantalla',
        })),
        bibliografia: [],
      },
    ],
    null,
    2
  ) + '\n'
);

// La consigna que usa el backend es una copia de la de docs/
const consignaDocs = join(raiz, 'docs', 'consigna-TFI-LV3-2025.md');
const consignaBackend = join(raiz, 'backend', 'contenidos', 'consigna.md');
if (existsSync(consignaDocs) && !existsSync(consignaBackend)) {
  copyFileSync(consignaDocs, consignaBackend);
  creados.push('backend/contenidos/consigna.md');
}

// --- Frontend (solo carpetas; el resto lo genera Vite) ---
[
  'frontend/src/api',
  'frontend/src/pages',
  'frontend/src/components',
  'frontend/src/context',
  'frontend/src/hooks',
  'frontend/src/utils',
].forEach(carpeta);

archivo('frontend/.env.example', '# Local: backend corriendo en tu PC\nVITE_API_URL=http://localhost:5000/api\n\n# Producción (Vercel): URL del backend en Render + /api\n# VITE_API_URL=https://<tu-backend>.onrender.com/api\n');

// --- Documentación (la completa Claude Code) ---
carpeta('docs/pruebas-tutor');
archivo('docs/GUIA_DOCENTE.md', '# Guía docente — BOTPFILV3\n\n> Pendiente: la completa Claude Code en la Etapa 6.\n');
archivo('docs/PRUEBAS.md', '# Pruebas — BOTPFILV3\n\n| Funcionalidad | Implementado | Probado (cómo) | Pendiente |\n|---|---|---|---|\n');

// --- Resumen ---
console.log('\nCreado:');
creados.forEach((r) => console.log('  + ' + r));
if (omitidos.length) {
  console.log('\nYa existía (no se tocó):');
  omitidos.forEach((r) => console.log('  = ' + r));
}
console.log('\nSiguiente paso: cd backend && npm install\n');
