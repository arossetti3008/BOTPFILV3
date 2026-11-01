// Genera un PDF mínimo, a mano, para los tests (sin librerías).
// Cada elemento de "paginas" es una lista de líneas; una lista vacía genera
// una página sin texto (como un PDF escaneado).
// El texto es sintético, solo para probar la extracción y la búsqueda.

function escaparTextoPdf(texto) {
  return texto.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function crearPdfPrueba(paginas) {
  const objetos = [];
  const agregar = (contenido) => {
    objetos.push(contenido);
    return objetos.length; // número de objeto
  };

  const idCatalogo = agregar(null);
  const idPaginas = agregar(null);
  const idFuente = agregar('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  const idsPagina = paginas.map((lineas) => {
    const flujo = lineas.length
      ? `BT /F1 12 Tf 72 720 Td 14 TL ${lineas.map((l) => `(${escaparTextoPdf(l)}) Tj T*`).join(' ')} ET`
      : '';
    const idContenido = agregar(`<< /Length ${Buffer.byteLength(flujo, 'latin1')} >>\nstream\n${flujo}\nendstream`);
    return agregar(
      `<< /Type /Page /Parent ${idPaginas} 0 R /MediaBox [0 0 612 792] ` +
        `/Resources << /Font << /F1 ${idFuente} 0 R >> >> /Contents ${idContenido} 0 R >>`
    );
  });

  objetos[idCatalogo - 1] = `<< /Type /Catalog /Pages ${idPaginas} 0 R >>`;
  objetos[idPaginas - 1] = `<< /Type /Pages /Kids [${idsPagina.map((id) => `${id} 0 R`).join(' ')}] /Count ${idsPagina.length} >>`;

  let pdf = '%PDF-1.4\n';
  const posiciones = [];
  objetos.forEach((contenido, i) => {
    posiciones.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${contenido}\nendobj\n`;
  });
  const inicioXref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += posiciones.map((p) => `${String(p).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root ${idCatalogo} 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

module.exports = { crearPdfPrueba };
