// Lee los corpus de las carpetas "Corpus …" de la carpeta contenedora de Drive.
// Cada carpeta tiene:
//   - exactamente 3 fotos (JPG, PNG o WEBP);
//   - un documento de Google cuyo nombre empieza con "ficha" (ver utils/ficha.js).
// El id del corpus sale del nombre de la carpeta ("Corpus 1" → "corpus-1").
//
// Las fotos y la ficha se guardan en memoria y solo se vuelven a descargar si
// cambiaron en Drive. Si una carpeta que funcionaba queda con un error (por
// ejemplo, mientras el docente edita la ficha), se sigue usando su última
// versión válida para no cortar a los grupos que están trabajando.

const { explorarContenedor, normalizar, aIdentificador, compararNombres } = require('./contenedorDrive');
const { TIPO_CARPETA } = require('./driveService');
const { revisarPeso } = require('./corpusService');
const { parsearFicha } = require('../utils/ficha');

const TIPO_DOC = 'application/vnd.google-apps.document';
const TIPOS_FOTO = new Set(['image/jpeg', 'image/png', 'image/webp']);

function errorDeCarpeta(errores) {
  const error = new Error(errores.join(' '));
  error.errores = errores;
  return error;
}

// "01_sherman_1978.jpg" coincide con "01_sherman_1978.jpg" y con "01_sherman_1978"
function mismoArchivo(nombreFoto, nombreEnFicha) {
  const foto = normalizar(nombreFoto);
  const ficha = normalizar(nombreEnFicha);
  return foto === ficha || foto.replace(/\.[a-z0-9]+$/, '') === ficha.replace(/\.[a-z0-9]+$/, '');
}

