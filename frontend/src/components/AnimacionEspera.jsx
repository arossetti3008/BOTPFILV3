// Animación mientras el servidor despierta: tres formas básicas (como las
// tres imágenes de un corpus) que cambian de lugar, y frases que rotan para
// ir entrando en clima. Con "reducir movimiento" activado, las formas quedan
// quietas y las frases siguen cambiando.
import { useEffect, useState } from 'react';

const FRASES = [
  'Mientras tanto: ¿qué es lo primero que mira el ojo en una imagen?',
  'Describir antes de interpretar: ¿qué hay, concretamente, en la imagen?',
  'Toda imagen construye a alguien que habla y a alguien a quien le habla.',
  'Tres imágenes, una problemática: ¿qué las une y qué las separa?',
  'Un color, un encuadre, una pose: nada en una imagen es casual.',
  '¿A qué género pertenece una imagen? ¿Y qué pasa cuando rompe sus reglas?',
];
const SEGUNDOS_POR_FRASE = 5;

export default function AnimacionEspera() {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    const reloj = setInterval(() => setIndice((i) => (i + 1) % FRASES.length), SEGUNDOS_POR_FRASE * 1000);
    return () => clearInterval(reloj);
  }, []);

  return (
    <div className="animacion-espera">
      <svg className="formas" viewBox="-100 -50 200 100" aria-hidden="true" focusable="false">
        <line className="formas-linea" x1="-90" y1="34" x2="90" y2="34" />
        <g className="forma forma-1">
          <circle className="forma-figura" r="16" />
        </g>
        <g className="forma forma-2">
          <rect className="forma-figura" x="-14" y="-14" width="28" height="28" rx="3" />
        </g>
        <g className="forma forma-3">
          <polygon className="forma-figura" points="0,-17 16,12 -16,12" />
        </g>
      </svg>
      {/* key: al cambiar la frase se repite la animación de entrada */}
      <p key={indice} className="animacion-frase" aria-live="off">
        {FRASES[indice]}
      </p>
    </div>
  );
}
