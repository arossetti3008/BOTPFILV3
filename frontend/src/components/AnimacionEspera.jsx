// Animación mientras el servidor despierta (en Render gratuito tarda cerca
// de un minuto). Recorre las 5 dimensiones de análisis de LV III: en cada
// paso se agrega un elemento visual a la composición ("punto, línea y
// plano"), y una barra de 5 tramos muestra el avance y el tiempo estimado.
// Con "reducir movimiento" activado, los elementos aparecen sin animarse.
import { useEffect, useState } from 'react';

const PASOS = [
  { nombre: 'Género y estilo', frase: '¿Qué tipo de imagen es? Fotografía, afiche, pintura: cada género tiene sus reglas.' },
  { nombre: 'Nivel retórico', frase: 'Una imagen también argumenta: metáforas, repeticiones, contrastes.' },
  { nombre: 'Nivel temático', frase: '¿De qué habla la imagen? ¿Y qué deja afuera?' },
  { nombre: 'Nivel enunciativo', frase: 'Toda imagen construye a alguien que mira y a alguien que es mirado.' },
  { nombre: 'Análisis comparativo', frase: 'Tres imágenes, una problemática: ¿qué las une y qué las separa?' },
];
const SEGUNDOS_POR_PASO = 11;
const SEGUNDOS_ESTIMADOS = 60; // lo que suele tardar en despertar

export default function AnimacionEspera() {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const inicio = Date.now();
    const reloj = setInterval(() => setSegundos((Date.now() - inicio) / 1000), 500);
    return () => clearInterval(reloj);
  }, []);

  const paso = Math.min(PASOS.length - 1, Math.floor(segundos / SEGUNDOS_POR_PASO));
  // La barra avanza con el tiempo, pero nunca llega al final sola: se
  // completa cuando el servidor responde y la app entra
  const avance = Math.min(0.96, segundos / SEGUNDOS_ESTIMADOS);
  const faltan = Math.ceil(SEGUNDOS_ESTIMADOS - segundos);
  const clase = (n) => `capa${paso >= n ? ' visible' : ''}`;

  return (
    <div className="animacion-espera">
      <svg className="composicion" viewBox="0 0 240 190" aria-hidden="true" focusable="false">
        {/* 1. Género y estilo: el marco, el soporte de la imagen */}
        <g className={clase(0)}>
          <rect className="trazo marco" x="20" y="8" width="200" height="124" rx="4" pathLength="100" />
        </g>
        {/* 2. Nivel retórico: punto y línea */}
        <g className={clase(1)}>
          <line className="trazo linea-diagonal" x1="34" y1="120" x2="206" y2="22" pathLength="100" />
          <circle className="punto" cx="78" cy="56" r="13" />
        </g>
        {/* 3. Nivel temático: planos de color */}
        <g className={clase(2)}>
          <rect className="plano plano-a" x="126" y="72" width="70" height="46" />
          <rect className="plano plano-b" x="36" y="22" width="34" height="26" />
        </g>
        {/* 4. Nivel enunciativo: líneas de mirada que convergen en un punto de vista */}
        <g className={clase(3)}>
          {[
            [20, 8],
            [220, 8],
            [20, 132],
            [220, 132],
          ].map(([x, y]) => (
            <line key={`${x}-${y}`} className="trazo mirada" x1={x} y1={y} x2="150" y2="54" pathLength="100" />
          ))}
          <circle className="punto-de-vista" cx="150" cy="54" r="4" />
        </g>
        {/* 5. Análisis comparativo: tres imágenes unidas */}
        <g className={clase(4)}>
          <line className="trazo union" x1="48" y1="166" x2="192" y2="166" pathLength="100" />
          {[48, 120, 192].map((x, i) => (
            <g key={x} className={`miniatura miniatura-${i + 1}`}>
              <rect x={x - 20} y="150" width="40" height="32" rx="2" />
              <circle cx={x - 6} cy="162" r="5" />
            </g>
          ))}
        </g>
      </svg>

      <div className="espera-pasos" aria-hidden="true">
        {PASOS.map((p, i) => {
          const relleno = Math.max(0, Math.min(1, avance * PASOS.length - i));
          return (
            <span key={p.nombre} className="espera-tramo">
              <span style={{ transform: `scaleX(${relleno})` }} />
            </span>
          );
        })}
      </div>
      <p className="espera-paso">
        Paso {paso + 1} de {PASOS.length} · <strong>{PASOS[paso].nombre}</strong>
      </p>
      {/* key: al cambiar de paso se repite la animación de entrada */}
      <p key={paso} className="animacion-frase" aria-live="off">
        {PASOS[paso].frase}
      </p>
      <p className="espera-tiempo">{faltan > 5 ? `Faltan unos ${faltan} segundos` : 'Ya casi…'}</p>
    </div>
  );
}
