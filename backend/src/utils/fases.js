// Fases de la conversación (decisión pedagógica):
//   1. Interpretación inicial: el grupo escribe qué observa e interpreta.
//      El asistente no recibe bibliografía.
//   2. Revisión con bibliografía: empieza sola cuando el grupo ya escribió
//      su interpretación (al menos N mensajes que suman M caracteres).
//   3. Relaciones entre las tres imágenes: la pide el grupo con un botón,
//      siempre después de haber pasado por la fase 2.
// La misma regla habilita las observaciones del asistente sobre las imágenes.
// El backend calcula todo a partir del historial: no confía en el navegador.

function resumirAportes(mensajesDelGrupo) {
  return {
    mensajes: mensajesDelGrupo.length,
    caracteres: mensajesDelGrupo.reduce((total, m) => total + m.contenido.trim().length, 0),
  };
}

function cumpleUmbral(aportes, { minMensajes, minCaracteres }) {
  return aportes.mensajes >= minMensajes && aportes.caracteres >= minCaracteres;
}

function analizarFases(mensajes, { minMensajes, minCaracteres }, comparacionPedida = false) {
  const delGrupo = mensajes.filter((m) => m.rol === 'estudiante');
  const umbral = { minMensajes, minCaracteres };

  // Incluye el mensaje que se está enviando
  const aportesConActual = resumirAportes(delGrupo);
  // Solo lo que el grupo ya había enviado antes (y el asistente ya respondió)
  const aportesPrevios = resumirAportes(delGrupo.slice(0, -1));

  const interpretacionEscrita = cumpleUmbral(aportesConActual, umbral);
  const interpretacionPrevia = cumpleUmbral(aportesPrevios, umbral);

  let fase = 1;
  if (interpretacionEscrita) fase = 2;
  if (comparacionPedida && interpretacionPrevia) fase = 3;

  return {
    fase,
    puedeComparar: interpretacionPrevia,
    puedeVerImagenes: interpretacionPrevia,
    faltan: {
      mensajes: Math.max(0, minMensajes - aportesPrevios.mensajes),
      caracteres: Math.max(0, minCaracteres - aportesPrevios.caracteres),
    },
  };
}

module.exports = { analizarFases };
