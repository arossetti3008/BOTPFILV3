// GET /api/bibliografia — lista de fuentes disponibles (sin los PDFs)
// POST /api/admin/sincronizar — fuerza la sincronización con Drive de la
//   bibliografía y de los corpus (protegido con el header x-admin-token = ADMIN_TOKEN)

const crypto = require('node:crypto');
const express = require('express');

// Compara en tiempo constante para no dar pistas sobre el token
function tokensIguales(a, b) {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function crearRutasBibliografia({ config, bibliografia, corpusService }) {
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

  // Responde con el reporte de cada parte; si una falla, su error va en "error"
  router.post('/admin/sincronizar', exigirTokenAdmin, async (req, res) => {
    const [bib, cor] = await Promise.allSettled([bibliografia.sincronizar({ forzar: true }), corpusService.sincronizar()]);
    const resultado = (r) => (r.status === 'fulfilled' ? r.value : { error: r.reason.message });
    const ambasFallaron = bib.status === 'rejected' && cor.status === 'rejected';
    res.status(ambasFallaron ? bib.reason.statusCode || 502 : 200).json({ bibliografia: resultado(bib), corpus: resultado(cor) });
  });

  return router;
}

module.exports = { crearRutasBibliografia };
