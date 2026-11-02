// Estructura de la carpeta contenedora de Drive (la de DRIVE_FOLDER_ID):
//
//   Carpeta contenedora/
//     Bibliografía/        → PDFs comunes a todos los corpus (puede tener subcarpetas)
//     Corpus 1/            → 3 fotos + documento "ficha"
//     Corpus 2/            → ...
//
// Las carpetas se reconocen por el comienzo del nombre, sin importar
// mayúsculas ni tildes ("Bibliografia", "BIBLIOGRAFÍA general", "corpus 2 - …").
// Si no hay carpeta "Bibliografía", la bibliografía se busca en toda la
// contenedora, salteando las carpetas de corpus.

const { TIPO_CARPETA } = require('./driveService');

// Minúsculas, sin tildes y con espacios simples
function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// "Corpus 1 — Feminidad" → "corpus-1-feminidad"
function aIdentificador(texto) {
  return normalizar(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function compararNombres(a, b) {
  return a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' });
}

async function explorarContenedor(drive) {
  const carpetas = (await drive.listarHijosResueltos(drive.raiz)).filter((h) => h.mimeType === TIPO_CARPETA);
  const bibliografia = carpetas.filter((c) => normalizar(c.name).startsWith('bibliograf')).sort(compararNombres);
  const carpetasCorpus = carpetas.filter((c) => normalizar(c.name).startsWith('corpus')).sort(compararNombres);
  const avisos = [];
  if (bibliografia.length > 1) {
    avisos.push(
      `Hay ${bibliografia.length} carpetas de bibliografía: se usa solo "${bibliografia[0].name}". ` +
        'Si querés separar textos, usá subcarpetas dentro de ella.'
    );
  }
  return { carpetaBibliografia: bibliografia[0] || null, carpetasCorpus, avisos };
}

// Archivos de la bibliografía, según la estructura de la contenedora
async function listarBibliografia(drive) {
  const { carpetaBibliografia, carpetasCorpus, avisos } = await explorarContenedor(drive);
  const archivos = carpetaBibliografia
    ? await drive.listarCarpeta(carpetaBibliografia.id)
    : await drive.listarCarpeta(drive.raiz, { excluir: new Set(carpetasCorpus.map((c) => c.id)) });
  return {
    archivos,
    avisos,
    ubicacion: carpetaBibliografia ? `carpeta "${carpetaBibliografia.name}"` : 'carpeta principal (no hay carpeta "Bibliografía")',
  };
}

module.exports = { explorarContenedor, listarBibliografia, normalizar, aIdentificador, compararNombres };
