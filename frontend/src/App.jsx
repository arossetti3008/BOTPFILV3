import { Navigate, Route, Routes } from 'react-router-dom';
import Encabezado from './components/Encabezado';
import Inicio from './pages/Inicio';
import Analisis from './pages/Analisis';
import Cierre from './pages/Cierre';
import Consigna from './pages/Consigna';

export default function App() {
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
