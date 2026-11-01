// Consigna del Trabajo Final Integrador (texto en backend/contenidos/consigna.md)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Markdown from '../components/Markdown';

export default function Consigna() {
  const navigate = useNavigate();
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .consigna()
      .then((datos) => setTexto(datos.texto))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <article className="tarjeta consigna">
      <button type="button" className="boton-secundario" onClick={() => navigate(-1)}>
        ← Volver
      </button>
      {error && <p className="mensaje-error">{error}</p>}
      {!texto && !error && <p className="texto-suave">Cargando la consigna…</p>}
      {texto && <Markdown texto={texto} />}
    </article>
  );
}
