// Corpus que se ofrecen a los grupos. Cada corpus tiene exactamente 3
// imágenes con su ficha. Hay dos orígenes:
//
// - Drive (principal): las carpetas "Corpus …" de la carpeta contenedora,
//   cada una con 3 fotos y un documento "ficha" (ver corpusDrive.js). Se
//   sincroniza al iniciar y cada DRIVE_RESYNC_MINUTOS.
// - Proyecto (respaldo): contenidos/corpus/corpus.json e imagenes/. Se usa
//   si Drive no está configurado, si falla o si no tiene ningún corpus válido.
//
// Un corpus inválido no se ofrece a los grupos; el problema se informa en el
// log y en /api/health.

const fs = require('node:fs');
const path = require('node:path');

const CARPETA_CORPUS = path.join(__dirname, '..', '..', 'contenidos', 'corpus');
const CAMPOS_CORPUS = ['id', 'titulo', 'problematica', 'ejeComparabilidad'];
const CAMPOS_IMAGEN = ['id', 'archivo', 'titulo'];
const TIPOS_IMAGEN = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const PESO_RECOMENDADO = 500 * 1024;
const PESO_MAXIMO = 4 * 1024 * 1024;

function validarCorpus(corpus, posicion) {
  const errores = [];
  const nombre = corpus?.id ? `"${corpus.id}"` : `en la posición ${posicion + 1}`;

  for (const campo of CAMPOS_CORPUS) {
    if (typeof corpus?.[campo] !== 'string' || !corpus[campo].trim()) {
      errores.push(`Corpus ${nombre}: falta "${campo}".`);
    }
  }
  if (!Array.isArray(corpus?.imagenes) || corpus.imagenes.length !== 3) {
    errores.push(
      `Corpus ${nombre}: tiene que tener exactamente 3 imágenes (tiene ${corpus?.imagenes?.length ?? 0}).`
    );
  } else {
    corpus.imagenes.forEach((imagen, i) => {
      for (const campo of CAMPOS_IMAGEN) {
        if (typeof imagen?.[campo] !== 'string' || !imagen[campo].trim()) {
          errores.push(`Corpus ${nombre}, imagen ${i + 1}: falta "${campo}".`);
        }
      }
    });
  }
  return errores;
}

// Revisa el peso de una imagen: devuelve un error si es demasiado pesada
// para enviarla a Gemini y un aviso si conviene achicarla (se ve desde celulares)
function revisarPeso(corpusId, archivo, bytes) {
  if (bytes > PESO_MAXIMO) {
    return { error: `Corpus "${corpusId}": "${archivo}" pesa más de 4 MB. Achicala (1600 px de lado como máximo).` };
  }
  if (bytes > PESO_RECOMENDADO) {
    return { aviso: `Corpus "${corpusId}": "${archivo}" pesa más de 500 KB; conviene achicarla (1600 px de lado como máximo).` };
  }
  return {};
}

// Si la ficha no trae descripción para lectores de pantalla, se arma una con
// el título y el autor
function textoAlternativo(imagen) {
  if (imagen.textoAlternativo?.trim()) return imagen.textoAlternativo.trim();
  return `Imagen del corpus: «${imagen.titulo}»${imagen.autor ? `, de ${imagen.autor}` : ''}.`;
}

// Lo que ve el navegador: sin rutas internas del servidor ni ids de Drive
function versionPublica(corpus) {
  return {
    id: corpus.id,
    titulo: corpus.titulo,
    problematica: corpus.problematica,
    ejeComparabilidad: corpus.ejeComparabilidad,
    imagenes: corpus.imagenes.map((imagen) => ({
      id: imagen.id,
      url:
        `/imagenes/${encodeURIComponent(corpus.id)}/${encodeURIComponent(imagen.id)}` +
        (imagen.version ? `?v=${encodeURIComponent(imagen.version)}` : ''),
      titulo: imagen.titulo,
      autor: imagen.autor || '',
      anio: imagen.anio || '',
      soporte: imagen.soporte || '',
      procedencia: imagen.procedencia || '',
      // Dirección web de la ficha de la obra (solo si es http/https)
      fuente: /^https?:\/\//.test(imagen.fuente || '') ? imagen.fuente : '',
      textoAlternativo: textoAlternativo(imagen),
    })),
  };
}