function crearLectorCorpusDrive({ drive }) {
  const cache = new Map(); // id de archivo -> { modifiedTime, datos }
  const ultimoValido = new Map(); // id de carpeta -> resultado de leerCarpeta

  async function bajar(archivo, exportarComo) {
    const guardado = cache.get(archivo.id);
    if (guardado && guardado.modifiedTime === archivo.modifiedTime) return guardado.datos;
    const datos = exportarComo ? await drive.exportar(archivo.id, exportarComo) : await drive.descargar(archivo.id);
    cache.set(archivo.id, { modifiedTime: archivo.modifiedTime, datos });
    return datos;
  }

  async function leerFicha(ficha) {
    if (ficha.mimeType === TIPO_DOC) return (await bajar(ficha, 'text/plain')).toString('utf8');
    if (ficha.mimeType === 'text/plain') return (await bajar(ficha)).toString('utf8');
    throw errorDeCarpeta([
      `La ficha "${ficha.name}" tiene que ser un documento de Google. Si es un Word, abrilo en Drive y usá ` +
        'Archivo → Guardar como Documentos de Google (y borrá el Word).',
    ]);
  }

  async function leerCarpeta(carpeta, vistos) {
    const errores = [];
    const avisos = [];
    const fotos = [];
    const fichas = [];

    for (const archivo of await drive.listarHijosResueltos(carpeta.id)) {
      vistos.add(archivo.id);
      if (archivo.mimeType === TIPO_CARPETA) continue;
      if (normalizar(archivo.name).startsWith('ficha')) fichas.push(archivo);
      else if (TIPOS_FOTO.has(archivo.mimeType)) fotos.push(archivo);
      else if (archivo.mimeType?.startsWith('image/')) {
        errores.push(`"${archivo.name}" no es JPG, PNG ni WEBP: convertila a JPG.`);
      } else avisos.push(`Se ignora "${archivo.name}": en la carpeta van solo las 3 fotos y la ficha.`);
    }
    fotos.sort(compararNombres);
    fichas.sort(compararNombres);

    if (!fichas.length) errores.push('Falta el documento "ficha" con los datos de las imágenes.');
    if (fichas.length > 1) avisos.push(`Hay ${fichas.length} fichas: se usa solo "${fichas[0].name}".`);
    if (fotos.length !== 3) errores.push(`Tiene ${fotos.length} fotos y tienen que ser exactamente 3.`);
    if (errores.length) throw errorDeCarpeta(errores);

    const ficha = parsearFicha(await leerFicha(fichas[0]));
    if (!ficha.problematica) errores.push('A la ficha le falta "Problemática:".');
    if (!ficha.ejeComparabilidad) errores.push('A la ficha le falta "Eje de comparabilidad:".');
    if (ficha.imagenes.length !== 3) {
      errores.push(
        `La ficha describe ${ficha.imagenes.length} imágenes y tienen que ser 3 (secciones "Imagen 1", "Imagen 2" e "Imagen 3").`
      );
    }
    if (errores.length) throw errorDeCarpeta(errores);

    // Cada imagen de la ficha con su foto: por "Archivo:" o, si no está, por orden alfabético
    const asignadas = new Set();
    const pares = ficha.imagenes.map((datos, i) => {
      const foto = datos.archivo ? fotos.find((f) => mismoArchivo(f.name, datos.archivo)) : fotos[i];
      if (!datos.titulo) errores.push(`A la imagen ${i + 1} de la ficha le falta "Título:".`);
      if (!foto) errores.push(`La imagen ${i + 1} de la ficha dice "Archivo: ${datos.archivo}", pero no hay una foto con ese nombre.`);
      else if (asignadas.has(foto.id)) errores.push(`La foto "${foto.name}" está asignada a dos imágenes de la ficha.`);
      else asignadas.add(foto.id);
      return { datos, foto };
    });
    if (errores.length) throw errorDeCarpeta(errores);

    const id = aIdentificador(carpeta.name);
    const imagenes = new Map();
    const corpus = {
      id,
      titulo: ficha.titulo || carpeta.name,
      problematica: ficha.problematica,
      ejeComparabilidad: ficha.ejeComparabilidad,
      imagenes: [],
    };
    for (const [i, { datos, foto }] of pares.entries()) {
      const contenido = await bajar(foto);
      const { error, aviso } = revisarPeso(id, foto.name, contenido.length);
      if (error) errores.push(error);
      if (aviso) avisos.push(aviso);
      const imagenId = `img${i + 1}`;
      imagenes.set(`${id}/${imagenId}`, { mimeType: foto.mimeType, datos: contenido });
      corpus.imagenes.push({
        id: imagenId,
        archivo: foto.name,
        titulo: datos.titulo,
        autor: datos.autor || '',
        anio: datos.anio || '',
        soporte: datos.soporte || '',
        procedencia: datos.procedencia || '',
        fuente: datos.fuente || '',
        textoAlternativo: datos.textoAlternativo || '',
        version: String(foto.modifiedTime || '').replace(/[^0-9A-Za-z]/g, ''),
      });
    }
    if (errores.length) throw errorDeCarpeta(errores);
    return { corpus, imagenes, avisos };
  }

  // Lee todas las carpetas de corpus. Si no se puede listar la contenedora,
  // lanza el error (el servicio conserva lo que tenía).
  async function leer() {
    const { carpetasCorpus } = await explorarContenedor(drive);
    const lista = [];
    const imagenes = new Map();
    const problemas = [];
    const ids = new Set();
    const vistos = new Set(); // archivos que siguen en Drive

    for (const carpeta of carpetasCorpus) {
      const prefijo = `Carpeta "${carpeta.name}":`;
      let resultado;
      try {
        resultado = await leerCarpeta(carpeta, vistos);
        if (!resultado.corpus.id) throw errorDeCarpeta(['El nombre de la carpeta tiene que tener letras o números.']);
        if (ids.has(resultado.corpus.id)) {
          throw errorDeCarpeta([`Otra carpeta tiene el mismo nombre ("${resultado.corpus.id}"). Cambiale el nombre a una.`]);
        }
        ultimoValido.set(carpeta.id, resultado);
      } catch (error) {
        problemas.push(...(error.errores || [error.message]).map((e) => `${prefijo} ${e}`));
        resultado = ultimoValido.get(carpeta.id);
        if (!resultado || ids.has(resultado.corpus.id)) continue;
        problemas.push(`${prefijo} hasta que se corrija, se sigue usando la última versión que funcionó.`);
      }
      ids.add(resultado.corpus.id);
      lista.push(resultado.corpus);
      for (const [clave, valor] of resultado.imagenes) imagenes.set(clave, valor);
      problemas.push(...resultado.avisos.map((a) => `${prefijo} ${a}`));
    }

    // Se descarta de la memoria lo que ya no se usa
    const enUso = new Set(carpetasCorpus.map((c) => c.id));
    for (const id of ultimoValido.keys()) if (!enUso.has(id)) ultimoValido.delete(id);
    for (const id of cache.keys()) if (!vistos.has(id)) cache.delete(id);

    return { lista, imagenes, problemas, carpetas: carpetasCorpus.length };
  }

  return { leer };
}

module.exports = { crearLectorCorpusDrive };
