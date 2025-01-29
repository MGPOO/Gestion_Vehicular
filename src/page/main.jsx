import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCar, faParking, faClipboardList } from '@fortawesome/free-solid-svg-icons';
import '../style/main.css';

const MainNavigation = () => {
  return (
    <div className="navigation-container">
      <h1 className="navigation-title">
        <FontAwesomeIcon icon={faClipboardList} className="navigation-icon" /> Gestión de Flotas Vehiculares
      </h1>
      <div className="navigation-buttons-container">
        <Link to="/masUsado" className="navigation-button">
          <FontAwesomeIcon icon={faCar} className="button-icon" /> Vehículos Más Usados
        </Link>
        <Link to="/estacionamiento" className="navigation-button">
          <FontAwesomeIcon icon={faParking} className="button-icon" /> Estacionamientos Frecuentes
        </Link>
      </div>
    </div>
  );
};

export default MainNavigation;
