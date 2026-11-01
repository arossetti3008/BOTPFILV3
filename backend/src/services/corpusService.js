// Carga y valida contenidos/corpus/corpus.json.
// Regla: cada corpus tiene exactamente 3 imágenes. Un corpus inválido no se
// ofrece a los grupos y el problema se informa en el log y en /api/health.
// (Los endpoints públicos de corpus se agregan en la Etapa 3.)

const fs = require('node:fs');
const path = require('node:path');

const CARPETA_CORPUS = path.join(__dirname, '..', '..', 'contenidos', 'corpus');
const CAMPOS_CORPUS = ['id', 'titulo', 'problematica', 'ejeComparabilidad'];
const CAMPOS_IMAGEN = ['id', 'archivo', 'titulo', 'textoAlternativo'];

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

function cargarCorpus(carpeta = CARPETA_CORPUS) {
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
    if (errores.length) {
      problemas.push(...errores);
      return;
    }
    validos.set(corpus.id, corpus);
  });

  if (validos.size === 0) problemas.push('No hay ningún corpus válido para ofrecer a los grupos.');
  problemas.forEach((p) => console.error('[corpus]', p));

  return {
    carpetaImagenes: path.join(carpeta, 'imagenes'),
    problemas,
    listar: () => [...validos.values()],
    obtener: (id) => validos.get(id) || null,
  };
}

module.exports = { cargarCorpus, validarCorpus };
