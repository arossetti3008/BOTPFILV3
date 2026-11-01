// Extrae el texto de un PDF, página por página, con unpdf (pdf.js sin
// navegador). unpdf es un módulo ESM: se carga con import() dinámico.

async function extraerPaginasPdf(buffer) {
  const { extractText } = await import('unpdf');
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: false });
  return text.map((pagina) =>
    pagina
      .replace(/(\p{L})-\s*\n\s*(\p{L})/gu, '$1$2') // palabras cortadas con guion al final de línea
      .replace(/\s+/g, ' ')
      .trim()
  );
}

module.exports = { extraerPaginasPdf };
