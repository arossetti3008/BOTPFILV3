// Guardado de la conversación en el navegador (localStorage).
// - Cada clave incluye comisión, grupo y corpus: dos grupos en el mismo
//   navegador no ven la conversación del otro.
// - Toda lectura y escritura va dentro de try/catch: en modo privado o con el
//   almacenamiento lleno, la app sigue funcionando (sin guardar).

const PREFIJO = 'botpfilv3';
export const VERSION_CONVERSACION = 1;
const CLAVE_SESION = `${PREFIJO}_sesion`;

export function almacenamientoDisponible() {
  try {
    const prueba = `${PREFIJO}_prueba`;
    localStorage.setItem(prueba, '1');
    localStorage.removeItem(prueba);
    return true;
  } catch {
    return false;
  }
}

export function claveConversacion({ comision, grupo, corpusId }) {
  return `${PREFIJO}_conv_${comision}_${grupo}_${corpusId}`;
}

export function nuevaConversacion({ comision, grupo, corpusId }, corpusTitulo = '') {
  return {
    version: VERSION_CONVERSACION,
    comision,
    grupo,
    corpusId,
    corpusTitulo,
    inicio: new Date().toISOString(),
    mensajes: [],
    comparacion: false, // el grupo pasó a la fase 3
    mensajesExportados: 0, // cuántos mensajes había en la última exportación
    consentimiento: false,
  };
}

export function leerConversacion(sesion) {
  try {
    const texto = localStorage.getItem(claveConversacion(sesion));
    if (!texto) return null;
    const datos = JSON.parse(texto);
    if (datos.version !== VERSION_CONVERSACION || !Array.isArray(datos.mensajes)) return null;
    return datos;
  } catch {
    return null;
  }
}

// Devuelve false si no se pudo guardar (sin almacenamiento o lleno)
export function guardarConversacion(conversacion) {
  try {
    localStorage.setItem(claveConversacion(conversacion), JSON.stringify(conversacion));
    return true;
  } catch {
    return false;
  }
}

export function borrarConversacion(sesion) {
  try {
    localStorage.removeItem(claveConversacion(sesion));
  } catch {
    // nada que borrar
  }
}

export function mensajesSinExportar(conversacion) {
  if (!conversacion) return 0;
  return Math.max(0, conversacion.mensajes.length - (conversacion.mensajesExportados || 0));
}

// Sesión actual (qué grupo está usando este navegador), para sobrevivir a recargas
export function leerSesion() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null');
    return datos?.comision && datos?.grupo && datos?.corpusId ? datos : null;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion) {
  try {
    if (sesion) localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    else localStorage.removeItem(CLAVE_SESION);
  } catch {
    // sin almacenamiento: la sesión vive solo en memoria
  }
}
