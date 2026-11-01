import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Encabezado from './components/Encabezado';
import Inicio from './pages/Inicio';
import Analisis from './pages/Analisis';
import Cierre from './pages/Cierre';
import Consigna from './pages/Consigna';

export default function App() {
  const { pathname } = useLocation();

  // Cada pantalla empieza desde arriba (si no, se conserva el desplazamiento
  // de la pantalla anterior y lo importante queda fuera de la vista)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <a href="#contenido" className="saltar">
        Saltar al contenido
      </a>
      <Encabezado />
      <main id="contenido" className="pantalla">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/analisis" element={<Analisis />} />
          <Route path="/cierre" element={<Cierre />} />
          <Route path="/consigna" element={<Consigna />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
