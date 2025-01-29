import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainNavigation from './page/main';
import VehiculoMas from './page/vehiculoMas';
import ParkingReport from './page/estacionamiento';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainNavigation />} />
        <Route path="/masUsado" element={<VehiculoMas />} />
        <Route path="/estacionamiento" element={<ParkingReport/>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
