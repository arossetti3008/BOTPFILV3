// GET /api/config-taller — lo que el frontend necesita para armar la pantalla
// de inicio y respetar los mismos límites que el backend.

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');

// Instrucciones de entrega de evidencias: las escribe el docente
const RUTA_ENTREGA = path.join(__dirname, '..', '..', 'contenidos', 'entrega-evidencias.md');

function crearRutasTaller({ config, taller }) {
  const router = express.Router();
  let entregaEvidencias = '';
  try {
    entregaEvidencias = fs.readFileSync(RUTA_ENTREGA, 'utf8');
  } catch {
    console.warn('[taller] No se encontró contenidos/entrega-evidencias.md');
  }

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
      entregaEvidencias,
    });
  });

  return router;
}

module.exports = { crearRutasTaller };
