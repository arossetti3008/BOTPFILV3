// GET /api/corpus, /api/corpus/:id, /api/dimensiones y /api/consigna:
// contenidos que el docente edita en la carpeta contenidos/.

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');

const CARPETA_CONTENIDOS = path.join(__dirname, '..', '..', 'contenidos');

function crearRutasContenidos({ corpusService }) {
  const router = express.Router();
  // Se leen al iniciar: si el docente los cambia, se reinicia el servidor
  const dimensiones = JSON.parse(fs.readFileSync(path.join(CARPETA_CONTENIDOS, 'dimensiones.json'), 'utf8'));
  const consigna = fs.readFileSync(path.join(CARPETA_CONTENIDOS, 'consigna.md'), 'utf8');

  router.get('/corpus', (req, res) => {
    res.json(
      corpusService.listar().map(({ id, titulo, problematica }) => ({ id, titulo, problematica }))
    );
  });

  router.get('/corpus/:id', (req, res) => {
    const corpus = corpusService.obtener(req.params.id);
    if (!corpus) return res.status(404).json({ mensaje: 'No existe ese corpus.' });
    res.json(corpusService.versionPublica(corpus));
  });

  router.get('/dimensiones', (req, res) => res.json(dimensiones));
  router.get('/consigna', (req, res) => res.json({ texto: consigna }));

  return router;
}

module.exports = { crearRutasContenidos };
