// Bibliografía de la cátedra: se lee de la carpeta de Drive del docente y se
// indexa en memoria. Gemini nunca lee Drive: recibe solo los fragmentos más
// relevantes para cada mensaje (nunca la bibliografía completa).
//
// Sincronización: al iniciar y cada DRIVE_RESYNC_MINUTOS (solo si cambió
// algún archivo), o forzada con POST /api/admin/sincronizar.
// Si Drive falla se conserva el último índice válido.
//
// Datos de cada fuente (autor, año, título, página): se toman de la hoja
// "fuentes" de la carpeta de Drive si existe; si no, del archivo del proyecto
// backend/contenidos/fuentes.csv (mismas columnas). Los PDF pueden estar en
// subcarpetas.

const fs = require('node:fs');
const path = require('node:path');
const { leerCsvConEncabezados } = require('../utils/csv');
const { tokenizar, contarPalabras } = require('../utils/texto');
const { extraerPaginasPdf } = require('../utils/pdf');

const TIPO_PDF = 'application/pdf';
const TIPO_DOC = 'application/vnd.google-apps.document';
const TIPO_HOJA = 'application/vnd.google-apps.spreadsheet';
const TIPO_CARPETA = 'application/vnd.google-apps.folder';
const COLUMNAS = ['archivo', 'autor', 'anio', 'titulo', 'referenciaAPA', 'paginaInicial', 'dimensiones', 'corpus'];
const RUTA_FUENTES_LOCAL = path.join(__dirname, '..', '..', 'contenidos', 'fuentes.csv');

// Devuelve el texto de contenidos/fuentes.csv, o null si no existe
function leerFuentesLocalesPorDefecto() {
  try {
    return fs.readFileSync(RUTA_FUENTES_LOCAL, 'utf8');
  } catch {
    return null;
  }
}

const MAX_PALABRAS_FRAGMENTO = 350;
const MIN_PALABRAS_PAGINA = 5; // menos que esto se considera "página sin texto"
const LARGO_EXTRACTO = 280;

// Parámetros de BM25 (valores estándar) y de filtrado de resultados
const K1 = 1.2;
const B = 0.75;
const PUNTAJE_MINIMO = 1.0;
const PROPORCION_DEL_MEJOR = 0.3;
const BONO_CORPUS = 1.3;

// Divide una página en fragmentos parejos de hasta 350 palabras (~175-350),
// sin cruzar nunca a la página siguiente
function dividirPagina(texto) {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const cantidad = Math.max(1, Math.ceil(palabras.length / MAX_PALABRAS_FRAGMENTO));
  const tamanio = Math.ceil(palabras.length / cantidad);
  const fragmentos = [];
  for (let i = 0; i < palabras.length; i += tamanio) fragmentos.push(palabras.slice(i, i + tamanio).join(' '));
  return fragmentos;
}

