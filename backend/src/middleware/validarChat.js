// Valida el cuerpo de POST /api/chat. Si algo falla responde 400 con un
// mensaje en español. Si todo está bien deja los datos limpios en req.chat.

const { analizarFases } = require('../utils/fases');

function errorValidacion(mensaje) {
  const error = new Error(mensaje);
  error.statusCode = 400;
  return error;
}

function crearValidadorChat({ config, taller, corpusService }) {
  const { chat } = config;
  const maxCaracteresTutor = chat.maxCaracteresMensaje * 4;

  return function validarChat(req, res, next) {
    const cuerpo = req.body || {};

    const comision = taller.comisiones.find((c) => c.id === cuerpo.comision);
    if (!comision) {
      return next(errorValidacion('Elegí una comisión válida.'));
    }

    const grupo = typeof cuerpo.grupo === 'string' ? cuerpo.grupo.trim().toUpperCase() : '';
    if (!taller.patronGrupo.test(grupo)) {
      return next(errorValidacion(`El código de grupo no es válido. Usá el formato indicado (por ejemplo ${taller.ejemplosGrupo.join(' o ')}).`));
    }
    if (grupo[0] !== comision.letra) {
      return next(errorValidacion(`El código de grupo de la comisión ${comision.nombre} tiene que empezar con ${comision.letra}.`));
    }

    const corpus = corpusService.obtener(cuerpo.corpusId);
    if (!corpus) {
      return next(errorValidacion('El corpus elegido no existe. Volvé al inicio y elegí uno de la lista.'));
    }

    const { mensajes } = cuerpo;
    if (!Array.isArray(mensajes) || mensajes.length === 0) {
      return next(errorValidacion('No hay ningún mensaje para enviar.'));
    }
    if (mensajes.length > chat.maxMensajesRecibidos) {
      return next(errorValidacion('La conversación es demasiado larga. Expórtenla y empiecen una nueva.'));
    }

    const limpios = [];
    for (const m of mensajes) {
      if (!m || !['estudiante', 'tutor'].includes(m.rol) || typeof m.contenido !== 'string' || !m.contenido.trim()) {
        return next(errorValidacion('Hay un mensaje con formato inválido en la conversación.'));
      }
      const maximo = m.rol === 'estudiante' ? chat.maxCaracteresMensaje : maxCaracteresTutor;
      if (m.contenido.length > maximo) {
        return next(
          errorValidacion(
            m.rol === 'estudiante'
              ? `El mensaje es demasiado largo: tiene ${m.contenido.length} caracteres y el máximo es ${chat.maxCaracteresMensaje}. Divídanlo en partes.`
              : 'Hay una respuesta del asistente demasiado larga en el historial.'
          )
        );
      }
      limpios.push({ rol: m.rol, contenido: m.contenido });
    }

    if (limpios[limpios.length - 1].rol !== 'estudiante') {
      return next(errorValidacion('El último mensaje tiene que ser del grupo.'));
    }

    const incluirImagenes = cuerpo.incluirImagenes === true;
    const comparacion = cuerpo.comparacion === true;
    const fases = analizarFases(
      limpios,
      { minMensajes: chat.minMensajesAntesImagenes, minCaracteres: chat.minCaracteresAntesImagenes },
      comparacion
    );

    if ((incluirImagenes && !fases.puedeVerImagenes) || (comparacion && !fases.puedeComparar)) {
      const pedido = incluirImagenes
        ? 'pedir observaciones del asistente sobre las imágenes'
        : 'pasar a la comparación entre las tres imágenes';
      const faltan = [];
      if (fases.faltan.mensajes) faltan.push(`${fases.faltan.mensajes} mensaje(s) más`);
      if (fases.faltan.caracteres) faltan.push(`unos ${fases.faltan.caracteres} caracteres más`);
      return next(
        errorValidacion(
          `Todavía no pueden ${pedido}: primero tienen que escribir su propia interpretación de las imágenes y revisarla con el asistente. Les falta: ${faltan.join(' y ')}.`
        )
      );
    }

    req.chat = { comision: comision.id, grupo, corpus, mensajes: limpios, incluirImagenes, fase: fases.fase };
    next();
  };
}

module.exports = { crearValidadorChat };
