// Exportación de la conversación como evidencia del trabajo del grupo.
// Se genera en el navegador, sin pasar por el servidor.
// Lo central: en cada mensaje queda inequívoco si lo escribió el GRUPO o si
// lo generó la IA (y con qué modelo), en qué fase y con qué fuentes.

export const VERSION_FORMATO = 1;
const AVISO_NO_AUTORIZADO = 'NO AUTORIZADO PARA DOCUMENTACIÓN';

const dos = (n) => String(n).padStart(2, '0');

// Fecha y hora locales en formato fijo (no depende del idioma del navegador)
export function fechaHora(iso) {
  const d = new Date(iso);
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

function hora(iso) {
  const d = new Date(iso);
  return `${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

// LV3_<comision>_<grupo>_<corpus>_<AAAA-MM-DD_HHmm>.<ext>
export function nombreArchivo(conversacion, fechaExportacion, extension) {
  const d = new Date(fechaExportacion);
  const marca = `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}_${dos(d.getHours())}${dos(d.getMinutes())}`;
  const limpio = (t) => String(t).replace(/[^\w-]+/g, '-');
  return `LV3_${limpio(conversacion.comision)}_${limpio(conversacion.grupo)}_${limpio(conversacion.corpusId)}_${marca}.${extension}`;
}

function modelosUsados(mensajes) {
  return [...new Set(mensajes.filter((m) => m.rol === 'tutor' && m.modelo).map((m) => m.modelo))];
}

// Datos comunes a los dos formatos
function datosRegistro(conversacion, { fechaExportacion, nombreComision }) {
  const mensajes = conversacion.mensajes;
  return {
    comision: { id: conversacion.comision, nombre: nombreComision || conversacion.comision },
    grupo: conversacion.grupo,
    corpus: { id: conversacion.corpusId, titulo: conversacion.corpusTitulo || '' },
    inicio: conversacion.inicio,
    exportacion: new Date(fechaExportacion).toISOString(),
    modelos: modelosUsados(mensajes),
    consentimiento: Boolean(conversacion.consentimiento),
    totales: {
      mensajes: mensajes.length,
      delGrupo: mensajes.filter((m) => m.rol === 'estudiante').length,
      delAsistente: mensajes.filter((m) => m.rol === 'tutor').length,
    },
  };
}

export function generarJson(conversacion, opciones) {
  const datos = datosRegistro(conversacion, opciones);
  return JSON.stringify(
    {
      formato: 'botpfilv3-conversacion',
      version: VERSION_FORMATO,
      ...datos,
      autorizadoParaDocumentacion: datos.consentimiento,
      ...(datos.consentimiento ? {} : { aviso: AVISO_NO_AUTORIZADO }),
      explicacion:
        'autor "grupo": texto escrito por estudiantes. autor "asistente": texto generado por IA (Gemini), con el modelo indicado.',
      mensajes: conversacion.mensajes.map((m, i) => {
        const esIA = m.rol === 'tutor';
        return {
          numero: i + 1,
          autor: esIA ? 'asistente' : 'grupo',
          generadoPorIA: esIA,
          modelo: esIA ? m.modelo || null : null,
          hora: m.hora,
          fase: m.fase ?? null,
          contenido: m.contenido,
          ...(esIA
            ? { imagenesRecibidas: Boolean(m.imagenesIncluidas), fuentes: m.fuentes || [], truncada: Boolean(m.truncada) }
            : { pidioImagenes: Boolean(m.pidioImagenes), pidioComparacion: Boolean(m.pidioComparacion) }),
        };
      }),
    },
    null,
    2
  );
}

export function generarTxt(conversacion, opciones) {
  const d = datosRegistro(conversacion, opciones);
  const linea = '='.repeat(72);
  const separador = '-'.repeat(72);
  const salida = [];

  if (!d.consentimiento) salida.push(`*** ${AVISO_NO_AUTORIZADO} ***`, '');
  salida.push(
    'LENGUAJE VISUAL III — Registro de la conversación con el asistente de IA',
    'IFDC Villa Mercedes · BOTPFILV3',
    linea,
    `Comisión: ${d.comision.nombre}`,
    `Grupo: ${d.grupo}`,
    `Corpus: ${d.corpus.titulo || d.corpus.id}`,
    `Inicio de la conversación: ${fechaHora(d.inicio)}`,
    `Exportación: ${fechaHora(d.exportacion)}`,
    `Modelo de IA usado: ${d.modelos.length ? d.modelos.join(', ') : '(ninguna respuesta todavía)'}`,
    `Consentimiento para documentación: ${d.consentimiento ? 'SÍ' : `NO — ${AVISO_NO_AUTORIZADO}`}`,
    `Mensajes: ${d.totales.mensajes} (grupo: ${d.totales.delGrupo}, asistente: ${d.totales.delAsistente})`,
    '',
    'Cómo leer este registro:',
    '  GRUPO = texto escrito por las y los estudiantes.',
    '  ASISTENTE (IA) = texto generado por inteligencia artificial (Gemini).',
    separador
  );

  conversacion.mensajes.forEach((m, i) => {
    const esIA = m.rol === 'tutor';
    const fase = m.fase ? ` — fase ${m.fase}` : '';
    const autor = esIA ? `ASISTENTE (IA, generado por ${m.modelo || 'Gemini'})` : 'GRUPO';
    salida.push('', `[${i + 1}] ${autor} — ${hora(m.hora)}${fase}`);
    if (!esIA && m.pidioImagenes) salida.push('    (El grupo pidió observaciones del asistente sobre las imágenes.)');
    if (!esIA && m.pidioComparacion) salida.push('    (El grupo pasó a la comparación entre las tres imágenes.)');
    salida.push(m.contenido);
    if (esIA) {
      if (m.imagenesIncluidas) salida.push('    Imágenes: el asistente recibió las tres imágenes del corpus.');
      if (m.truncada) salida.push('    Nota: la respuesta quedó cortada por su largo.');
      if (m.fuentes?.length) {
        salida.push('    Fuentes consultadas:');
        m.fuentes.forEach((f) => salida.push(`      - Fuente ${f.n}: ${f.autor} (${f.anio}). ${f.titulo}, ${f.pagina}.`));
      }
    }
  });

  salida.push('', separador, `Fin del registro · ${d.totales.mensajes} mensajes`);
  if (!d.consentimiento) salida.push(`*** ${AVISO_NO_AUTORIZADO} ***`);
  return salida.join('\n') + '\n';
}

// Descarga un texto como archivo (solo en el navegador)
export function descargarArchivo(contenido, nombre, tipo) {
  const blob = new Blob([contenido], { type: `${tipo};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
