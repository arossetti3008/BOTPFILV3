// GET /api/bibliografia — lista de fuentes disponibles (sin los PDFs)
// POST /api/admin/sincronizar — fuerza la sincronización con Drive
//   (protegido con el header x-admin-token = ADMIN_TOKEN)

const crypto = require('node:crypto');
const express = require('express');

// Compara en tiempo constante para no dar pistas sobre el token
function tokensIguales(a, b) {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function crearRutasBibliografia({ config, bibliografia }) {
  const router = express.Router();

  router.get('/bibliografia', (req, res) => {
    const salud = bibliografia.estadoParaSalud();
    res.json({ estado: salud.estado, ultimaSincronizacion: salud.ultimaSincronizacion, fuentes: bibliografia.listarFuentes() });
  });

  function exigirTokenAdmin(req, res, next) {
    const recibido = req.get('x-admin-token') || '';
    const esperado = config.drive.adminToken;
    if (!esperado || !recibido || !tokensIguales(recibido, esperado)) {
      return res.status(401).json({ mensaje: 'Token de administración ausente o inválido.' });
    }
    next();
  }

  router.post('/admin/sincronizar', exigirTokenAdmin, async (req, res, next) => {
    try {
      res.json(await bibliografia.sincronizar({ forzar: true }));
    } catch (error) {
      error.statusCode = error.statusCode || 502;
      next(error);
    }
  });

  return router;
}

module.exports = { crearRutasBibliografia };
