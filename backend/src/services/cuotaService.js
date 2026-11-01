// Guardia de cuota de Gemini, en memoria.
// - Por minuto: cuenta todas las llamadas reales a Gemini (incluidos los
//   reintentos), sumando todos los modelos.
// - Por día: cuenta las llamadas de cada modelo. El día se mide en hora del
//   Pacífico porque Google reinicia la cuota diaria a medianoche de esa zona
//   (alrededor de las 5 de la mañana en Argentina).
// Si el servidor se reinicia (Render lo duerme por inactividad), los
// contadores vuelven a cero: por eso los topes configurados dejan margen.

const formatoDiaPacifico = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function claveDiaPacifico(fecha) {
  return formatoDiaPacifico.format(fecha);
}

function crearCuota({ rpmMax, limitesDiarios = {}, ahora = () => Date.now() }) {
  let marcas = []; // momentos de las llamadas del último minuto
  let dia = claveDiaPacifico(new Date(ahora()));
  const usoDiario = new Map();
  const agotados = new Set(); // modelos que Google informó sin cuota diaria

  function actualizarDia() {
    const hoy = claveDiaPacifico(new Date(ahora()));
    if (hoy !== dia) {
      dia = hoy;
      usoDiario.clear();
      agotados.clear();
    }
  }

  function limpiarMarcas() {
    const t = ahora();
    marcas = marcas.filter((m) => t - m < 60_000);
    return t;
  }

  return {
    // 0 si hay lugar este minuto; si no, los segundos que conviene esperar
    esperaPorMinuto() {
      const t = limpiarMarcas();
      if (marcas.length < rpmMax) return 0;
      return Math.max(1, Math.ceil((60_000 - (t - marcas[0])) / 1000));
    },

    disponibleHoy(modelo) {
      actualizarDia();
      if (agotados.has(modelo)) return false;
      const limite = limitesDiarios[modelo];
      return !limite || (usoDiario.get(modelo) || 0) < limite;
    },

    registrarLlamada(modelo) {
      actualizarDia();
      marcas.push(ahora());
      usoDiario.set(modelo, (usoDiario.get(modelo) || 0) + 1);
    },

    marcarAgotado(modelo) {
      actualizarDia();
      agotados.add(modelo);
    },

    estado() {
      actualizarDia();
      limpiarMarcas();
      return {
        diaPacifico: dia,
        llamadasUltimoMinuto: marcas.length,
        rpmMax,
        usoHoy: Object.fromEntries(usoDiario),
        limitesDiarios,
        modelosAgotados: [...agotados],
      };
    },
  };
}

module.exports = { crearCuota, claveDiaPacifico };
