// Normalización de texto para la búsqueda en la bibliografía:
// minúsculas, sin tildes, sin palabras vacías del español y con una
// reducción simple de plurales (imágenes → imagen, colores → color).
// Es una simplificación deliberada: no es un lematizador completo.

const PALABRAS_VACIAS = new Set(
  `a al algo algun alguna algunas alguno algunos ante antes aquel aquella aquellas aquello aquellos aqui asi aun aunque
  bajo bien cada casi cierta ciertas cierto ciertos como con contra cual cuales cuando cuanto de del desde donde dos
  durante e el ella ellas ello ellos en entre era eran eres es esa esas ese eso esos esta estaba estaban estamos estan
  estar estas este esto estos estoy fue fueron fui ha habia habian han hasta hay haya he hemos la las le les lo los mas
  me mi mis mucho muchos muy nada ni no nos nosotros nuestra nuestras nuestro nuestros o os otra otras otro otros para
  pero poco por porque pues que quien quienes se sea sean ser si sido siempre sin sino sobre sois somos son soy su sus
  tal tambien tampoco tan tanto te tenemos tener tengo ti tiene tienen todo todos tu tus un una unas uno unos usted
  ustedes vos vosotros y ya yo cosa cosas hacer hace hacen puede pueden dice decir vez veces`.split(/\s+/)
);

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Plurales: se quita la "s" final; si queda una "e" después de l, r, n, d o z,
// también se quita (colores → color, ciudades → ciudad, clases → clase)
function raiz(palabra) {
  if (palabra.length <= 3 || !palabra.endsWith('s')) return palabra;
  let resultado = palabra.slice(0, -1);
  if (resultado.length > 4 && resultado.endsWith('e') && /[lrndz]/.test(resultado.at(-2))) {
    resultado = resultado.slice(0, -1);
  }
  return resultado;
}

function tokenizar(texto) {
  return (normalizar(texto).match(/[a-z0-9]+/g) || [])
    .filter((palabra) => palabra.length > 1 && !PALABRAS_VACIAS.has(palabra))
    .map(raiz);
}

function contarPalabras(texto) {
  return (texto.match(/\S+/g) || []).length;
}

module.exports = { normalizar, tokenizar, contarPalabras };
