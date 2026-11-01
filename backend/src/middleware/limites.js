// Límites de uso con express-rate-limit (patrón de tutorRoutes de Nódos).
//
// En el aula todos los dispositivos suelen salir a internet con la misma IP
// pública. Por eso el límite por IP es alto (solo frena abusos externos) y el
// límite real de mensajes es por grupo: comisión + código de grupo + corpus.

const rateLimit = require('express-rate-limit');

function crearLimiteGlobalPorIp({ ventanaMs, max }) {
  return rateLimit({
    windowMs: ventanaMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { mensaje: 'Demasiados pedidos desde esta red. Esperá unos minutos y volvé a intentar.' },
  });
}

// Se usa después de validarChat, que deja los datos del grupo en req.chat
function claveDeGrupo(req) {
  const { comision, grupo, corpus } = req.chat;
  return `${comision}|${grupo}|${corpus.id}`;
}

function crearLimitesPorGrupo({ mensajesPorMinuto, maxMensajesSesion }) {
  const porMinuto = rateLimit({
    windowMs: 60 * 1000,
    max: mensajesPorMinuto,
    keyGenerator: claveDeGrupo,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      mensaje: `Están enviando mensajes muy rápido (máximo ${mensajesPorMinuto} por minuto). Esperen un minuto, piensen la próxima pregunta y vuelvan a enviar.`,
    },
  });

  const porDia = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: maxMensajesSesion,
    keyGenerator: claveDeGrupo,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      mensaje: `Este grupo llegó al máximo de ${maxMensajesSesion} mensajes por día con este corpus. Exporten la conversación y sigan el trabajo con la bibliografía.`,
    },
  });

  return [porMinuto, porDia];
}

module.exports = { crearLimiteGlobalPorIp, crearLimitesPorGrupo };
