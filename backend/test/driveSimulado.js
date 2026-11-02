// Google Drive simulado para los tests: responde como la API REST de Drive v3
// y como el endpoint de tokens de Google. Verifica la firma del JWT de la
// cuenta de servicio con la clave pública, como haría Google.

const crypto = require('node:crypto');
const { ALCANCE } = require('../src/services/driveService');
const { crearPdfPrueba } = require('./pdfPrueba');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const FOLDER_ID = 'carpeta-de-prueba';
const CREDENCIALES = {
  type: 'service_account',
  client_email: 'lector@proyecto-de-prueba.iam.gserviceaccount.com',
  private_key: privateKey,
  token_uri: 'https://oauth2.googleapis.com/token',
};
const TIPOS = {
  pdf: 'application/pdf',
  doc: 'application/vnd.google-apps.document',
  hoja: 'application/vnd.google-apps.spreadsheet',
  carpeta: 'application/vnd.google-apps.folder',
  acceso: 'application/vnd.google-apps.shortcut',
};

function credencialesBase64(credenciales = CREDENCIALES) {
  return Buffer.from(JSON.stringify(credenciales)).toString('base64');
}

function envDrive(extra = {}) {
  return {
    DRIVE_FOLDER_ID: FOLDER_ID,
    GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: credencialesBase64(),
    ADMIN_TOKEN: 'token-admin-de-prueba',
    ...extra,
  };
}

// Hoja "fuentes" de prueba (datos marcados EJEMPLO: no son bibliografía real)
const CSV_FUENTES = [
  'archivo,autor,anio,titulo,referenciaAPA,paginaInicial,dimensiones,corpus',
  'Capitulo de prueba.pdf,EJEMPLO Autora,2001,"Título de prueba, con coma",EJEMPLO Autora (2001). Título de prueba.,23,retorico,EJEMPLO-corpus-1',
  'Documento de prueba,EJEMPLO Autor,1999,Documento de prueba,EJEMPLO Autor (1999). Documento de prueba.,,"enunciativo, tematico",',
  'No existe.pdf,EJEMPLO,2000,No existe,,,,',
].join('\r\n');

function archivosDePrueba() {
  return [
    { id: 'hoja1', name: 'fuentes', mimeType: TIPOS.hoja, modifiedTime: '2026-11-01T10:00:00Z', contenido: CSV_FUENTES },
    {
      id: 'pdf1',
      name: 'Capitulo de prueba.pdf',
      mimeType: TIPOS.pdf,
      modifiedTime: '2026-11-01T10:00:00Z',
      contenido: crearPdfPrueba([
        ['Pagina uno del documento de prueba sintetico.', 'Contiene la palabra terminoalfa varias veces: terminoalfa.'],
        ['Pagina dos del documento de prueba sintetico.', 'Contiene terminobeta junto a metaforas visuales de prueba.'],
        [],
      ]),
    },
    {
      id: 'doc1',
      name: 'Documento de prueba',
      mimeType: TIPOS.doc,
      modifiedTime: '2026-11-01T10:00:00Z',
      contenido: crearPdfPrueba([
        ['Primera pagina del documento exportado de prueba.', 'Habla de terminogamma y del enunciador.'],
        ['Segunda pagina del documento exportado de prueba.', 'Habla de terminodelta y del enunciatario.'],
      ]),
    },
    {
      id: 'pdf2',
      name: 'Sin fila.pdf',
      mimeType: TIPOS.pdf,
      modifiedTime: '2026-11-01T10:00:00Z',
      contenido: crearPdfPrueba([['Archivo sin fila en la hoja de fuentes de prueba.']]),
    },
    { id: 'img1', name: 'imagen.png', mimeType: 'image/png', modifiedTime: '2026-11-01T10:00:00Z', contenido: 'x' },
  ];
}

function crearDriveSimulado(archivos = archivosDePrueba()) {
  const registro = { descargas: [], tokens: 0, falla: null };

  async function fetchDrive(url, opciones = {}) {
    if (registro.falla) return new Response(JSON.stringify({ error: registro.falla }), { status: registro.falla.code });
    const direccion = new URL(url);

    if (url === CREDENCIALES.token_uri) {
      const asercion = new URLSearchParams(opciones.body).get('assertion') || '';
      const [encabezado, reclamos, firma] = asercion.split('.');
      const valida = crypto.verify(
        'RSA-SHA256',
        Buffer.from(`${encabezado}.${reclamos}`),
        publicKey,
        Buffer.from(firma || '', 'base64url')
      );
      const datos = valida ? JSON.parse(Buffer.from(reclamos, 'base64url').toString()) : {};
      if (!valida || datos.scope !== ALCANCE || datos.iss !== CREDENCIALES.client_email) {
        return new Response('{"error":"invalid_grant"}', { status: 400 });
      }
      registro.tokens++;
      return Response.json({ access_token: 'token-simulado', expires_in: 3600 });
    }

    if (opciones.headers?.Authorization !== 'Bearer token-simulado') return new Response('{}', { status: 401 });

    if (direccion.pathname === '/drive/v3/files') {
      // Lista los hijos de la carpeta pedida ("padre" vacío = carpeta compartida)
      const padre = (direccion.searchParams.get('q').match(/^'([^']+)' in parents/) || [])[1];
      const conocida = padre === FOLDER_ID || archivos.some((a) => a.id === padre && a.mimeType === TIPOS.carpeta);
      if (!conocida) return new Response('{}', { status: 404 });
      return Response.json({
        files: archivos.filter((a) => (a.padre || FOLDER_ID) === padre).map(({ contenido, padre: _p, ...meta }) => meta),
      });
    }

    const partes = direccion.pathname.match(/^\/drive\/v3\/files\/([^/]+)(\/export)?$/);
    const archivo = partes && archivos.find((a) => a.id === decodeURIComponent(partes[1]));
    if (!archivo) return new Response('{}', { status: 404 });

    if (partes[2]) {
      const tipoPedido = direccion.searchParams.get('mimeType');
      const aceptados = archivo.mimeType === TIPOS.hoja ? ['text/csv'] : ['application/pdf', 'text/plain'];
      if (!aceptados.includes(tipoPedido)) return new Response('{}', { status: 400 });
    } else if (direccion.searchParams.get('alt') !== 'media') {
      return new Response('{}', { status: 400 });
    }
    registro.descargas.push(archivo.name);
    return new Response(archivo.contenido);
  }

  return { fetchDrive, archivos, registro };
}

module.exports = { FOLDER_ID, CREDENCIALES, TIPOS, credencialesBase64, envDrive, archivosDePrueba, crearDriveSimulado };