function lista(valor) {
  return (valor || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function citarPagina(fuente, paginaPdf) {
  return fuente.paginaInicial !== null ? `p. ${fuente.paginaInicial + paginaPdf - 1}` : `p. ${paginaPdf} del PDF`;
}

function construirIndice(fragmentos) {
  const frecuenciaDocumental = new Map();
  let largoTotal = 0;
  for (const f of fragmentos) {
    f.frecuencias = new Map();
    for (const t of f.tokens) f.frecuencias.set(t, (f.frecuencias.get(t) || 0) + 1);
    for (const t of f.frecuencias.keys()) frecuenciaDocumental.set(t, (frecuenciaDocumental.get(t) || 0) + 1);
    largoTotal += f.tokens.length;
  }
  return { frecuenciaDocumental, largoPromedio: fragmentos.length ? largoTotal / fragmentos.length : 0 };
}

function crearServicioBibliografia({
  drive,
  extraerPaginas = extraerPaginasPdf,
  ahora = () => Date.now(),
  leerFuentesLocales = leerFuentesLocalesPorDefecto,
}) {
  let indice = null; // { fuentes, fragmentos, bm25 }
  let firmaCarpeta = null; // id:modifiedTime de todos los archivos, para detectar cambios
  let enCurso = null;
  let temporizador = null;
  const cache = new Map(); // id de archivo -> { modifiedTime, paginas }
  const estado = {
    estado: drive ? 'pendiente' : 'sin-configurar',
    ultimaSincronizacion: null,
    ultimoIntento: null,
    reporte: null,
    error: null,
  };

  function validarFilas(textoCsv, origen) {
    const { columnas, registros } = leerCsvConEncabezados(textoCsv);
    const faltantes = COLUMNAS.filter((c) => !columnas.includes(c));
    if (faltantes.length) {
      throw new Error(`A ${origen} le faltan columnas: ${faltantes.join(', ')}. Tienen que ser exactamente: ${COLUMNAS.join(', ')}.`);
    }
    return registros;
  }

  // Datos de las fuentes: hoja "fuentes" de Drive o, si no hay, el archivo del proyecto
  async function leerDatosFuentes(hoja) {
    if (hoja) {
      const contenido =
        hoja.mimeType === TIPO_HOJA ? await drive.exportar(hoja.id, 'text/csv') : await drive.descargar(hoja.id);
      return { filas: validarFilas(contenido.toString('utf8'), 'la hoja "fuentes"'), origen: 'hoja "fuentes" de Drive' };
    }
    const local = leerFuentesLocales();
    if (local) {
      return { filas: validarFilas(local, 'contenidos/fuentes.csv'), origen: 'archivo del proyecto contenidos/fuentes.csv' };
    }
    throw new Error(
      'No se encontraron los datos de las fuentes: falta la hoja "fuentes" en la carpeta de Drive y el archivo contenidos/fuentes.csv.'
    );
  }

  async function obtenerPaginas(documento) {
    const guardado = cache.get(documento.id);
    if (guardado && guardado.modifiedTime === documento.modifiedTime) return guardado.paginas;
    // Los Google Docs se exportan a PDF antes de extraer el texto
    const contenido =
      documento.mimeType === TIPO_DOC ? await drive.exportar(documento.id, TIPO_PDF) : await drive.descargar(documento.id);
    const paginas = await extraerPaginas(contenido);
    cache.set(documento.id, { modifiedTime: documento.modifiedTime, paginas });
    return paginas;
  }

  async function ejecutarSincronizacion(forzar) {
    const inicio = ahora();
    estado.ultimoIntento = new Date(inicio).toISOString();
    if (!indice) estado.estado = 'sincronizando';

    try {
      const archivos = await drive.listarCarpeta();
      const firma = archivos
        .map((a) => `${a.id}:${a.modifiedTime}`)
        .sort()
        .join('|');
      if (!forzar && indice && firma === firmaCarpeta) {
        return { ...estado.reporte, sinCambios: true };
      }

      const advertencias = [];
      const hoja = archivos.find((a) => ['fuentes', 'fuentes.csv'].includes(a.name.trim().toLowerCase())) || null;
      const { filas, origen } = await leerDatosFuentes(hoja);

      const documentos = new Map();
      for (const archivo of archivos) {
        if (archivo === hoja || archivo.mimeType === TIPO_CARPETA) continue;
        const ubicacion = archivo.carpeta ? ` (en ${archivo.carpeta})` : '';
        if (archivo.mimeType !== TIPO_PDF && archivo.mimeType !== TIPO_DOC) {
          advertencias.push(`Se ignora "${archivo.name}"${ubicacion}: solo se aceptan PDF y Google Docs.`);
          continue;
        }
        const nombre = archivo.name.trim();
        if (documentos.has(nombre)) {
          advertencias.push(`Hay dos archivos llamados "${nombre}"${ubicacion}: se usa solo el primero. Cambiale el nombre a uno.`);
          continue;
        }
        documentos.set(nombre, archivo);
      }

      const fuentes = [];
      const fragmentos = [];
      const usados = new Set();
      let paginasTotales = 0;
      let paginasSinTexto = 0;
      let palabras = 0;

      for (const fila of filas) {
        const nombre = fila.archivo;
        const documento = documentos.get(nombre);
        if (!documento) {
          advertencias.push(`La fila "${nombre}" de ${origen} no tiene archivo en la carpeta: se omite.`);
          continue;
        }
        usados.add(nombre);
        const faltan = ['autor', 'anio', 'titulo'].filter((c) => !fila[c]);
        if (faltan.length) {
          // Nunca se inventan metadatos
          advertencias.push(`"${nombre}": faltan datos en la hoja (${faltan.join(', ')}): se omite.`);
          continue;
        }

        let paginas;
        try {
          paginas = await obtenerPaginas(documento);
        } catch (error) {
          advertencias.push(`No se pudo leer "${nombre}": ${error.message}`);
          continue;
        }

        const paginaInicial = /^\d+$/.test(fila.paginaInicial) ? Number(fila.paginaInicial) : null;
        const fuente = {
          id: `f${fuentes.length + 1}`,
          archivo: nombre,
          autor: fila.autor,
          anio: fila.anio,
          titulo: fila.titulo,
          referenciaAPA: fila.referenciaAPA,
          paginaInicial,
          dimensiones: lista(fila.dimensiones),
          corpus: lista(fila.corpus),
          paginas: paginas.length,
          paginasIndexadas: 0,
        };

        paginas.forEach((textoPagina, i) => {
          const cantidad = contarPalabras(textoPagina);
          if (cantidad < MIN_PALABRAS_PAGINA) {
            paginasSinTexto++;
            advertencias.push(`"${nombre}", página ${i + 1} del PDF: sin texto (¿escaneada? Necesitaría OCR).`);
            return;
          }
          fuente.paginasIndexadas++;
          palabras += cantidad;
          for (const texto of dividirPagina(textoPagina)) {
            fragmentos.push({ fuente, paginaPdf: i + 1, texto, tokens: tokenizar(texto) });
          }
        });
        paginasTotales += paginas.length;
        fuentes.push(fuente);
      }

      for (const nombre of documentos.keys()) {
        if (!usados.has(nombre)) advertencias.push(`El archivo "${nombre}" no tiene fila en ${origen}: se omite.`);
      }
      // Se descarta de la memoria lo que ya no está en la carpeta
      const idsActuales = new Set(archivos.map((a) => a.id));
      for (const id of cache.keys()) if (!idsActuales.has(id)) cache.delete(id);

      indice = { fuentes, fragmentos, bm25: construirIndice(fragmentos) };
      firmaCarpeta = firma;

      const reporte = {
        fecha: new Date(ahora()).toISOString(),
        duracionMs: ahora() - inicio,
        datosDeLasFuentes: origen,
        fuentes: fuentes.length,
        paginas: paginasTotales,
        paginasSinTexto,
        fragmentos: fragmentos.length,
        palabras,
        advertencias,
        detalle: fuentes.map((f) => ({ archivo: f.archivo, paginas: f.paginas, paginasIndexadas: f.paginasIndexadas })),
      };
      Object.assign(estado, { estado: 'ok', ultimaSincronizacion: reporte.fecha, reporte, error: null });
      console.log(
        `[bibliografia] Sincronizada: ${reporte.fuentes} fuentes, ${reporte.paginas} páginas, ` +
          `${reporte.fragmentos} fragmentos, ${reporte.palabras} palabras, en ${reporte.duracionMs} ms.`
      );
      advertencias.forEach((a) => console.warn('[bibliografia]', a));
      return reporte;
    } catch (error) {
      estado.estado = indice ? 'ok' : 'error';
      estado.error = error.message;
      console.error(
        `[bibliografia] Falló la sincronización${indice ? ' (se sigue usando el último índice válido)' : ''}: ${error.message}`
      );
      throw error;
    }
  }

  function sincronizar({ forzar = false } = {}) {
    if (!drive) {
      const error = new Error('La bibliografía no está configurada (faltan DRIVE_FOLDER_ID o las credenciales de la cuenta de servicio).');
      error.statusCode = 503;
      return Promise.reject(error);
    }
    // Si ya hay una sincronización en curso, se espera esa misma
    if (!enCurso) enCurso = ejecutarSincronizacion(forzar).finally(() => (enCurso = null));
    return enCurso;
  }

  // Búsqueda BM25 sobre los fragmentos, con prioridad a las fuentes asociadas
  // al corpus activo (columna "corpus" con su id o "todos")
  function buscar(consulta, { corpusId, top = 4 } = {}) {
    if (!indice || !indice.fragmentos.length || top <= 0) return [];
    const terminos = [...new Set(tokenizar(consulta))];
    if (!terminos.length) return [];

    const { frecuenciaDocumental, largoPromedio } = indice.bm25;
    const total = indice.fragmentos.length;
    const resultados = [];

    for (const fragmento of indice.fragmentos) {
      let puntaje = 0;
      for (const termino of terminos) {
        const tf = fragmento.frecuencias.get(termino);
        if (!tf) continue;
        const df = frecuenciaDocumental.get(termino);
        const idf = Math.log(1 + (total - df + 0.5) / (df + 0.5));
        puntaje += (idf * tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * fragmento.tokens.length) / largoPromedio));
      }
      if (puntaje <= 0) continue;
      const { corpus } = fragmento.fuente;
      if (corpusId && (corpus.includes(corpusId) || corpus.includes('todos'))) puntaje *= BONO_CORPUS;
      resultados.push({ fragmento, puntaje });
    }

    resultados.sort((a, b) => b.puntaje - a.puntaje);
    const mejor = resultados[0]?.puntaje || 0;
    return resultados
      .filter((r) => r.puntaje >= PUNTAJE_MINIMO && r.puntaje >= mejor * PROPORCION_DEL_MEJOR)
      .slice(0, top)
      .map(({ fragmento, puntaje }) => ({
        fuente: fragmento.fuente,
        paginaPdf: fragmento.paginaPdf,
        pagina: citarPagina(fragmento.fuente, fragmento.paginaPdf),
        texto: fragmento.texto,
        puntaje: Number(puntaje.toFixed(3)),
      }));
  }

  function listarFuentes() {
    return (indice?.fuentes || []).map((f) => ({
      autor: f.autor,
      titulo: f.titulo,
      anio: f.anio,
      referenciaAPA: f.referenciaAPA,
      paginasIndexadas: f.paginasIndexadas,
      dimensiones: f.dimensiones,
      corpus: f.corpus,
    }));
  }

  function estadoParaSalud() {
    const r = estado.reporte;
    return {
      estado: estado.estado,
      ultimaSincronizacion: estado.ultimaSincronizacion,
      ultimoIntento: estado.ultimoIntento,
      error: estado.error,
      fuentes: indice?.fuentes.length || 0,
      paginas: r?.paginas || 0,
      paginasSinTexto: r?.paginasSinTexto || 0,
      fragmentos: indice?.fragmentos.length || 0,
      duracionMs: r?.duracionMs ?? null,
      advertencias: r?.advertencias || [],
    };
  }

  // Sincronización inicial (sin bloquear el arranque) y periódica
  function iniciar(minutos) {
    if (!drive) return;
    sincronizar().catch(() => {});
    if (minutos > 0) {
      temporizador = setInterval(() => sincronizar().catch(() => {}), minutos * 60_000);
      temporizador.unref(); // no impide que el proceso termine
    }
  }

  function detener() {
    if (temporizador) clearInterval(temporizador);
  }

  return {
    sincronizar,
    buscar,
    listarFuentes,
    estadoParaSalud,
    iniciar,
    detener,
    hayFuentes: () => Boolean(indice?.fragmentos.length),
    cantidadFuentes: () => indice?.fuentes.length || 0,
  };
}

// Bloque que se agrega al turno del grupo con los fragmentos encontrados
function formatearBloqueFuentes(encontrados) {
  return encontrados
    .map(({ fuente, pagina, texto }, i) => {
      const limpio = texto.replace(/"""/g, '"');
      return `[FUENTE ${i + 1}] ${fuente.autor} (${fuente.anio}). ${fuente.titulo}, ${pagina}.\n"""${limpio}"""`;
    })
    .join('\n\n');
}

// Lo que ve el frontend debajo de cada respuesta
function fuentesParaRespuesta(encontrados) {
  return encontrados.map(({ fuente, pagina, texto }, i) => ({
    n: i + 1,
    autor: fuente.autor,
    titulo: fuente.titulo,
    anio: fuente.anio,
    pagina,
    extracto: texto.length > LARGO_EXTRACTO ? `${texto.slice(0, LARGO_EXTRACTO).trimEnd()}…` : texto,
  }));
}

module.exports = {
  crearServicioBibliografia,
  formatearBloqueFuentes,
  fuentesParaRespuesta,
  dividirPagina,
  COLUMNAS,
};
