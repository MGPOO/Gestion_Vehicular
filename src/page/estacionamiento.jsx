import React, { useState, useEffect } from "react";
import "../style/estacionamiento.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCar, faTruck, faMotorcycle, faCalendar, faFileAlt, faFileExport, faFilePdf } from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

const ParkingReport = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const vehicleIcons = {
    Liviano: faCar,
    Pesado: faTruck,
    Motocicleta: faMotorcycle,
  };

  const fetchParkingData = async () => {
    if (!startDate || !endDate || !vehicleType) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    const apiUrl = `http://198.244.132.50:8008/reportes/39?vhc_tipo=${vehicleType}&start_date=${encodeURIComponent(
      `${startDate} 00:00:00`
    )}&end_date=${encodeURIComponent(`${endDate} 23:59:59`)}&reporte=ubicacion_flota`;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Error en la respuesta: ${response.status}`);
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.results)) {
        throw new Error("La API devolvió un formato inesperado.");
      }

      // Mapeo de datos
      const mappedData = data.results.map((vehicle) => ({
        alias: vehicle.vhc_alias,
        ubicaciones: Object.entries(vehicle.ubicacion_flota || {}).flatMap(
          ([date, locations]) =>
            locations.map((ubicacion) => ({
              fecha: date,
              direccion: ubicacion.direccion,
              duracion: formatTime(ubicacion.duracion),
            }))
        ),
      }));

      setFilteredData(mappedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const exportToExcel = () => {
    if (filteredData.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const headers = ["Alias", "Fecha", "Dirección", "Duración"];
    const rows = filteredData.flatMap((vehicle) =>
      vehicle.ubicaciones.map((ubicacion) => [
        vehicle.alias,
        ubicacion.fecha,
        ubicacion.direccion,
        ubicacion.duracion,
      ])
    );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `ReporteEstacionamiento_${startDate}_${endDate}.xlsx`);
  };

  const exportToPDF = () => {
    if (filteredData.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Reporte de Estacionamiento", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Período: ${startDate} a ${endDate}`, 105, 30, { align: "center" });

    const tableBody = filteredData.flatMap((vehicle) =>
      vehicle.ubicaciones.map((ubicacion) => [
        vehicle.alias,
        ubicacion.fecha,
        ubicacion.direccion,
        ubicacion.duracion,
      ])
    );

    doc.autoTable({
      head: [["Alias", "Fecha", "Dirección", "Duración"]],
      body: tableBody,
      startY: 40,
    });

    doc.save(`ReporteEstacionamiento_${startDate}_${endDate}.pdf`);
  };

  const handleGenerateReport = () => {
    fetchParkingData();
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
              <option value="Liviano">Liviano</option>
              <option value="Pesado">Pesado</option>
              <option value="Motocicleta">Motocicleta</option>
            </select>
          </div>
        </div>

        <button className="generate-report" onClick={handleGenerateReport}>
          <FontAwesomeIcon icon={faFileAlt} /> Generar Reporte
        </button>
        <button onClick={exportToExcel} className="exportButton">
          <FontAwesomeIcon icon={faFileExport} /> Exportar Excel
        </button>
        <button onClick={exportToPDF} className="exportButton">
          <FontAwesomeIcon icon={faFilePdf} /> Exportar PDF
        </button>
      </div>

      <div className="report-table">
        {filteredData.map((vehicle, index) => (
          <div key={index} className="vehicle-section">
            <h3>
              <FontAwesomeIcon
                icon={vehicleIcons[vehicle.tipo] || faCar}
                className="icon"
              />{" "}
              Alias: {vehicle.alias}
            </h3>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Dirección</th>
                  <th>Duración</th>
                </tr>
              </thead>
              <tbody>
                {vehicle.ubicaciones.map((ubicacion, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{ubicacion.fecha}</td>
                    <td>{ubicacion.direccion}</td>
                    <td>{ubicacion.duracion}</td>
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
