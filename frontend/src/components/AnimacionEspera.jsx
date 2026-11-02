// Animación mientras el servidor despierta. Una forma recorre los elementos
// de la sintaxis visual (Lenguaje Visual I y II) y termina pasando de la
// bidimensión a la tridimensión (Lenguaje Visual III):
//   Línea → Forma → Color → Textura → Volumen
// El ciclo dura unos 5 segundos y se repite; en cada vuelta cambia el color.
// Con "reducir movimiento" activado, los pasos cambian sin transiciones.
import { useEffect, useState } from 'react';

const PASOS = ['Línea', 'Forma', 'Color', 'Textura', 'Volumen'];
const DURACION_MS = [1000, 900, 900, 900, 1500]; // el volumen queda un poco más
const COLORES = ['var(--acento)', 'var(--azul)', 'var(--amarillo)'];

export default function AnimacionEspera() {
  const [paso, setPaso] = useState(0);
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    const reloj = setTimeout(() => {
      if (paso === PASOS.length - 1) setVuelta((v) => v + 1);
      setPaso((p) => (p + 1) % PASOS.length);
    }, DURACION_MS[paso]);
    return () => clearTimeout(reloj);
  }, [paso]);

  return (
    <div className="animacion-espera">
      <svg
        className={`sintaxis paso-${paso}`}
        style={{ '--color-forma': COLORES[vuelta % COLORES.length] }}
        viewBox="0 0 120 120"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <pattern id="espera-trama" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.3" fill="rgba(0,0,0,0.35)" />
          </pattern>
          <radialGradient id="espera-luz" cx="36%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.6" />
            <stop offset="45%" stopColor="#fff" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
          </radialGradient>
        </defs>
        <ellipse className="sintaxis-sombra" cx="60" cy="108" rx="30" ry="5" />
        <circle className="sintaxis-relleno" cx="60" cy="58" r="40" />
        <circle className="sintaxis-trama" cx="60" cy="58" r="40" fill="url(#espera-trama)" />
        <circle className="sintaxis-luz" cx="60" cy="58" r="40" fill="url(#espera-luz)" />
        <circle className="sintaxis-linea" cx="60" cy="58" r="40" pathLength="100" />
      </svg>

      <ol className="sintaxis-pasos" aria-hidden="true">
        {PASOS.map((nombre, i) => (
          <li key={nombre} className={i === paso ? 'activo' : i < paso ? 'hecho' : ''}>
            {nombre}
          </li>
        ))}
      </ol>
    </div>
  );
}
