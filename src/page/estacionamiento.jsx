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
  const [isGenerating, setIsGenerating] = useState(false);
 


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
    setIsGenerating(true);
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

      const haversineDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radio de la Tierra en kilómetros
        const toRad = (value) => (value * Math.PI) / 180;
      
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
      
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distancia en kilómetros
      };
      
      const groupLocations = (locations) => {
        const grouped = [];
      
        locations.forEach((current) => {
          const match = grouped.find(
            (group) =>
              haversineDistance(
                group.latitud,
                group.longitud,
                current.latitud,
                current.longitud
              ) < 0.1 // Distancia menor a 100 metros
          );
      
          if (match) {
            // Si hay coincidencia, suma la duración
            match.duracion += current.duracion;
          } else {
            // Si no hay coincidencia, agrega como nuevo grupo
            grouped.push({ ...current });
          }
        });
      
        return grouped;
      };
      

      const vehiclesWithLocations = [];
      const vehiclesWithoutLocations = [];

      data.results.forEach((vehicle) => {
        if (vehicle.ubicacion_flota) {
          vehiclesWithLocations.push({
            alias: vehicle.vhc_alias,
            ubicaciones: groupLocations(
              Object.entries(vehicle.ubicacion_flota || {})
                .flatMap(([_, locations]) =>
                  locations.map((ubicacion) => ({
                    latitud: ubicacion.latitud_agrupada || null,
                    longitud: ubicacion.longitud_agrupada || null,
                    direccion: ubicacion.direccion || "Sin registros de GPS",
                    duracion: ubicacion.duracion || 0,
                  }))
                )
            )
              .sort((a, b) => b.duracion - a.duracion) // Ordena por duración descendente
              .slice(0, 5), // Limita a los primeros 5 registros
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
      setIsGenerating(false);
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

  const getGoogleMapsLink = (latitud, longitud) => {
    return `https://www.google.com/maps?q=${latitud},${longitud}`;
  };  

  const exportToExcel = () => {
    if (filteredData.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }
  
    // Crear encabezado personalizado con las fechas
    const headers = [["Reporte de Estacionamiento"]];
    headers.push([`Tipo de vehículo: ${vehicleType}`]); // Agregar el tipo de vehículo
    headers.push([`Período: ${startDate} a ${endDate}`]);
    headers.push([]); // Línea en blanco después del encabezado
  
    const rows = [];
    filteredData.forEach((vehicle) => {
      // Agregar encabezado para cada vehículo
      rows.push([`Vehículo: ${vehicle.alias}`]);
      rows.push(["#", "Dirección", "Duración"]); // Encabezados de columnas
  
      if (vehicle.ubicaciones.length > 0) {
        vehicle.ubicaciones.forEach((ubicacion, idx) => {
          rows.push([
            idx + 1,
            ubicacion.direccion,
            formatTime(ubicacion.duracion),
          ]);
        });
      } else {
        rows.push(["Sin registros", "", ""]);
      }
  
      rows.push([]); // Línea en blanco entre vehículos
    });
  
    // Combinar encabezados y datos
    const data = [...headers, ...rows];
  
    // Crear libro y hoja
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
  
    // Ajustar estilo de ancho de columnas
    ws["!cols"] = [
      { wch: 10 }, // Columna #
      { wch: 60 }, // Columna Dirección
      { wch: 15 }, // Columna Duración
    ];
  
    // Agregar la hoja al libro y guardar
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `ReporteEstacionamiento_${startDate}_${endDate}.xlsx`);
  };
  

  const exportToPDF = () => {
    if (filteredData.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }
  
    const doc = new jsPDF();
    const tableBody = [];
  
    // Título principal del reporte
    doc.setFontSize(16);
    doc.text("Reporte de Estacionamiento", 105, 20, { align: "center" });
  
    // Subtítulo con las fechas
    doc.setFontSize(12);
    doc.text(`Tipo de vehículo: ${vehicleType}`, 105, 30, { align: "center" });

    doc.text(`Período: ${startDate} a ${endDate}`, 105, 40, { align: "center" });
  
    let startY = 50; // Posición inicial para la tabla
  
    filteredData.forEach((vehicle, vehicleIndex) => {
      // Espacio entre vehículos
      if (vehicleIndex > 0) startY += 5;
  
      // Título para el vehículo
      doc.setFontSize(14);
      doc.text(`Vehículo: ${vehicle.alias}`, 10, startY);
      startY += 5;
  
      // Encabezados de la tabla
      tableBody.push([{ content: "#", styles: { halign: "center" } }, "Dirección", "Duración"]);
  
      if (vehicle.ubicaciones.length > 0) {
        vehicle.ubicaciones.forEach((ubicacion, idx) => {
          tableBody.push([
            { content: idx + 1, styles: { halign: "center" } }, // Número
            ubicacion.direccion, // Dirección
            formatTime(ubicacion.duracion), // Duración
          ]);
        });
      } else {
        tableBody.push([{ content: "Sin registros", colSpan: 3, styles: { halign: "center" } }]);
      }
  
      // Generar la tabla para el vehículo
      doc.autoTable({
        startY,
        head: [["#", "Dirección", "Duración"]],
        body: tableBody,
        styles: { overflow: "linebreak", fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 10 }, // Columna #
          1: { cellWidth: 120 }, // Columna Dirección
          2: { cellWidth: 30 }, // Columna Duración
        },
      });
  
      // Actualizar posición Y para el siguiente vehículo
      startY = doc.previousAutoTable.finalY + 5;
      tableBody.length = 0; // Limpiar el cuerpo de la tabla para el siguiente vehículo
    });
  
    // Guardar el PDF
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

  const StatusPopup = ({ message, isError }) => (
    <div
      style={{
        position: "fixed",
        top: "20%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: isError ? "#f8d7da" : "#d1ecf1",
        color: isError ? "#721c24" : "#0c5460",
        padding: "20px",
        border: `1px solid ${isError ? "#f5c6cb" : "#bee5eb"}`,
        borderRadius: "5px",
        zIndex: 1000,
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      }}
    >
      {message}
    </div>
  );

  return (
    <div className="container">
      {/* Mostrar mensaje emergente si está cargando o si hay error */}
      {loading && <StatusPopup message="Cargando datos..." isError={false} />}
      {error && <StatusPopup message={`Error: ${error}`} isError={true} />}
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
          disabled={!isFormValid() || isGenerating} // Desactiva si la validación no es true
        >
          <FontAwesomeIcon icon={faFileAlt} /> Generar Reporte
        </button>
        <button
          onClick={exportToExcel}
          className="export-excel"
          disabled={!isFormValid() || isGenerating} // Desactiva si la validación no es true
        >
          <FontAwesomeIcon icon={faFileExport} /> Exportar Excel
        </button>
        <button
          onClick={exportToPDF}
          className="export-pdf"
          disabled={!isFormValid() || isGenerating} // Desactiva si la validación no es true
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
                    <td>
                      {ubicacion.direccion}
                      {ubicacion.direccion !== "Sin registros de GPS" && (
                        <button
                        className="view-direction-btn"
                        onClick={() => window.open(getGoogleMapsLink(ubicacion.latitud, ubicacion.longitud), "_blank")}
                        style={{ marginLeft: "10px" }}
                      >
                        Ver Dirección
                      </button>
                      
                      )}
                    </td>
                    <td>{formatTime(ubicacion.duracion)}</td>
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
