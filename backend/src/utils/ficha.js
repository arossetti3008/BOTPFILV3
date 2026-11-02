// Lee el documento "ficha" de una carpeta de corpus. El docente lo escribe
// como texto común, con un dato por renglón ("Etiqueta: valor"):
//
//   Título: Representaciones de la feminidad        (opcional; si no, el nombre de la carpeta)
//   Problemática: ...
//   Eje de comparabilidad: ...
//
//   Imagen 1
//   Archivo: 01_sherman.jpg                          (opcional; si no, las fotos van en orden alfabético)
//   Título: Untitled Film Still #21
//   Autor: Cindy Sherman
//   Año: 1978
//   Soporte: Fotografía en blanco y negro
//   Procedencia: MoMA, Nueva York
//   Fuente: https://www.moma.org/...
//   Texto alternativo: Descripción breve para lectores de pantalla
//
//   Imagen 2
//   ...
//
// Las etiquetas no distinguen mayúsculas ni tildes, y aceptan sinónimos
// ("Autora", "Técnica", "Enlace"…). Un renglón sin etiqueta conocida se suma
// al dato anterior (para textos largos que ocupan varios párrafos).

const { normalizar } = require('../services/contenedorDrive');

const ETIQUETAS_CORPUS = {
  titulo: 'titulo',
  'titulo del corpus': 'titulo',
  'nombre del corpus': 'titulo',
  problematica: 'problematica',
  'problematica sociocultural': 'problematica',
  eje: 'ejeComparabilidad',
  'eje de comparabilidad': 'ejeComparabilidad',
  'eje de comparacion': 'ejeComparabilidad',
  'eje comparativo': 'ejeComparabilidad',
};

const ETIQUETAS_IMAGEN = {
  archivo: 'archivo',
  'nombre del archivo': 'archivo',
  foto: 'archivo',
  titulo: 'titulo',
  obra: 'titulo',
  'titulo de la obra': 'titulo',
  autor: 'autor',
  autora: 'autor',
  'autor/a': 'autor',
  'autor o autora': 'autor',
  artista: 'autor',
  ano: 'anio',
  anio: 'anio',
  fecha: 'anio',
  soporte: 'soporte',
  tecnica: 'soporte',
  'soporte y tecnica': 'soporte',
  materialidad: 'soporte',
  procedencia: 'procedencia',
  ubicacion: 'procedencia',
  coleccion: 'procedencia',
  museo: 'procedencia',
  fuente: 'fuente',
  enlace: 'fuente',
  link: 'fuente',
  url: 'fuente',
  'texto alternativo': 'textoAlternativo',
  descripcion: 'textoAlternativo',
  'descripcion breve': 'textoAlternativo',
};

// Quita viñetas, asteriscos de negrita y espacios del comienzo y el final
function limpiarRenglon(renglon) {
  return renglon
    .replace(/^﻿/, '')
    .replace(/^\s*(?:[-•*·▪●]+\s+)/, '')
    .replace(/\*\*/g, '')
    .trim();
}

function parsearFicha(texto) {
  const corpus = {};
  const imagenes = [];
  let actual = corpus; // a qué se le asignan los datos: el corpus o la imagen en curso
  let etiquetas = ETIQUETAS_CORPUS;
  let ultimoCampo = null;

  for (const original of String(texto || '').replace(/\r/g, '').split('\n')) {
    const renglon = limpiarRenglon(original);
    if (!renglon) continue;

    // "Imagen 2", "IMAGEN 2:", "Imagen 2 - Título de la obra"
    const encabezado = normalizar(renglon).match(/^imagen\s*n?[°º.]?\s*(\d+)\s*(?:[:.\-–—]\s*(.*))?$/);
    if (encabezado) {
      actual = {};
      imagenes.push(actual);
      etiquetas = ETIQUETAS_IMAGEN;
      ultimoCampo = null;
      const resto = renglon.replace(/^[^:.\-–—]*\d+\s*[:.\-–—]?\s*/, '').trim();
      if (resto && !resto.includes(':')) {
        actual.titulo = resto;
        ultimoCampo = 'titulo';
      }
      continue;
    }

    const separador = renglon.indexOf(':');
    const campo = separador > 0 ? etiquetas[normalizar(renglon.slice(0, separador))] : undefined;
    if (campo) {
      actual[campo] = renglon.slice(separador + 1).trim();
      ultimoCampo = campo;
    } else if (ultimoCampo) {
      actual[ultimoCampo] = `${actual[ultimoCampo]} ${renglon}`.trim();
    }
  }
  return { ...corpus, imagenes };
}

module.exports = { parsearFicha };
