// Guía de las tres fases del trabajo, con la fase actual marcada
import { NOMBRES_FASE } from '../utils/fases';

const AYUDA = {
  1: 'Cuenten qué observan en cada imagen y qué interpretan.',
  2: 'El asistente usa la bibliografía para revisar su interpretación. Fundamenten con evidencias.',
  3: 'Relacionen las tres imágenes según el eje: continuidades, contrastes y rupturas.',
};

export default function Fases({ fase }) {
  return (
    <nav className="fases" aria-label="Fases del trabajo">
      <ol>
        {[1, 2, 3].map((n) => (
          <li
            key={n}
            className={`fase ${n === fase ? 'fase-actual' : ''} ${n < fase ? 'fase-hecha' : ''}`}
            aria-current={n === fase ? 'step' : undefined}
          >
            <span className="fase-numero">{n}</span>
            <span className="fase-nombre">{NOMBRES_FASE[n]}</span>
          </li>
        ))}
      </ol>
      <p className="fases-ayuda">{AYUDA[fase]}</p>
    </nav>
  );
}
