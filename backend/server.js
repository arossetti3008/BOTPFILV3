// Punto de entrada del backend de BOTPFILV3.
require('dotenv').config();

const { cargarConfig } = require('./src/config');
const { crearApp } = require('./src/app');

const config = cargarConfig();
config.problemas.forEach((problema) => console.warn('[config]', problema));

const app = crearApp({ config });

// La bibliografía se sincroniza en segundo plano: el servidor no espera a Drive
app.locals.bibliografia.iniciar(config.drive.resyncMinutos);

app.listen(config.puerto, () => {
  console.log(
    `Servidor BOTPFILV3 en puerto ${config.puerto} (${config.entorno}). ` +
      `Modelo: ${config.gemini.modelo || 'SIN CONFIGURAR'}; respaldo: ${config.gemini.modeloRespaldo || 'ninguno'}.`
  );
});
