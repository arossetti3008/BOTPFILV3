// Carga y valida contenidos/corpus/corpus.json.
// Reglas: cada corpus tiene exactamente 3 imágenes, con los campos de su
// ficha, y cada archivo existe en contenidos/corpus/imagenes en un formato
// que Gemini acepta. Un corpus inválido no se ofrece a los grupos; el
// problema se informa en el log y en /api/health.

const fs = require('node:fs');
const path = require('node:path');

const CARPETA_CORPUS = path.join(__dirname, '..', '..', 'contenidos', 'corpus');
const CAMPOS_CORPUS = ['id', 'titulo', 'problematica', 'ejeComparabilidad'];
const CAMPOS_IMAGEN = ['id', 'archivo', 'titulo', 'textoAlternativo'];
const TIPOS_IMAGEN = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const PESO_RECOMENDADO = 500 * 1024;

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

// Revisa que cada archivo exista, que sea de un tipo que Gemini acepta y
// que no sea demasiado pesado (se ve desde celulares y viaja a Gemini)
function revisarArchivos(corpus, carpetaImagenes) {
  const errores = [];
  const avisos = [];
  for (const imagen of corpus.imagenes) {
    const extension = path.extname(imagen.archivo).toLowerCase();
    const ruta = path.join(carpetaImagenes, path.basename(imagen.archivo));
    if (!TIPOS_IMAGEN[extension]) {
      errores.push(`Corpus "${corpus.id}": "${imagen.archivo}" tiene que ser JPG, PNG o WEBP.`);
    } else if (!fs.existsSync(ruta)) {
      errores.push(`Corpus "${corpus.id}": no se encontró el archivo "${imagen.archivo}" en contenidos/corpus/imagenes.`);
    } else if (fs.statSync(ruta).size > PESO_RECOMENDADO) {
      avisos.push(
        `Corpus "${corpus.id}": "${imagen.archivo}" pesa más de 500 KB; conviene achicarla (1600 px de lado como máximo).`
      );
    }
  }
  return { errores, avisos };
}

// Lo que ve el navegador: sin rutas internas del servidor
function versionPublica(corpus) {
  return {
    id: corpus.id,
    titulo: corpus.titulo,
    problematica: corpus.problematica,
    ejeComparabilidad: corpus.ejeComparabilidad,
    imagenes: corpus.imagenes.map((imagen) => ({
      id: imagen.id,
      url: `/imagenes/${encodeURIComponent(path.basename(imagen.archivo))}`,
      titulo: imagen.titulo,
      autor: imagen.autor || '',
      anio: imagen.anio || '',
      soporte: imagen.soporte || '',
      procedencia: imagen.procedencia || '',
      // Dirección web de la ficha de la obra (solo si es http/https)
      fuente: /^https?:\/\//.test(imagen.fuente || '') ? imagen.fuente : '',
      textoAlternativo: imagen.textoAlternativo,
    })),
  };
}

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
  lista.forEach((corpus, i) => {
    const errores = validarCorpus(corpus, i);
    if (validos.has(corpus?.id)) errores.push(`Corpus "${corpus.id}": el id está repetido.`);
    if (!errores.length) {
      const revision = revisarArchivos(corpus, carpetaImagenes);
      errores.push(...revision.errores);
      problemas.push(...revision.avisos);
    }
    if (errores.length) {
      problemas.push(...errores);
      return;
    }
    validos.set(corpus.id, corpus);
  });

  if (validos.size === 0) problemas.push('No hay ningún corpus válido para ofrecer a los grupos.');
  problemas.forEach((p) => console.error('[corpus]', p));

  // Las 3 imágenes como inline_data para Gemini (base64), leídas del disco
  function imagenesParaGemini(corpus) {
    return corpus.imagenes.map((imagen) => {
      const archivo = path.basename(imagen.archivo);
      return {
        titulo: imagen.titulo,
        mimeType: TIPOS_IMAGEN[path.extname(archivo).toLowerCase()],
        datos: fs.readFileSync(path.join(carpetaImagenes, archivo)).toString('base64'),
      };
    });
  }

  return {
    carpetaImagenes,
    problemas,
    listar: () => [...validos.values()],
    obtener: (id) => validos.get(id) || null,
    versionPublica,
    imagenesParaGemini,
  };
}

module.exports = { cargarCorpus, validarCorpus };
