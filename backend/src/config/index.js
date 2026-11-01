// Configuración del backend: lee las variables de entorno, aplica valores por
// defecto y junta los problemas encontrados. El servidor arranca igual aunque
// falte algo importante (por ejemplo la clave de Gemini): /api/health y
// /api/chat se encargan de informarlo con claridad.

const NIVELES_RAZONAMIENTO = ['', 'minimal', 'low', 'medium', 'high'];

function entero(valor, porDefecto, minimo = 0) {
  const numero = Number.parseInt(valor, 10);
  return Number.isFinite(numero) && numero >= minimo ? numero : porDefecto;
}

// Devuelve null si la variable está vacía: en ese caso no se envía a Gemini
// y el modelo usa su propio valor por defecto.
function decimalOpcional(valor, porDefecto) {
  if (valor === undefined) return porDefecto;
  if (String(valor).trim() === '') return null;
  const numero = Number.parseFloat(valor);
  return Number.isFinite(numero) ? numero : porDefecto;
}

function texto(valor) {
  return (valor || '').trim();
}

// Credenciales de la cuenta de servicio: el archivo JSON que descarga Google
// Cloud. Se acepta pegado tal cual (empieza con "{") o codificado en base64.
function leerCredenciales(valor, problemas) {
  if (!valor) return null;
  try {
    const texto = valor.startsWith('{') ? valor : Buffer.from(valor, 'base64').toString('utf8');
    const datos = JSON.parse(texto);
    if (!datos.client_email || !datos.private_key) throw new Error('faltan client_email o private_key');
    return { client_email: datos.client_email, private_key: datos.private_key, token_uri: datos.token_uri };
  } catch (error) {
    problemas.push(`GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 no es válido (${error.message}).`);
    return null;
  }
}

function leerDrive(env, problemas) {
  let folderId = texto(env.DRIVE_FOLDER_ID);
  // Los ids de Drive solo tienen letras, números, - y _ (evita inyectar en la consulta)
  if (folderId && !/^[\w-]+$/.test(folderId)) {
    problemas.push('DRIVE_FOLDER_ID no parece un id de carpeta de Drive válido.');
    folderId = '';
  }
  const credenciales = leerCredenciales(texto(env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64), problemas);
  const configurada = Boolean(folderId && credenciales);
  if (!configurada) {
    problemas.push('Bibliografía sin configurar (DRIVE_FOLDER_ID y credenciales de la cuenta de servicio): el chat funciona sin fuentes.');
  }
  const adminToken = texto(env.ADMIN_TOKEN);
  if (!adminToken) problemas.push('Falta ADMIN_TOKEN: no se puede forzar la sincronización de la bibliografía.');
  return {
    folderId,
    credenciales,
    configurada,
    resyncMinutos: entero(env.DRIVE_RESYNC_MINUTOS, 30, 0),
    adminToken,
  };
}

function cargarConfig(env = process.env) {
  const problemas = [];
  const entorno = texto(env.NODE_ENV) || 'development';

  // Sin barra final: CORS compara el origen exacto
  let frontendUrl = texto(env.FRONTEND_URL).replace(/\/+$/, '');
  if (!frontendUrl) {
    if (entorno === 'production') {
      problemas.push('Falta FRONTEND_URL: el navegador va a bloquear los pedidos del frontend (CORS).');
    } else {
      frontendUrl = 'http://localhost:5173';
    }
  }

  let nivelRazonamiento = texto(env.GEMINI_NIVEL_RAZONAMIENTO).toLowerCase();
  if (!NIVELES_RAZONAMIENTO.includes(nivelRazonamiento)) {
    problemas.push(
      `GEMINI_NIVEL_RAZONAMIENTO="${nivelRazonamiento}" no es válido (usá minimal, low, medium, high o dejalo vacío). Se ignora.`
    );
    nivelRazonamiento = '';
  }

  const gemini = {
    apiKey: texto(env.LLM_API_KEY),
    modelo: texto(env.GEMINI_MODEL),
    modeloRespaldo: texto(env.GEMINI_MODEL_RESPALDO),
    temperatura: decimalOpcional(env.GEMINI_TEMPERATURA, 0.6),
    maxTokensSalida: entero(env.GEMINI_MAX_TOKENS_SALIDA, 800, 1),
    nivelRazonamiento,
    // Topes propios, por debajo de los del plan gratuito, para no quemar cuota
    rpmMax: entero(env.GEMINI_RPM_MAX, 12, 1),
    rpdMax: entero(env.GEMINI_RPD_MAX, 450, 1),
    rpdMaxRespaldo: entero(env.GEMINI_RPD_MAX_RESPALDO, 450, 1),
    // Esperas entre reintentos ante 429/503 (crecientes)
    esperasReintentoMs: [1500, 3000],
    // Si Google pide esperar más que esto (header Retry-After), no esperamos:
    // pasamos al modelo de respaldo o avisamos al grupo
    esperaMaximaRetryAfterMs: 8000,
    // El frontend corta a los 60 s: el backend tiene que responder antes.
    // Cada intento espera como máximo timeoutMs, y todos los intentos juntos
    // (reintentos y modelo de respaldo incluidos) no pasan de presupuestoTotalMs.
    timeoutMs: 25000,
    presupuestoTotalMs: 50000,
  };

  if (!gemini.apiKey) problemas.push('Falta LLM_API_KEY: el asistente no puede responder.');
  if (!gemini.modelo) problemas.push('Falta GEMINI_MODEL: el asistente no puede responder.');
  if (gemini.modeloRespaldo && gemini.modeloRespaldo === gemini.modelo) {
    problemas.push('GEMINI_MODEL_RESPALDO es igual a GEMINI_MODEL: no hay respaldo real.');
  }

  return {
    puerto: entero(env.PORT, 5000, 1),
    entorno,
    frontendUrl,
    gemini,
    geminiListo: Boolean(gemini.apiKey && gemini.modelo),
    chat: {
      maxCaracteresMensaje: entero(env.MAX_CARACTERES_MENSAJE, 2000, 1),
      maxMensajesHistorial: entero(env.MAX_MENSAJES_HISTORIAL, 20, 1),
      maxMensajesSesion: entero(env.MAX_MENSAJES_SESION, 70, 1),
      mensajesPorMinuto: entero(env.MAX_MENSAJES_POR_MINUTO, 6, 1),
      topFragmentos: entero(env.TOP_FRAGMENTOS, 4, 0),
      minMensajesAntesImagenes: entero(env.MIN_MENSAJES_ANTES_IMAGENES, 2, 1),
      minCaracteresAntesImagenes: entero(env.MIN_CARACTERES_ANTES_IMAGENES, 300, 0),
      // Tope de mensajes por pedido (el navegador guarda hasta 300)
      maxMensajesRecibidos: 300,
    },
    // En el aula todos salen por la misma IP pública: este límite es alto a
    // propósito y solo frena abusos externos
    limiteIp: { ventanaMs: 15 * 60 * 1000, max: 2000 },
    drive: leerDrive(env, problemas),
    problemas,
  };
}

module.exports = { cargarConfig };
