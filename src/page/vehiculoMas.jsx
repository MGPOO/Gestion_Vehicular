import React, { useState } from "react";
import "../style/vehiculosMU.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { reportesApi } from "../api/reportesApi";

import {
  faCalendar,
  faCar,
  faTruck,
  faMotorcycle,
  faFileExport,
  faFilePdf,
} from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

const VehicleReport = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activityData, setActivityData] = useState([]);
  const [activeTab, setActiveTab] = useState("workdays");
  const [vehicleType, setVehicleType] = useState("");
  const [loading, setLoading] = useState(false); // Estado para indicar la carga de datos
  const [error, setError] = useState(null); // Estado para manejar errores
  const [errors, setErrors] = useState({});
  const [expandedRow, setExpandedRow] = useState(null);
  const vehicleIcons = {
    Liviano: faCar,
    Pesado: faTruck,
    Motocicleta: faMotorcycle,
  };

  const toogleRow = (imei) => {
    setExpandedRow(expandedRow === imei ? null : imei);
  }

  const getActivityReport = async () => {
    if (!startDate || !endDate || !vehicleType) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    
    const formattedStartDate = `${startDate} 00:00:00`;
    const formattedEndDate = `${endDate} 23:59:59`;
    setLoading(true);
    setError(null);
    console.log("Realizando petición a la API...");

    try {
      const response = await reportesApi.get("/39", {
        headers: { "Content-Type": "application/json" },
        params: {
          vhc_tipo: vehicleType,
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          reporte: "most_active_vehicle",
        },
      });
      console.log("Respuesta recibida:", response.data.results);

      if (response.status !== 200) {
        throw new Error(`Error en la respuesta: ${response.status}`);
      }

      const results = response.data?.results;
      if (Array.isArray(results) && results.length > 0) {
        setActivityData(results);
      } else {
        setError("No se encontraron resultados.");
      }
    } catch (e) {
      setError(`Error al generar el reporte: ${e.message}`);
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

  const formatHours = (hours) => {
    const totalSeconds = Math.floor(hours * 3600);
    const hh = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const mm = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const ss = (totalSeconds % 60).toString().padStart(2, '0');
    
    return `${hh}:${mm}:${ss}`;
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

    // // Filtra los días donde las horas de actividad son mayores o iguales a 0
    // const filteredDaysWithoutNegative = filteredDays.filter((day) => {
    //   const activityHours = parseFloat(day.activity_hours);

    //   // Filtra las horas de actividad negativas o no numéricas
    //   return !isNaN(activityHours) && activityHours >= 0;
    // });

    // Luego, suma solo los días con horas válidas
    const totalSeconds = filteredDays.reduce((sum, day) => {
      const activityHours = parseFloat(day.activity_hours);
      return sum + Math.round(activityHours * 3600); // Convierte horas a segundos
    }, 0);

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
    if (activityData.length === 0) {
      alert("No hay datos para exportar. Por favor, genera un reporte primero.");
      return;
    }
  
    const reportTitle = [
      [`Reporte de Vehículos - ${activeTab === "workdays" ? "Días Laborales" : "Días No Laborales"}`],
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
  
    const rows = activityData
      .map((vehicle, index) => {
        const stats = calculateStats(vehicle);
        if (!stats) return null;
  
        const vehicleRow = [
          index + 1, // Ranking
          vehicle.vhc_alias.split("\t")[1],
          formatTime(stats.totalSeconds),
          stats.totalKm.toFixed(2),
          `${stats.avgPercentage.toFixed(2)}%`,
        ];
  
        // Detalle diario
        const days = activeTab === "workdays" ? vehicle.dias_laborables : vehicle.dias_no_laborables;
        const dailyDetails = days.map(day => [
          "", // Espacio en blanco para alinear con las columnas principales
          day.date,
          formatHours(day.activity_hours),
          day.total_distance,
          "", // Espacio en blanco para alinear con las columnas principales
        ]);
  
        return [vehicleRow, ...dailyDetails];
      })
      .filter((row) => row !== null)
      .flat();
  
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
    if (activityData.length === 0) {
      alert("No hay datos para exportar. Por favor, genera un reporte primero.");
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
      `Reporte de Vehículos - ${activeTab === "workdays" ? "Días Laborales" : "Días No Laborales"}`,
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
  
    const tableData = activityData
      .map((vehicle, index) => {
        const stats = calculateStats(vehicle);
        if (!stats) return null;
  
        const vehicleRow = [
          index + 1, // Ranking
          vehicle.vhc_alias.split("\t")[1],
          formatTime(stats.totalSeconds),
          stats.totalKm.toFixed(2),
          `${stats.avgPercentage.toFixed(2)}%`,
        ];
  
        // Detalle diario
        const days = activeTab === "workdays" ? vehicle.dias_laborables : vehicle.dias_no_laborables;
        const dailyDetails = days.map(day => [
          "", // Espacio en blanco para alinear con las columnas principales
          day.date,
          formatHours(day.activity_hours),
          day.total_distance,
          "", // Espacio en blanco para alinear con las columnas principales
        ]);
  
        return [vehicleRow, ...dailyDetails];
      })
      .filter((row) => row !== null)
      .flat();
  
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
      head: [["Ranking", "Placa", "Horas de Actividad", "Kilómetros Recorridos", "Porcentaje Promedio"]],
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

    return Object.keys(newErrors).length === 0;
  };

  const handleGenerateReport = () => {
    if (validateFields()) {
      getActivityReport();
    }
  };

  return (
    <div className="containerVMU">
      <h1 className="titleVMU">Reporte de Vehículos Más Usados</h1>
      <div className="filterSectionVMU">
        <div className="dateRangeVMU">
          <label className="dateLabelVMU">
            Ingrese el rango de fecha
            <div className="dateInputsVMU">
              <div className="inputGroupVMU">
                <FontAwesomeIcon icon={faCalendar} className="iconVMU" />
                <input
                  type="date"
                  className="dateInputVMU"
                  value={startDate}
                  min="2025-01-15"
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => handleDateChange(e.target.value, "start")}
                  required
                />
              </div>
              {errors.startDate && (
                <span className="errorMessageVMU">{errors.startDate}</span>
              )}
              <div className="inputGroupVMU">
                <FontAwesomeIcon icon={faCalendar} className="iconVMU" />
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
              </div>
              {errors.endDate && (
                <span className="errorMessageVMU">{errors.endDate}</span>
              )}
            </div>
          </label>
        </div>

        <div className="vehicleSelectVMU">
          <label>Tipo de vehículo</label>
          <div className="inputGroupVMU">
            <FontAwesomeIcon
              icon={vehicleIcons[vehicleType] || faCar}
              className="iconVMU"
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
              {/*<option value="Motocicleta">Motocicleta</option>*/}
            </select>
          </div>
          {errors.vehicleType && (
            <span className="errorMessageVMU">{errors.vehicleType}</span>
          )}
        </div>

        <div className="buttonContainerVMU">
          <button
            onClick={handleGenerateReport}
            disabled={!startDate || !endDate || !vehicleType || loading}
            className="generateButtonVMU"
          >
            {loading ? "Cargando..." : "Generar Reporte"}
          </button>
          <button
            className="exportButtonVMU"
            onClick={exportToExcel}
            disabled={activityData.length === 0}
          >
            <FontAwesomeIcon icon={faFileExport} />
            Exportar Excel
          </button>
          <button
            className="exportButtonVMU exportPdfVMU"
            onClick={exportToPDF}
            disabled={activityData.length === 0}
          >
            <FontAwesomeIcon icon={faFilePdf} />
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
        {activityData.length === 0 ? (
          <p className="noDataMessageVMU">
            Ingrese un rango de fechas, seleccione el tipo de vehiculo y haga
            clic en "Generar Reporte".
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
              {activityData
                .sort((a, b) => {
                  const statsA = calculateStats(a);
                  const statsB = calculateStats(b);

                  // Si no hay estadísticas para uno de los vehículos, lo coloca al final
                  if (!statsA) return 1;
                  if (!statsB) return -1;

                  // Ordenar de mayor a menor por total de segundos
                  return statsB.totalSeconds - statsA.totalSeconds;
                })
                .map((vehicle, index) => {
                  const stats = calculateStats(vehicle);
                  if (!stats) {
                    return (
                      <tr key={vehicle.vhc_imei}>
                        <td>{vehicle.vhc_alias.split("\t")[1]}</td>
                        <td colSpan="4" className="noDataCellVMU">
                          No hay datos disponibles para este vehículo en el
                          rango seleccionado.
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <>
                    <tr 
                    key={vehicle.vhc_imei}
                    onClick={() => toogleRow(vehicle.vhc_imei)}
                    style={{cursor: "pointer"}}
                    >
                      <td>{vehicle.vhc_alias.split("\t")[1] + "-" + vehicle.vhc_imei}</td>
                      <td>{index + 1}</td>
                      <td>{formatTime(stats.totalSeconds)}</td>
                      <td>{stats.totalKm.toFixed(2)}</td>
                      <td>{stats.avgPercentage.toFixed(2)}%</td>
                    </tr>

                    {expandedRow === vehicle.vhc_imei && (
                      <tr>
                        <td colSpan="5">
                          <div style={{padding: "10px", backgroundColor: "#f9f9f9", borderRadius: "5px", border: "1px solid #ddd"}}>
                            <h4>Detalle Diario: {vehicle.vhc_alias}</h4>
                            <table style={{width: "100%"}}>
                              <thead>
                                <tr>
                                  <th>Fecha</th>
                                  <th>Horas de Actividad</th>
                                  <th>Kilómetros Recorridos</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeTab === "workdays" ? vehicle.dias_laborables.map((day, index) => (
                                  <tr key={index}>
                                    <td>{day.date}</td>
                                    <td>{formatHours(day.activity_hours)}</td>
                                    <td>{day.total_distance}</td>
                                  </tr>
                                ))
                                : vehicle.dias_no_laborables.map((day,index) => (
                                  <tr key={index}>
                                    <td>{day.date}</td>
                                    <td>{formatHours(day.activity_hours)}</td>
                                    <td>{day.total_distance}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}

                    </>
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
