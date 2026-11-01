require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const conectarDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const nodoRoutes = require('./src/routes/nodoRoutes');
const tutorRoutes = require('./src/routes/tutorRoutes');
const { manejadorErrores, rutaNoEncontrada } = require('./src/middleware/errorHandler');

const app = express();

// --- Seguridad basica ---
app.use(helmet()); // headers HTTP seguros por defecto

// CORS restringido solo al dominio del frontend en Vercel (nunca "*")
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// Limite global de requests por IP, para evitar abuso general de la API
const limiteGlobal = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiteGlobal);

app.use(express.json({ limit: '100kb' })); // limite de tamano de body, evita payloads gigantes

// --- Conexion a la base ---
conectarDB();

// --- Rutas ---
app.get('/api/health', (req, res) => {
  res.json({ estado: 'ok', servicio: 'nodos-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/nodos', nodoRoutes);
app.use('/api/tutor', tutorRoutes);

// --- Manejo de errores (siempre al final) ---
app.use(rutaNoEncontrada);
app.use(manejadorErrores);

const PUERTO = process.env.PORT || 5000;
app.listen(PUERTO, () => {
  console.log(`Servidor Nodos corriendo en puerto ${PUERTO} (${process.env.NODE_ENV || 'development'})`);
});
