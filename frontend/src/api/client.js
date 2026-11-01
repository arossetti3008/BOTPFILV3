// Todas las llamadas al backend pasan por acá (basado en el cliente de Nódos).
// Se encarga de:
// - cortar el pedido a los 60 s (AbortController)
// - traducir errores de red, de servidor "despertando" y del backend a
//   mensajes que se puedan entender y accionar
// - devolver errores en un formato consistente ({ message, statusCode })

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
// Las imágenes del corpus las sirve el backend fuera de /api
const URL_SERVIDOR = BASE_URL.replace(/\/api$/, '');
const TIEMPO_MAXIMO_MS = 60_000;

const MENSAJE_ERROR_RED =
  'No se pudo conectar con el servidor. Revisen la conexión a internet e intenten de nuevo en unos segundos.';
const MENSAJE_SIN_CONEXION = 'El dispositivo no tiene conexión a internet. Revisen el wifi o los datos y vuelvan a intentar.';
const MENSAJE_DESPERTANDO =
  'El servidor está despertando: en el plan gratuito se duerme cuando no se usa y puede tardar hasta un minuto en arrancar. Esperen unos segundos y vuelvan a intentar.';

function crearError(mensaje, statusCode, extra = {}) {
  const error = new Error(mensaje);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
}

function errorDeRed(causaOriginal) {
  // fetch() lanza un TypeError genérico ("Failed to fetch") cuando falla la
  // red o CORS. Se registra completo para diagnosticar, pero al usuario se le
  // muestra un mensaje comprensible.
  console.error('Falla de red al llamar a la API:', causaOriginal);
  const sinConexion = typeof navigator !== 'undefined' && navigator.onLine === false;
  return crearError(sinConexion ? MENSAJE_SIN_CONEXION : MENSAJE_ERROR_RED, 0);
}

// path es relativo a /api (por ejemplo "/corpus")
async function apiFetch(path, { method = 'GET', body } = {}) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_MS);
  let respuesta;
  try {
    respuesta = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controlador.signal,
    });
  } catch (falla) {
    if (falla.name === 'AbortError') throw crearError(MENSAJE_DESPERTANDO, 0, { despertando: true });
    throw errorDeRed(falla);
  } finally {
    clearTimeout(temporizador);
  }

  const data = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    // Mientras el servicio arranca, Render responde con páginas que no son JSON
    if (!data && [502, 503, 504].includes(respuesta.status)) {
      throw crearError(MENSAJE_DESPERTANDO, respuesta.status, { despertando: true });
    }
    throw crearError(data?.mensaje || 'Ocurrió un error inesperado. Intenten de nuevo.', respuesta.status);
  }
  return data;
}

export const api = {
  configTaller: () => apiFetch('/config-taller'),
  listarCorpus: () => apiFetch('/corpus'),
  obtenerCorpus: (id) => apiFetch(`/corpus/${encodeURIComponent(id)}`),
  dimensiones: () => apiFetch('/dimensiones'),
  consigna: () => apiFetch('/consigna'),
  bibliografia: () => apiFetch('/bibliografia'),
  chat: (cuerpo) => apiFetch('/chat', { method: 'POST', body: cuerpo }),
};

export function urlImagen(ruta) {
  return `${URL_SERVIDOR}${ruta}`;
}
