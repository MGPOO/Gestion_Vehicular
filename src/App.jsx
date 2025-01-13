import {BrowserRouter, Routes, Route} from 'react-router-dom';
import VehiculoMas from './page/vehiculoMas';
import Estacionamiento from './page/estacionamiento'


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Estacionamiento />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;