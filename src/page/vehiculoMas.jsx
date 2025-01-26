import React, { useState } from "react";
import "../style/vehiculosMU.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  faCalendar,
  faCar,
  faTruck,
  faMotorcycle,
  faFileAlt,
  faFileExport,
  faFilePdf,
} from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

const VehicleReport = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [activeTab, setActiveTab] = useState("workdays");
  const [vehicleType, setVehicleType] = useState("");
  const [loading, setLoading] = useState(false); // Estado para indicar la carga de datos
  const [error, setError] = useState(null); // Estado para manejar errores
  const [errors, setErrors] = React.useState({});
  const vehicleIcons = {
    auto: faCar,
    camion: faTruck,
    moto: faMotorcycle,
  };

  const fetchData = async () => {
    if (!startDate || !endDate || !vehicleType) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    const formattedStartDate = `${startDate} 00:00:00`;
    const formattedEndDate = `${endDate} 23:59:59`;
    setLoading(true);
    setError(null);

    const corsProxyUrl = "https://cors-anywhere.herokuapp.com/";
    const fullUrl = `${corsProxyUrl}http://198.244.132.50:8008/reportes/39?vhc_tipo=${vehicleType}&start_date=${encodeURIComponent(
      formattedStartDate
    )}&end_date=${encodeURIComponent(
      formattedEndDate
    )}&reporte=most_active_vehicle`;

    try {
      const response = await fetch(fullUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Error en la respuesta: ${response.status}`);
      }
      const responseText = await response.text();
      const data = JSON.parse(responseText); // Parseando la respuesta JSON
      console.log(data);

      if (data.results && Array.isArray(data.results)) {
        setFilteredData(data.results); // Guardando los datos en el estado
      } else {
        setError("No se encontraron resultados.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date, type) => {
    if (type === "start") setStartDate(date);
    else setEndDate(date);
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const calculateStats = (vehicle) => {
    const filterStart = new Date(startDate);
    const filterEnd = new Date(endDate);

    const days =
      activeTab === "workdays"
        ? vehicle.dias_laborables || []
        : vehicle.dias_no_laborables || [];

    const filteredDays = days.filter((day) => {
      const dayDate = new Date(day.date);
      return dayDate >= filterStart && dayDate <= filterEnd;
    });

    if (filteredDays.length === 0) return null;

    const totalSeconds = filteredDays.reduce(
      (sum, day) =>
        sum + Math.round(parseFloat(day.activity_hours || 0) * 3600),
      0
    );

    const totalKm = filteredDays.reduce(
      (sum, day) => sum + parseFloat(day.total_distance || 0),
      0
    );
    const avgPercentage =
      filteredDays.reduce(
        (sum, day) => sum + (parseFloat(day.activity_hours || 0) / 24) * 100, // Usamos 24 horas como el total del día
        0
      ) / filteredDays.length;
    return { totalSeconds, totalKm, avgPercentage };
  };

  const exportToExcel = () => {
    if (filteredData.length === 0) {
      alert(
        "No hay datos para exportar. Por favor, genera un reporte primero."
      );
      return;
    }

    const reportTitle = [
      [
        `Reporte de Vehículos - ${
          activeTab === "workdays" ? "Días Laborales" : "Días No Laborales"
        }`,
      ],
      [`Período: ${startDate} a ${endDate}`],
      [],
    ];

    const headers = [
      "Ranking",
      "Placa",
      "Horas de Actividad",
      "Kilómetros Recorridos",
      "Porcentaje Promedio",
    ];

    const rows = filteredData
      .map((vehicle, index) => {
        const stats = calculateStats(vehicle);
        if (!stats) return null;

        return [
          index + 1, // Ranking
          vehicle.vhc_alias.split("\t")[1],
          formatTime(stats.totalSeconds),
          stats.totalKm.toFixed(2),
          `${stats.avgPercentage.toFixed(2)}%`,
        ];
      })
      .filter((row) => row !== null);

    const content = [...reportTitle, headers, ...rows];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(content);

    const columnWidths = [
      { wch: 10 }, // Ranking
      { wch: 15 }, // Placa
      { wch: 20 }, // Horas de Actividad
      { wch: 20 }, // Kilómetros Recorridos
      { wch: 20 }, // Porcentaje Promedio
    ];
    ws["!cols"] = columnWidths;

    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Reporte");

    const fileName = `reporte_vehiculos_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportToPDF = () => {
    if (filteredData.length === 0) {
      alert(
        "No hay datos para exportar. Por favor, genera un reporte primero."
      );
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    doc.setFont("helvetica");

    doc.setFontSize(16);
    doc.text(
      `Reporte de Vehículos - ${
        activeTab === "workdays" ? "Días Laborales" : "Días No Laborales"
      }`,
      doc.internal.pageSize.getWidth() / 2,
      20,
      { align: "center" }
    );

    doc.setFontSize(12);
    doc.text(
      `Período: ${startDate} a ${endDate}`,
      doc.internal.pageSize.getWidth() / 2,
      30,
      { align: "center" }
    );

    const currentDate = new Date().toLocaleString("es-ES");
    doc.setFontSize(10);
    doc.text(
      `Generado el: ${currentDate}`,
      doc.internal.pageSize.getWidth() - 20,
      10,
      { align: "right" }
    );

    const tableData = filteredData
      .map((vehicle, index) => {
        const stats = calculateStats(vehicle);
        if (!stats) return null;

        return [
          index + 1, // Ranking
          vehicle.vhc_alias.split("\t")[1],
          formatTime(stats.totalSeconds),
          stats.totalKm.toFixed(2),
          `${stats.avgPercentage.toFixed(2)}%`,
        ];
      })
      .filter((row) => row !== null);

    const tableStyles = {
      headStyles: {
        fillColor: [66, 66, 66],
        textColor: 255,
        fontSize: 12,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 11,
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 40 },
    };

    doc.autoTable({
      head: [
        [
          "Ranking",
          "Placa",
          "Horas de Actividad",
          "Kilómetros Recorridos",
          "Porcentaje Promedio",
        ],
      ],
      body: tableData,
      ...tableStyles,
      didDrawPage: function (data) {
        const pageNumber = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `Página ${pageNumber}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      },
    });

    doc.setProperties({
      title: `Reporte de Vehículos - ${startDate} a ${endDate}`,
      subject: "Reporte de Actividad Vehicular",
      author: "Sistema de Reportes",
      keywords: "vehiculos, reporte, actividad",
      creator: "Sistema de Gestión Vehicular",
    });

    const fileName = `reporte_vehiculos_${startDate}_${endDate}.pdf`;
    doc.save(fileName);
  };
  const validateFields = () => {
    const newErrors = {};

    if (!startDate) {
      newErrors.startDate = "Por favor, selecciona una fecha de inicio.";
    }
    if (!endDate) {
      newErrors.endDate = "Por favor, selecciona una fecha de fin.";
    } else if (startDate && new Date(startDate) > new Date(endDate)) {
      newErrors.endDate =
        "La fecha de inicio no puede ser mayor que la fecha de fin.";
    }
    if (!vehicleType) {
      newErrors.vehicleType = "Por favor, selecciona un tipo de vehículo.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0; // Devuelve true si no hay errores
  };

  const handleGenerateReport = () => {
    if (validateFields()) {
      fetchData(); // Llama a la función si las validaciones pasan
    }
  };

  return (
    <div className="containerVMU">
      <h1 className="titleVMU">Reporte de Vehículos</h1>
      <div className="filterSectionVMU">
        <div className="dateRangeVMU">
          <label className="dateLabel_VMU">
            Ingrese el rango de fecha
            <div className="dateInputsVMU">
              <FontAwesomeIcon icon={faCalendar} className="icon" />
              <input
                type="date"
                className="dateInputVMU"
                value={startDate}
                min="2025-01-15"
                onChange={(e) => handleDateChange(e.target.value, "start")}
                required
              />
              {errors.startDate && (
                <span className="error-message">{errors.startDate}</span>
              )}
              <FontAwesomeIcon icon={faCalendar} className="icon" />
              <input
                type="date"
                className="dateInputVMU"
                value={endDate}
                min={startDate}
                max={
                  new Date(Date.now() - 86400000).toISOString().split("T")[0]
                }
                onChange={(e) => handleDateChange(e.target.value, "end")}
                required
              />
              {errors.endDate && (
                <span className="error-message">{errors.endDate}</span>
              )}
            </div>
          </label>
        </div>

        <div className="vehicle-select">
          <label>Tipo de vehículo</label>
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
              <option value="" disabled>
                Tipo de vehículo
              </option>
              <option value="Liviano">Liviano</option>
              <option value="Pesado">Pesado</option>
              <option value="Motocicleta">Motocicleta</option>
            </select>
            {errors.vehicleType && (
              <span className="error-message">{errors.vehicleType}</span>
            )}
          </div>
        </div>

        <div className="buttonContainerVMU">
          <button onClick={handleGenerateReport} disabled={loading}>
            {loading ? "Cargando..." : "Generar Reporte"}
          </button>
          <button
            className="exportButtonVMU"
            onClick={exportToExcel}
            disabled={filteredData.length === 0}
          >
            <FontAwesomeIcon icon={faFileExport} className="icon" />
            Exportar Excel
          </button>
          <button
            className="exportButtonVMU exportPdfVMU"
            onClick={exportToPDF}
            disabled={filteredData.length === 0}
          >
            <FontAwesomeIcon icon={faFilePdf} className="icon" />
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="tabsContainerVMU">
        <button
          className={`tabButtonVMU ${
            activeTab === "workdays" ? "activeVMU" : ""
          }`}
          onClick={() => setActiveTab("workdays")}
        >
          Días laborales
        </button>
        <button
          className={`tabButtonVMU ${
            activeTab === "nonworkdays" ? "activeVMU" : ""
          }`}
          onClick={() => setActiveTab("nonworkdays")}
        >
          Días no laborales
        </button>
      </div>

      <div className="tableWrapperVMU">
        {filteredData.length === 0 ? (
          <p className="noDataMessageVMU">
            Ingrese un rango de fechas y haga clic en "Generar Reporte".
          </p>
        ) : (
          <table className="dataTableVMU">
            <thead>
              <tr>
                <th>Placa</th>
                <th>Ranking</th>
                <th>Horas de Actividad</th>
                <th>Kilómetros Recorridos</th>
                <th>Porcentaje Promedio</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((vehicle, index) => {
                const stats = calculateStats(vehicle);
                if (!stats) {
                  return (
                    <tr key={vehicle.vhc_imei}>
                      <td>{vehicle.vhc_alias.split("\t")[1]}</td>
                      <td colSpan="4" className="noDataCellVMU">
                        No hay datos disponibles para este vehículo en el rango
                        seleccionado.
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={vehicle.vhc_imei}>
                    <td>{vehicle.vhc_alias.split("\t")[1]}</td>
                    <td>{index + 1}</td>
                    <td>{formatTime(stats.totalSeconds)}</td>
                    <td>{stats.totalKm.toFixed(2)}</td>
                    <td>{stats.avgPercentage.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default VehicleReport;
