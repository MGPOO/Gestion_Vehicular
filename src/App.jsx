import {BrowserRouter, Routes, Route} from 'react-router-dom';
import VehiculoMas from './page/vehiculoMas';
import Estacionamiento from './page/estacionamiento'
import Ralenti from './page/ralenti'


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={< Ralenti />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;