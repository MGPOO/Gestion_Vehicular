// ParkingReport.jsx
import React, { useState, useEffect } from "react";
import "../style/estacionamiento.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCar, faCalendar, faFileAlt } from "@fortawesome/free-solid-svg-icons";

const ParkingReport = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const sampleData = [
    {
      id: "00001",
      placa: "089 Kutch Green Apt. 448",
      reportes: [
        { direccion: "Children Toy", horas: 2 },
        { direccion: "Makeup", horas: 2 },
        { direccion: "Asus Laptop", horas: 5 },
      ],
    },
    {
      id: "00002",
      placa: "979 Immanuel Ferry Suite 526",
      reportes: [
        { direccion: "Children Toy", horas: 2 },
        { direccion: "Makeup", horas: 2 },
        { direccion: "Asus Laptop", horas: 5 },
      ],
    },
  ];

  useEffect(() => {
    setFilteredData(sampleData);
  }, []);

  const handleGenerateReport = () => {
    // Aquí puedes implementar el filtro por rango de fechas y tipo de vehículo
    console.log("Generar reporte para:", startDate, endDate, vehicleType);
  };

  return (
    <div className="container">
      <h1>Reporte de Estacionamiento Frecuente</h1>

      <div className="filters">
        <div className="date-inputs">
          <label>Ingrese el rango de fecha</label>
          <div className="date-controls">
            <FontAwesomeIcon icon={faCalendar} className="icon" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <FontAwesomeIcon icon={faCalendar} className="icon" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
            />
          </div>
        </div>

        <div className="vehicle-select">
          <label>Seleccione el tipo de vehículo</label>
          <div className="vehicle-controls">
            <FontAwesomeIcon icon={faCar} className="icon" />
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              <option value="">Tipo de vehículo</option>
              <option value="auto">Auto</option>
              <option value="camion">Camión</option>
              <option value="moto">Moto</option>
            </select>
          </div>
        </div>

        <button className="generate-report" onClick={handleGenerateReport}>
          <FontAwesomeIcon icon={faFileAlt} /> Generar Reporte
        </button>
      </div>

      <div className="report-table">
        {filteredData.map((vehicle) => (
          <div key={vehicle.id} className="vehicle-section">
            <h3>
              #{vehicle.id} - {vehicle.placa}
            </h3>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Dirección</th>
                  <th>Horas</th>
                </tr>
              </thead>
              <tbody>
                {vehicle.reportes.map((reporte, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{reporte.direccion}</td>
                    <td>{reporte.horas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParkingReport;
