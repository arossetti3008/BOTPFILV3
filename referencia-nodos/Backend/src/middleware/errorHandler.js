// Middleware de errores: se coloca al final de la cadena en server.js
function manejadorErrores(error, req, res, next) {
  console.error(error.stack);

  const codigo =
    error.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  res.status(codigo).json({
    mensaje: error.message || 'Error interno del servidor',
    // El stack solo se expone en desarrollo, nunca en produccion
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
  });
}

function rutaNoEncontrada(req, res, next) {
  res.status(404);
  next(new Error(`Ruta no encontrada: ${req.originalUrl}`));
}

module.exports = { manejadorErrores, rutaNoEncontrada };
