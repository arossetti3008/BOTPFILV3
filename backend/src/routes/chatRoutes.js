// POST /api/chat — recibe la conversación desde el navegador y devuelve la
// respuesta del asistente. El backend no guarda conversaciones.

const express = require('express');
const { crearValidadorChat } = require('../middleware/validarChat');
const { crearLimitesPorGrupo } = require('../middleware/limites');
const { construirInstruccionesTutor } = require('../prompts/tutorLV3');

// Convierte el historial al formato de Gemini: empieza con un turno del
// usuario y une mensajes seguidos del mismo rol
function aContenidosGemini(mensajes) {
  const contenidos = [];
  for (const m of mensajes) {
    const role = m.rol === 'tutor' ? 'model' : 'user';
    if (contenidos.length === 0 && role === 'model') continue;
    const anterior = contenidos[contenidos.length - 1];
    if (anterior && anterior.role === role) {
      anterior.parts[0].text += `\n\n${m.contenido}`;
    } else {
      contenidos.push({ role, parts: [{ text: m.contenido }] });
    }
  }
  return contenidos;
}

function crearRutasChat({ config, taller, corpusService, gemini }) {
  const router = express.Router();

  router.post(
    '/',
    crearValidadorChat({ config, taller, corpusService }),
    ...crearLimitesPorGrupo(config.chat),
    async (req, res, next) => {
      const { comision, grupo, corpus, mensajes, fase } = req.chat;
      const inicio = Date.now();
      // Solo metadatos en el log, nunca el contenido de los mensajes
      const metadatos = `grupo=${comision}/${grupo} corpus=${corpus.id} fase=${fase}`;

      try {
        // El backend recorta el historial: no confía en el cliente
        const recientes = mensajes.slice(-config.chat.maxMensajesHistorial);
        const resultado = await gemini.generar({
          systemInstruction: construirInstruccionesTutor(corpus, { fase }),
          contents: aContenidosGemini(recientes),
        });

        console.log(`[chat] ${metadatos} modelo=${resultado.modelo} ms=${Date.now() - inicio} estado=200`);
        res.json({
          respuesta: resultado.texto,
          fuentes: [], // la bibliografía se agrega en la Etapa 2
          imagenesIncluidas: false, // las imágenes se adjuntan en la Etapa 3
          fase,
          modelo: resultado.modelo,
          truncada: resultado.truncada,
        });
      } catch (error) {
        console.log(`[chat] ${metadatos} ms=${Date.now() - inicio} estado=${error.statusCode || 500}`);
        if (error.esperaSegundos) res.set('Retry-After', String(error.esperaSegundos));
        next(error);
      }
    }
  );

  return router;
}

module.exports = { crearRutasChat, aContenidosGemini };
