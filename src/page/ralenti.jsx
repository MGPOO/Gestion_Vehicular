import React, { useState } from 'react';
import "../style/ralenti.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCar, faCalendar, faFileAlt } from "@fortawesome/free-solid-svg-icons";

const IdleTimeReport = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  
  const sampleData = [
    { id: "00001", vehicle: "Christine Brooks", idleTime: "089 Kutch Green Apt. 448", date: "14 Feb 2019", type: "Electric", status: "Completed" },
    { id: "00002", vehicle: "Rosie Pearson", idleTime: "979 Immanuel Ferry Suite 526", date: "14 Feb 2019", type: "Book", status: "Processing" },
    { id: "00003", vehicle: "Darrell Caldwell", idleTime: "8587 Frida Ports", date: "14 Feb 2019", type: "Medicine", status: "Rejected" },
    { id: "00004", vehicle: "Gilbert Johnston", idleTime: "768 Destiny Lake Suite 600", date: "14 Feb 2019", type: "Mobile", status: "Completed" },
    { id: "00005", vehicle: "Alan Cain", idleTime: "042 Mylene Throughway", date: "14 Feb 2019", type: "Watch", status: "Processing" },
    { id: "00006", vehicle: "Alfred Murray", idleTime: "543 Weinmann Mountain", date: "14 Feb 2019", type: "Medicine", status: "Completed" },
  ];

  return (
    <div className="container">
      <h1>Reporte de Tiempo de Ralentí</h1>
      <div className="filters">
        <div className="filter-group">
          <label>Fecha Inicio</label>
          <div className="date-input">
            <FontAwesomeIcon icon={faCalendar} className="icon" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>
        <div className="filter-group">
          <label>Fecha Fin</label>
          <div className="date-input">
            <FontAwesomeIcon icon={faCalendar} className="icon" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div className="filter-group">
          <label>Tipo de Vehículo</label>
          <div className="vehicle-select">
            <FontAwesomeIcon icon={faCar} className="icon" />
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              <option value="">Seleccione</option>
              <option value="Electric">Eléctrico</option>
              <option value="Book">Libro</option>
              <option value="Medicine">Medicina</option>
            </select>
          </div>
        </div>
        <button className="generate-btn">
          <FontAwesomeIcon icon={faFileAlt} className="icon" /> Generar Reporte
        </button>
      </div>
      <div className="report-table">
        <table>
          <thead>
            <tr>
              <th>Ranking</th>
              <th>Vehículo</th>
              <th>Tiempo de Ralentí</th>
              <th>Porcentaje Inactividad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {sampleData.map((data, index) => (
              <tr key={data.id}>
                <td>{data.id}</td>
                <td>{data.vehicle}</td>
                <td>{data.idleTime}</td>
                <td>{data.date}</td>
                <td>
                  <span className={`status ${data.status.toLowerCase()}`}>
                    {data.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IdleTimeReport;
