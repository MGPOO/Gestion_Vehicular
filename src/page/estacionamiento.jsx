import React, { useState, useEffect } from "react";
import "../style/estacionamiento.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCar, faTruck, faMotorcycle, faCalendar, faFileAlt, faFileExport, faFilePdf, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import ReactPaginate from "react-paginate";

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

  const handleStartDateChange = (e) => {
    const selectedDate = new Date(e.target.value);
    const minDate = new Date("2025-01-15");
  
    if (selectedDate < minDate) {
      alert("La fecha inicial debe ser igual o posterior al 15 de enero de 2025.");
      return;
    }
    setStartDate(e.target.value);
  };
  
  const handleEndDateChange = (e) => {
    const selectedDate = new Date(e.target.value);
    const startDateObj = new Date(startDate);
    const maxDate = new Date(startDateObj);
    maxDate.setDate(maxDate.getDate() + 31);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
  
    if (selectedDate < startDateObj) {
      alert("La fecha final no puede ser menor a la fecha inicial.");
      return;
    }
  
    if (selectedDate > maxDate) {
      alert("El rango de fechas no puede exceder los 31 días.");
      return;
    }
  
    if (selectedDate >= today) {
      alert("La fecha final no puede ser igual o posterior a la fecha actual.");
      return;
    }
  
    setEndDate(e.target.value);
  };
  

  const isFormValid = () => {
    return startDate && endDate && vehicleType; // Devuelve true si todos los campos tienen valores
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

      const vehiclesWithLocations = [];
      const vehiclesWithoutLocations = [];

      data.results.forEach((vehicle) => {
        if (vehicle.ubicacion_flota) {
          vehiclesWithLocations.push({
            alias: vehicle.vhc_alias,
            ubicaciones: Object.entries(vehicle.ubicacion_flota || {})
              .flatMap(([date, locations]) =>
                locations.map((ubicacion) => ({
                  fecha: date,
                  direccion: ubicacion.direccion || "Sin registros de GPS",
                  duracion: formatTime(ubicacion.duracion),
                }))
              )
              .slice(0, 5),
          });
        } else {
          vehiclesWithoutLocations.push({
            alias: vehicle.vhc_alias,
            ubicaciones: [],
          });
        }
      });

      setFilteredData([...vehiclesWithLocations, ...vehiclesWithoutLocations]);
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

  const getGoogleMapsLink = (direccion) => {
    const query = encodeURIComponent(direccion);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const exportToExcel = () => {
    if (filteredData.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const headers = ["Alias", "Fecha", "Dirección", "Duración"];
    const rows = filteredData.flatMap((vehicle) =>
      vehicle.ubicaciones.length > 0
        ? vehicle.ubicaciones.map((ubicacion) => [
            vehicle.alias,
            ubicacion.fecha,
            ubicacion.direccion,
            ubicacion.duracion,
          ])
        : [[vehicle.alias, "Sin registros", "Sin registros", ""]]
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
      vehicle.ubicaciones.length > 0
        ? vehicle.ubicaciones.map((ubicacion) => [
            vehicle.alias,
            ubicacion.fecha,
            ubicacion.direccion,
            ubicacion.duracion,
          ])
        : [[vehicle.alias, "Sin registros", "Sin registros", ""]]
    );

    doc.autoTable({
      head: [["Alias", "Fecha", "Dirección", "Duración"]],
      body: tableBody,
      startY: 40,
      styles: { overflow: "linebreak" },
      columnStyles: {
        2: { cellWidth: 100 },
      },
    });

    doc.save(`ReporteEstacionamiento_${startDate}_${endDate}.pdf`);
  };

  const ITEMS_PER_PAGE = 5; // Número de filas por página

  const [currentPage, setCurrentPage] = useState(0);

  const handlePageClick = ({ selected }) => {
      setCurrentPage(selected);
  };

  const paginatedData = filteredData.slice(
      currentPage * ITEMS_PER_PAGE,
      (currentPage + 1) * ITEMS_PER_PAGE
  );

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
          {/* Fecha inicial */}
          <FontAwesomeIcon icon={faCalendar} className="icon" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e)}
            min="2025-01-15" // Limita el inicio mínimo al 15 de enero
            max={new Date().toISOString().split("T")[0]} // No permite fechas futuras
          />

          {/* Fecha final */}
          <FontAwesomeIcon icon={faCalendar} className="icon" />
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleEndDateChange(e)}
            min={startDate} // Fecha final no puede ser menor que la inicial
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
              required
            >
              <option value="">Tipo de vehículo</option>
              <option value="Liviano">Liviano</option>
              <option value="Pesado">Pesado</option>
              {/* <option value="Motocicleta">Motocicleta</option> */}
            </select>
          </div>
        </div>

        <div className="button-group">
        <button
          className="generate-report"
          onClick={handleGenerateReport}
          disabled={!isFormValid()} // Desactiva si la validación no es true
        >
          <FontAwesomeIcon icon={faFileAlt} /> Generar Reporte
        </button>
        <button
          onClick={exportToExcel}
          className="export-excel"
          disabled={!isFormValid()} // Desactiva si la validación no es true
        >
          <FontAwesomeIcon icon={faFileExport} /> Exportar Excel
        </button>
        <button
          onClick={exportToPDF}
          className="export-pdf"
          disabled={!isFormValid()} // Desactiva si la validación no es true
        >
          <FontAwesomeIcon icon={faFilePdf} /> Exportar PDF
        </button>
      </div>


      </div>

      <div className="report-table">
      {paginatedData.map((vehicle, index) => (
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
                <th style={{ width: "1100px", wordWrap: "break-word" }}>
                  Dirección
                </th>
                <th>Duración</th>
              </tr>
            </thead>
            <tbody>
              {vehicle.ubicaciones.length > 0 ? (
                vehicle.ubicaciones.map((ubicacion, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{ubicacion.fecha}</td>
                    <td>
                      {ubicacion.direccion}
                      {ubicacion.direccion !== "Sin registros de GPS" && (
                        <button
                          onClick={() =>
                            window.open(
                              getGoogleMapsLink(ubicacion.direccion),
                              "_blank"
                            )
                          }
                          style={{ marginLeft: "10px" }}
                        >
                          Ver Dirección
                        </button>
                      )}
                    </td>
                    <td>{ubicacion.duracion}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">Sin registros</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>

    {/* Componente de paginación */}
    {filteredData.length > 0 && (
      <ReactPaginate
        previousLabel={"Anterior"}
        nextLabel={"Siguiente"}
        breakLabel={"..."}
        pageCount={Math.ceil(filteredData.length / ITEMS_PER_PAGE)}
        marginPagesDisplayed={2}
        pageRangeDisplayed={5}
        onPageChange={handlePageClick}
        containerClassName={"pagination"}
        activeClassName={"active"}
      />
    )}

      </div>
  );
};

export default ParkingReport;
