import {BrowserRouter, Routes, Route} from 'react-router-dom';
import VehiculoMas from './page/vehiculoMas';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VehiculoMas />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;