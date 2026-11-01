const express = require('express');
const rateLimit = require('express-rate-limit');
const { enviarMensaje, obtenerConversacion, evaluar } = require('../controllers/tutorController');
const { protegerRuta } = require('../middleware/auth');

const router = express.Router();

router.use(protegerRuta);

// Limite mas estricto que el resto de la API: cada mensaje/evaluacion
// consume cuota real de la API de Gemini, hay que cuidarla.
const limiteTutor = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,
  message: { mensaje: 'Estas mandando mensajes muy rapido, espera un minuto antes de seguir' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/:nodoId/conversacion', obtenerConversacion);
router.post('/:nodoId/mensaje', limiteTutor, enviarMensaje);
router.post('/:nodoId/evaluar', limiteTutor, evaluar);

module.exports = router;
