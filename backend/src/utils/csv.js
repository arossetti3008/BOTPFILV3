// Lector de CSV mínimo (RFC 4180): comillas, comas y saltos de línea dentro
// de campos entre comillas. Alcanza para la hoja "fuentes" exportada de Drive.

function leerCsv(texto) {
  const filas = [];
  let fila = [];
  let campo = '';
  let entreComillas = false;
  const contenido = texto.replace(/^﻿/, ''); // sin BOM

  for (let i = 0; i < contenido.length; i++) {
    const c = contenido[i];
    if (entreComillas) {
      if (c === '"' && contenido[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        entreComillas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === ',') {
      fila.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && contenido[i + 1] === '\n') i++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = '';
    } else {
      campo += c;
    }
  }
  if (campo !== '' || fila.length) {
    fila.push(campo);
    filas.push(fila);
  }
  // Sin filas totalmente vacías
  return filas.filter((f) => f.some((valor) => valor.trim() !== ''));
}

// Convierte el CSV en objetos usando la primera fila como encabezados
function leerCsvConEncabezados(texto) {
  const [encabezados = [], ...filas] = leerCsv(texto);
  const columnas = encabezados.map((e) => e.trim());
  return {
    columnas,
    registros: filas.map((fila) => Object.fromEntries(columnas.map((col, i) => [col, (fila[i] || '').trim()]))),
  };
}

module.exports = { leerCsv, leerCsvConEncabezados };
