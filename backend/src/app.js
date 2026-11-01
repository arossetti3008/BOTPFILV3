// Arma la aplicación Express. Está separada de server.js para que los tests
// puedan crear una app nueva (con Gemini simulado) sin abrir un puerto.

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { cargarTaller } = require('./config/taller');
const { cargarCorpus } = require('./services/corpusService');
const { crearCuota } = require('./services/cuotaService');
const { crearServicioGemini } = require('./services/geminiService');
const { crearLimiteGlobalPorIp } = require('./middleware/limites');
const { crearRutasChat } = require('./routes/chatRoutes');
const { crearRutasTaller } = require('./routes/tallerRoutes');
const { manejadorErrores, rutaNoEncontrada } = require('./middleware/errorHandler');

function crearApp({ config, fetchImpl, esperar } = {}) {
  const taller = cargarTaller();
  const corpusService = cargarCorpus();

  const limitesDiarios = { [config.gemini.modelo]: config.gemini.rpdMax };
  if (config.gemini.modeloRespaldo) limitesDiarios[config.gemini.modeloRespaldo] = config.gemini.rpdMaxRespaldo;
  const cuota = crearCuota({ rpmMax: config.gemini.rpmMax, limitesDiarios });
  const gemini = crearServicioGemini({ config, cuota, fetchImpl, esperar });

  const app = express();

  // Render pone un proxy delante: sin esto, todas las IP parecerían la misma
  app.set('trust proxy', 1);

  // Headers seguros; cross-origin para que el frontend (otro dominio) pueda
  // mostrar las imágenes del corpus que sirve este backend
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // CORS restringido al dominio del frontend (nunca "*"). Sin FRONTEND_URL
  // en producción, se bloquea todo origen externo.
  app.use(cors({ origin: config.frontendUrl || false }));

  app.use(crearLimiteGlobalPorIp(config.limiteIp));
  app.use(express.json({ limit: '300kb' })); // evita cuerpos gigantes

  app.get('/api/health', (req, res) => {
    const problemas = [...config.problemas, ...corpusService.problemas];
    res.json({
      estado: config.geminiListo ? 'ok' : 'incompleto',
      modelo: config.gemini.modelo || null,
      modeloRespaldo: config.gemini.modeloRespaldo || null,
      fuentesIndexadas: 0, // la bibliografía se agrega en la Etapa 2
      corpusDisponibles: corpusService.listar().length,
      cuota: cuota.estado(),
      problemas,
    });
  });

  app.use('/api', crearRutasTaller({ config, taller }));
  app.use('/api/chat', crearRutasChat({ config, taller, corpusService, gemini }));
  app.use('/imagenes', express.static(corpusService.carpetaImagenes, { maxAge: '1h', index: false }));

  // Manejo de errores (siempre al final)
  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);

  return app;
}

module.exports = { crearApp };
