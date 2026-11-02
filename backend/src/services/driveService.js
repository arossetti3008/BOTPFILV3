// Acceso de solo lectura a la carpeta de Google Drive del docente, con una
// cuenta de servicio. El token se obtiene firmando un JWT con node:crypto
// (sin librerías de Google) y se usa la API REST de Drive v3 con fetch.
// Documentación: https://developers.google.com/identity/protocols/oauth2/service-account
//                https://developers.google.com/drive/api/reference/rest/v3

const crypto = require('node:crypto');

const URL_DRIVE = 'https://www.googleapis.com/drive/v3';
const ALCANCE = 'https://www.googleapis.com/auth/drive.readonly';
const URL_TOKEN_POR_DEFECTO = 'https://oauth2.googleapis.com/token';
const TIPO_CARPETA = 'application/vnd.google-apps.folder';
const TIPO_ACCESO_DIRECTO = 'application/vnd.google-apps.shortcut';
const MAX_NIVELES = 3; // carpeta → subcarpeta → sub-subcarpeta → ...

function base64url(datos) {
  return Buffer.from(datos).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function errorDrive(mensaje, detalle) {
  const error = new Error(mensaje);
  error.statusCode = 502;
  if (detalle) console.error('[drive]', mensaje, '| Detalle:', String(detalle).slice(0, 300));
  return error;
}

function crearServicioDrive({ credenciales, folderId, fetchImpl, ahora = () => Date.now() }) {
  const hacerFetch = fetchImpl || ((...args) => globalThis.fetch(...args));
  const urlToken = credenciales.token_uri || URL_TOKEN_POR_DEFECTO;
  let token = null;
  let venceEn = 0;

  async function obtenerToken() {
    if (token && ahora() < venceEn - 60_000) return token;

    const emitido = Math.floor(ahora() / 1000);
    const encabezado = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const reclamos = base64url(
      JSON.stringify({ iss: credenciales.client_email, scope: ALCANCE, aud: urlToken, iat: emitido, exp: emitido + 3600 })
    );
    let firma;
    try {
      firma = crypto.createSign('RSA-SHA256').update(`${encabezado}.${reclamos}`).sign(credenciales.private_key);
    } catch {
      throw errorDrive('La clave privada de la cuenta de servicio no es válida. Revisá GOOGLE_SERVICE_ACCOUNT_JSON_BASE64.');
    }

    let respuesta;
    try {
      respuesta = await hacerFetch(urlToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: `${encabezado}.${reclamos}.${base64url(firma)}`,
        }).toString(),
      });
    } catch (falla) {
      throw errorDrive(`No se pudo conectar con Google para autenticar la cuenta de servicio (${falla.cause?.code || falla.message}).`);
    }
    if (!respuesta.ok) {
      throw errorDrive(
        `Google rechazó las credenciales de la cuenta de servicio (${respuesta.status}). Revisá GOOGLE_SERVICE_ACCOUNT_JSON_BASE64.`,
        await respuesta.text().catch(() => '')
      );
    }
    const datos = await respuesta.json();
    token = datos.access_token;
    venceEn = ahora() + (datos.expires_in || 3600) * 1000;
    return token;
  }

  async function pedir(url) {
    const acceso = await obtenerToken();
    let respuesta;
    try {
      respuesta = await hacerFetch(url, { headers: { Authorization: `Bearer ${acceso}` } });
    } catch (falla) {
      throw errorDrive(`No se pudo conectar con Google Drive (${falla.cause?.code || falla.message}).`);
    }
    if (respuesta.ok) return respuesta;

    const detalle = await respuesta.text().catch(() => '');
    if (respuesta.status === 404) {
      throw errorDrive(
        'Drive no encontró la carpeta o un archivo. ¿La carpeta está compartida con el email de la cuenta de servicio? ¿DRIVE_FOLDER_ID es correcto?',
        detalle
      );
    }
    if (respuesta.status === 403) {
      throw errorDrive(
        'Drive negó el acceso. Revisá que la Google Drive API esté habilitada en el proyecto y que la carpeta esté compartida con la cuenta de servicio.',
        detalle
      );
    }
    throw errorDrive(`Error de Google Drive (${respuesta.status}).`, detalle);
  }

  // Lista los archivos de una carpeta, sin entrar en subcarpetas (sin papelera)
  async function listarHijos(carpetaId) {
    const archivos = [];
    let pagina = '';
    do {
      const parametros = new URLSearchParams({
        q: `'${carpetaId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, shortcutDetails)',
        pageSize: '200',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
      });
      if (pagina) parametros.set('pageToken', pagina);
      const datos = await (await pedir(`${URL_DRIVE}/files?${parametros}`)).json();
      archivos.push(...(datos.files || []));
      pagina = datos.nextPageToken || '';
    } while (pagina);
    return archivos;
  }

  // Como listarHijos, pero reemplaza cada acceso directo de Drive por el
  // archivo o la carpeta a la que apunta
  async function listarHijosResueltos(carpetaId) {
    return (await listarHijos(carpetaId)).map((item) =>
      item.mimeType === TIPO_ACCESO_DIRECTO && item.shortcutDetails?.targetId
        ? { ...item, id: item.shortcutDetails.targetId, mimeType: item.shortcutDetails.targetMimeType, accesoDirecto: true }
        : item
    );
  }

  // Lista todos los archivos de una carpeta (por defecto, la compartida) y de
  // sus subcarpetas, hasta MAX_NIVELES de profundidad. "excluir" son ids de
  // subcarpetas que no se recorren. Cada archivo lleva "carpeta" con la ruta
  // relativa donde está (para los mensajes del reporte).
  async function listarCarpeta(raiz = folderId, { excluir = new Set() } = {}) {
    const archivos = [];
    const pendientes = [{ id: raiz, ruta: '', nivel: 0 }];
    const visitadas = new Set();
    while (pendientes.length) {
      const actual = pendientes.shift();
      if (visitadas.has(actual.id)) continue;
      visitadas.add(actual.id);
      for (const archivo of await listarHijosResueltos(actual.id)) {
        if (archivo.mimeType === TIPO_CARPETA) {
          if (actual.nivel < MAX_NIVELES && !excluir.has(archivo.id)) {
            pendientes.push({ id: archivo.id, ruta: `${actual.ruta}${archivo.name}/`, nivel: actual.nivel + 1 });
          }
          continue;
        }
        archivos.push({ ...archivo, carpeta: actual.ruta });
      }
    }
    return archivos;
  }

  async function descargar(id) {
    const respuesta = await pedir(`${URL_DRIVE}/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`);
    return Buffer.from(await respuesta.arrayBuffer());
  }

  // Para archivos de Google (Docs, Hojas): exporta a otro formato
  async function exportar(id, tipo) {
    const parametros = new URLSearchParams({ mimeType: tipo });
    const respuesta = await pedir(`${URL_DRIVE}/files/${encodeURIComponent(id)}/export?${parametros}`);
    return Buffer.from(await respuesta.arrayBuffer());
  }

  return { raiz: folderId, listarHijosResueltos, listarCarpeta, descargar, exportar };
}

module.exports = { crearServicioDrive, ALCANCE, TIPO_CARPETA };
