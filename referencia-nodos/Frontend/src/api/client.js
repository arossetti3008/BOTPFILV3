// Todas las llamadas al backend pasan por aca. Se encarga de:
// - agregar el token de autenticacion a cada request
// - renovarlo solo con el refreshToken si el accessToken vencio
// - traducir errores de red/CORS a un mensaje legible (en vez del "Failed to
//   fetch" generico que tira el navegador)
// - devolver errores en un formato consistente para el resto de la app

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const MENSAJE_ERROR_RED =
  'No se pudo conectar con el servidor. Revisá tu conexión a internet e intentá de nuevo en unos segundos.';

function obtenerTokens() {
  return {
    accessToken: localStorage.getItem('nodos_accessToken'),
    refreshToken: localStorage.getItem('nodos_refreshToken'),
  };
}

function guardarTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem('nodos_accessToken', accessToken);
  if (refreshToken) localStorage.setItem('nodos_refreshToken', refreshToken);
}

function limpiarTokens() {
  localStorage.removeItem('nodos_accessToken');
  localStorage.removeItem('nodos_refreshToken');
}

function errorDeRed(causaOriginal) {
  // fetch() lanza un TypeError generico ("Failed to fetch") cuando el
  // problema es de red o CORS, antes de llegar a tener una respuesta real
  // del servidor. Lo logueamos completo para debug, pero al usuario le
  // mostramos un mensaje que pueda entender y accionar.
  console.error('Fallo de red al llamar a la API:', causaOriginal);
  const error = new Error(MENSAJE_ERROR_RED);
  error.statusCode = 0;
  return error;
}

async function intentarRefrescar() {
  const { refreshToken } = obtenerTokens();
  if (!refreshToken) return null;

  try {
    const respuesta = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!respuesta.ok) return null;
    const data = await respuesta.json();
    guardarTokens({ accessToken: data.accessToken });
    return data.accessToken;
  } catch {
    return null;
  }
}

// Wrapper principal. path es relativo (ej: "/nodos"), sin incluir /api.
async function apiFetch(path, { method = 'GET', body, autenticado = true } = {}) {
  const hacerRequest = async (token) => {
    const headers = { 'Content-Type': 'application/json' };
    if (autenticado && token) headers.Authorization = `Bearer ${token}`;

    return fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  const { accessToken } = obtenerTokens();
  let respuesta;

  try {
    respuesta = await hacerRequest(accessToken);
  } catch (fallaDeRed) {
    throw errorDeRed(fallaDeRed);
  }

  // Si el token vencio (401) y la ruta requiere auth, intentamos refrescar UNA vez
  if (respuesta.status === 401 && autenticado) {
    const nuevoToken = await intentarRefrescar();
    if (nuevoToken) {
      try {
        respuesta = await hacerRequest(nuevoToken);
      } catch (fallaDeRed) {
        throw errorDeRed(fallaDeRed);
      }
    } else {
      limpiarTokens();
    }
  }

  const data = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    const error = new Error(data.mensaje || 'Ocurrio un error inesperado');
    error.statusCode = respuesta.status;
    throw error;
  }

  return data;
}

export const api = {
  registro: (nombre, email, password) =>
    apiFetch('/auth/registro', { method: 'POST', body: { nombre, email, password }, autenticado: false }),

  login: (email, password) =>
    apiFetch('/auth/login', { method: 'POST', body: { email, password }, autenticado: false }),

  perfil: () => apiFetch('/auth/perfil'),

  listarNodos: () => apiFetch('/nodos'),

  marcarDominado: (nodoId) => apiFetch(`/nodos/${nodoId}/dominar`, { method: 'PATCH' }),
  
  crearNodo: (payload) => apiFetch('/nodos', { method: 'POST', body: payload }),

 editarNodo: (id, payload) => apiFetch(`/nodos/${id}`, { method: 'PATCH', body: payload }),

  obtenerConversacion: (nodoId) => apiFetch(`/tutor/${nodoId}/conversacion`),


  enviarMensajeTutor: (nodoId, mensaje) =>
    apiFetch(`/tutor/${nodoId}/mensaje`, { method: 'POST', body: { mensaje } }),

  evaluarNodo: (nodoId) => apiFetch(`/tutor/${nodoId}/evaluar`, { method: 'POST' }),
};

export { guardarTokens, limpiarTokens, obtenerTokens };