// Conjunto de corpus listos para usar. "imagenes" es un Map con clave
// "corpusId/imagenId" y valor { mimeType, datos (Buffer) }.
function armarColeccion({ lista, imagenes, problemas = [] }) {
  const porId = new Map(lista.map((c) => [c.id, c]));
  return {
    problemas,
    listar: () => [...porId.values()],
    obtener: (id) => porId.get(id) || null,
    obtenerImagen: (corpusId, imagenId) => imagenes.get(`${corpusId}/${imagenId}`) || null,
    // Las 3 imágenes como inline_data para Gemini (base64)
    imagenesParaGemini: (corpus) =>
      corpus.imagenes.map((imagen) => {
        const guardada = imagenes.get(`${corpus.id}/${imagen.id}`);
        return { titulo: imagen.titulo, mimeType: guardada.mimeType, datos: guardada.datos.toString('base64') };
      }),
    versionPublica,
  };
}

// Corpus del proyecto: contenidos/corpus/corpus.json e imagenes/
function cargarCorpus(carpeta = CARPETA_CORPUS) {
  const carpetaImagenes = path.join(carpeta, 'imagenes');
  const problemas = [];
  let lista = [];
  try {
    lista = JSON.parse(fs.readFileSync(path.join(carpeta, 'corpus.json'), 'utf8'));
    if (!Array.isArray(lista)) throw new Error('el archivo tiene que contener una lista');
  } catch (error) {
    problemas.push(`No se pudo leer corpus.json: ${error.message}`);
    lista = [];
  }

  const validos = new Map();
  const imagenes = new Map();
  lista.forEach((corpus, i) => {
    const errores = validarCorpus(corpus, i);
    if (validos.has(corpus?.id)) errores.push(`Corpus "${corpus.id}": el id está repetido.`);
    const leidas = [];
    if (!errores.length) {
      for (const imagen of corpus.imagenes) {
        const archivo = path.basename(imagen.archivo);
        const mimeType = TIPOS_IMAGEN[path.extname(archivo).toLowerCase()];
        const ruta = path.join(carpetaImagenes, archivo);
        if (!mimeType) {
          errores.push(`Corpus "${corpus.id}": "${imagen.archivo}" tiene que ser JPG, PNG o WEBP.`);
        } else if (!fs.existsSync(ruta)) {
          errores.push(`Corpus "${corpus.id}": no se encontró el archivo "${imagen.archivo}" en contenidos/corpus/imagenes.`);
        } else {
          const datos = fs.readFileSync(ruta);
          const { error, aviso } = revisarPeso(corpus.id, imagen.archivo, datos.length);
          if (error) errores.push(error);
          if (aviso) problemas.push(aviso);
          leidas.push([`${corpus.id}/${imagen.id}`, { mimeType, datos }]);
        }
      }
    }
    if (errores.length) {
      problemas.push(...errores);
      return;
    }
    validos.set(corpus.id, corpus);
    for (const [clave, valor] of leidas) imagenes.set(clave, valor);
  });

  if (validos.size === 0) problemas.push('No hay ningún corpus válido en contenidos/corpus.');
  return armarColeccion({ lista: [...validos.values()], imagenes, problemas });
}

