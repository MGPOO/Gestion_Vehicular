import {BrowserRouter, Routes, Route} from 'react-router-dom';
import VehiculoMas from './page/vehiculoMas';
import Estacionamiento from './page/estacionamiento'
import Ralenti from './page/ralenti'


function App() {
  return (
    <BrowserRouter>
      <Routes>
<<<<<<< HEAD
        <Route path="/" element={< Estacionamiento />} />
=======
        <Route path="/" element={< Ralenti />} />
        <Route path="/masUsado" element={< VehiculoMas />} />
>>>>>>> 45325736b2b1a439a82fdbb5131642e0b59a8acd
      </Routes>
    </BrowserRouter>
  );
}

export default App;