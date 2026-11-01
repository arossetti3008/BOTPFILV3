// GET /api/config-taller — lo que el frontend necesita para armar la pantalla
// de inicio y respetar los mismos límites que el backend.

const express = require('express');

function crearRutasTaller({ config, taller }) {
  const router = express.Router();

  router.get('/config-taller', (req, res) => {
    const { chat } = config;
    res.json({
      comisiones: taller.comisiones,
      formatoGrupo: { patron: taller.patronGrupoTexto, ejemplos: taller.ejemplosGrupo },
      limites: {
        maxCaracteresMensaje: chat.maxCaracteresMensaje,
        mensajesPorMinuto: chat.mensajesPorMinuto,
        maxMensajesSesion: chat.maxMensajesSesion,
        minMensajesAntesImagenes: chat.minMensajesAntesImagenes,
        minCaracteresAntesImagenes: chat.minCaracteresAntesImagenes,
        maxMensajesGuardados: chat.maxMensajesRecibidos,
      },
      aviso: taller.aviso,
    });
  });

  return router;
}

module.exports = { crearRutasTaller };
