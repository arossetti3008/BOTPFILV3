// Extrae el texto de un PDF, página por página, con unpdf (pdf.js sin
// navegador). unpdf es un módulo ESM: se carga con import() dinámico.
//
// El documento se abre de nuevo para cada página y se cierra al terminarla:
// pdf.js guarda en memoria lo que va leyendo, y en los PDF escaneados con
// OCR (por ejemplo, uno de 13 MB) eso superaba los 450 MB y Render cortaba
// el servidor (plan gratuito: 512 MB). Así, el pico ronda los 200 MB.

function limpiar(texto) {
  return texto
    .replace(/(\p{L})-\s*\n\s*(\p{L})/gu, '$1$2') // palabras cortadas con guion al final de línea
    .replace(/\s+/g, ' ')
    .trim();
}

async function cerrar(documento) {
  await documento.cleanup().catch(() => {});
  if (typeof documento.destroy === 'function') await documento.destroy().catch(() => {});
  else await documento.loadingTask?.destroy?.().catch(() => {});
}

async function extraerPaginasPdf(buffer) {
  const { getDocumentProxy } = await import('unpdf');
  const paginas = [];
  let total = 1;
  for (let numero = 1; numero <= total; numero++) {
    const documento = await getDocumentProxy(new Uint8Array(buffer));
    try {
      total = documento.numPages;
      if (total === 0) break;
      const pagina = await documento.getPage(numero);
      const contenido = await pagina.getTextContent();
      // Igual que unpdf: un salto de línea donde el texto cambia de renglón
      const texto = contenido.items
        .filter((item) => item.str != null)
        .map((item) => item.str + (item.hasEOL ? '\n' : ''))
        .join('');
      paginas.push(limpiar(texto));
      pagina.cleanup();
    } finally {
      await cerrar(documento);
    }
  }
  return paginas;
}

module.exports = { extraerPaginasPdf };
