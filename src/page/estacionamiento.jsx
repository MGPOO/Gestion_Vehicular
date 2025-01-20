// ParkingReport.jsx
import React, { useState, useEffect } from "react";
import "../style/estacionamiento.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCar, faTruck, faMotorcycle, faCalendar, faFileAlt } from "@fortawesome/free-solid-svg-icons";

const ParkingReport = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mapeo de íconos para los tipos de vehículo
  const vehicleIcons = {
    auto: faCar,
    camion: faTruck,
    moto: faMotorcycle,
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    // Carga del archivo JSON localS
    const fetchParkingData = async () => {
      try {
        const response = await fetch("./ReporteEstacionamiento.json");
        if (!response.ok) {
          throw new Error("Error al cargar el archivo JSON");
        }
        const json = await response.json();

        // Transformar los datos
        const mappedData = json.results
          .filter((vehicle) => vehicle.ubicacion_flota.length > 0) // Excluir vehículos sin ubicaciones
          .map((vehicle) => ({
            alias: vehicle.vhc_alias,
            tipo: "auto", // Puedes mapear esto según tu lógica (auto, camion, moto, etc.)
            ubicaciones: vehicle.ubicacion_flota.map((ubicacion) => ({
              direccion: ubicacion.direccion,
              tiempo: formatTime(ubicacion.duracion), // Formatear tiempo a hh:mm:ss
            })),
          }));

        setData(mappedData);
        setFilteredData(mappedData);
      } catch (err) {
        console.error("Error al procesar el archivo JSON:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchParkingData();
  }, []);

  const handleGenerateReport = () => {
    console.log("Generar reporte para:", startDate, endDate, vehicleType);
  };

  if (loading) {
    return <div>Cargando datos...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

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
            <FontAwesomeIcon
              icon={vehicleIcons[vehicleType] || faCar}
              className="icon"
            />
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              <option value="">Tipo de vehículo</option>
              <option value="auto">Liviano</option>
              <option value="camion">Pesado</option>
              <option value="moto">Motocicleta</option>
            </select>
          </div>
        </div>

        <button className="generate-report" onClick={handleGenerateReport}>
          <FontAwesomeIcon icon={faFileAlt} /> Generar Reporte
        </button>
      </div>

      <div className="report-table">
        {filteredData.map((vehicle, index) => (
          <div key={index} className="vehicle-section">
            <h3>
              <FontAwesomeIcon
                icon={vehicleIcons[vehicle.tipo] || faQuestionCircle}
                className="icon"
              />{" "}
              Alias: {vehicle.alias}
            </h3>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Dirección</th>
                  <th>Tiempo</th>
                </tr>
              </thead>
              <tbody>
                {vehicle.ubicaciones.map((ubicacion, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{ubicacion.direccion}</td>
                    <td>{ubicacion.tiempo}</td>
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
