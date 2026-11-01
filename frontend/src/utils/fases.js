// Fases de la conversación, con la misma regla que el backend
// (backend/src/utils/fases.js). El backend vuelve a verificar todo: esto solo
// sirve para mostrar el estado y habilitar los botones.
//   1. Interpretación inicial
//   2. Revisión con bibliografía (cuando el grupo ya escribió su interpretación)
//   3. Relaciones entre las tres imágenes (la pide el grupo)

export const NOMBRES_FASE = {
  1: 'Interpretación inicial',
  2: 'Revisión con bibliografía',
  3: 'Relaciones entre las tres imágenes',
};

// mensajes: la conversación ya enviada (cada mensaje del grupo tiene respuesta)
export function estadoFases(mensajes, { minMensajesAntesImagenes, minCaracteresAntesImagenes }, comparacion) {
  const delGrupo = mensajes.filter((m) => m.rol === 'estudiante');
  const caracteres = delGrupo.reduce((total, m) => total + m.contenido.trim().length, 0);
  const interpretacionEscrita = delGrupo.length >= minMensajesAntesImagenes && caracteres >= minCaracteresAntesImagenes;

  let fase = 1;
  if (interpretacionEscrita) fase = 2;
  if (interpretacionEscrita && comparacion) fase = 3;

  return {
    fase,
    puedeVerImagenes: interpretacionEscrita,
    puedeComparar: interpretacionEscrita && !comparacion,
    faltanMensajes: Math.max(0, minMensajesAntesImagenes - delGrupo.length),
    faltanCaracteres: Math.max(0, minCaracteresAntesImagenes - caracteres),
  };
}

// Texto para explicar por qué un botón todavía está bloqueado
export function motivoBloqueo({ faltanMensajes, faltanCaracteres }) {
  const partes = [];
  if (faltanMensajes) partes.push(`${faltanMensajes} mensaje${faltanMensajes > 1 ? 's' : ''} más`);
  if (faltanCaracteres) partes.push(`unos ${faltanCaracteres} caracteres más`);
  return `Primero escriban su propia interpretación de las imágenes. Les falta: ${partes.join(' y ')}.`;
}
