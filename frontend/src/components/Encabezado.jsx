import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Encabezado() {
  const { tema, alternarTema } = useTheme();
  const siguiente = tema === 'dark' ? 'claro' : 'oscuro';

  return (
    <header className="encabezado">
      <Link to="/" className="encabezado-marca">
        <span className="encabezado-titulo">BOTPFILV3</span>
        <span className="encabezado-subtitulo">Asistente de análisis discursivo visual</span>
      </Link>
      <button type="button" className="boton-icono" onClick={alternarTema} aria-label={`Cambiar a tema ${siguiente}`}>
        <span aria-hidden="true">{tema === 'dark' ? '☀' : '☾'}</span>
        <span className="solo-ancho">Tema {siguiente}</span>
      </button>
    </header>
  );
}