// Servicio que combina los dos orígenes. "lectorDrive" es null si Drive no
// está configurado.
function crearServicioCorpus({ carpetaLocal, lectorDrive = null, ahora = () => Date.now() } = {}) {
  const local = cargarCorpus(carpetaLocal);
  local.problemas.forEach((p) => console.error('[corpus]', p));

  let deDrive = null;
  let enCurso = null;
  let temporizador = null;
  let primeraLectura = null;
  const estado = {
    origen: 'proyecto',
    estado: lectorDrive ? 'pendiente' : 'sin-configurar',
    ultimaSincronizacion: null,
    error: null,
    advertencias: [],
    reporte: null,
  };

  const activa = () => deDrive || local;

  async function ejecutarSincronizacion() {
    try {
      const { lista, imagenes, problemas, carpetas } = await lectorDrive.leer();
      const advertencias = [...problemas];
      if (lista.length) {
        deDrive = armarColeccion({ lista, imagenes });
        estado.origen = 'drive';
      } else {
        deDrive = null;
        estado.origen = 'proyecto';
        advertencias.push(
          carpetas
            ? 'Ninguna carpeta de corpus de Drive es válida: se usan los corpus guardados en el proyecto.'
            : 'No hay carpetas "Corpus…" en la carpeta de Drive: se usan los corpus guardados en el proyecto.'
        );
      }
      const reporte = {
        fecha: new Date(ahora()).toISOString(),
        origen: estado.origen,
        carpetasDeCorpus: carpetas,
        corpus: activa()
          .listar()
          .map((c) => ({ id: c.id, titulo: c.titulo })),
        advertencias,
      };
      Object.assign(estado, { estado: 'ok', ultimaSincronizacion: reporte.fecha, error: null, advertencias, reporte });
      console.log(`[corpus] Sincronizado desde ${estado.origen}: ${reporte.corpus.map((c) => c.id).join(', ') || 'ninguno'}.`);
      advertencias.forEach((a) => console.warn('[corpus]', a));
      return reporte;
    } catch (error) {
      // Se conserva lo último que funcionó (Drive o, si nunca anduvo, el proyecto)
      estado.estado = 'error';
      estado.error = error.message;
      console.error(`[corpus] Falló la lectura de Drive (se siguen usando los corpus de ${estado.origen}): ${error.message}`);
      throw error;
    }
  }

  function sincronizar() {
    if (!lectorDrive) {
      const error = new Error('Drive no está configurado: se usan los corpus guardados en el proyecto.');
      error.statusCode = 503;
      return Promise.reject(error);
    }
    if (!enCurso) enCurso = ejecutarSincronizacion().finally(() => (enCurso = null));
    return enCurso;
  }

  function iniciar(minutos) {
    if (!lectorDrive) return;
    primeraLectura = sincronizar().catch(() => {});
    if (minutos > 0) {
      temporizador = setInterval(() => sincronizar().catch(() => {}), minutos * 60_000);
      temporizador.unref();
    }
  }

  // Al arrancar, espera la primera lectura de Drive (como máximo "ms") para
  // no ofrecer por unos segundos los corpus del proyecto y después cambiarlos
  function listo(ms = 20_000) {
    if (!primeraLectura) return Promise.resolve();
    let reloj;
    const limite = new Promise((resolver) => {
      reloj = setTimeout(resolver, ms);
      reloj.unref();
    });
    return Promise.race([primeraLectura, limite]).finally(() => clearTimeout(reloj));
  }

  return {
    get problemas() {
      return estado.origen === 'drive' ? estado.advertencias : [...local.problemas, ...estado.advertencias];
    },
    listar: () => activa().listar(),
    obtener: (id) => activa().obtener(id),
    obtenerImagen: (corpusId, imagenId) => activa().obtenerImagen(corpusId, imagenId),
    imagenesParaGemini: (corpus) => activa().imagenesParaGemini(corpus),
    versionPublica,
    sincronizar,
    iniciar,
    listo,
    detener: () => temporizador && clearInterval(temporizador),
    estadoParaSalud: () => ({
      origen: estado.origen,
      estado: estado.estado,
      ultimaSincronizacion: estado.ultimaSincronizacion,
      error: estado.error,
      advertencias: estado.advertencias,
    }),
  };
}

module.exports = {
  cargarCorpus,
  crearServicioCorpus,
  validarCorpus,
  revisarPeso,
  versionPublica,
  TIPOS_IMAGEN,
};
