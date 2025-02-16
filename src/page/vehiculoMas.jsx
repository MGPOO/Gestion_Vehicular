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
    
    return { totalSeconds, totalKm};
  };

  const exportToExcel = () => {
    if (activityData.length === 0) {
      alert("No hay datos para exportar. Por favor, genera un reporte primero.");
      return;
    }
  
    // Estilo "bold" para usar en celdas
    const boldStyle = { font: { bold: true } };
  
    // Título y subtítulo del reporte (en negrita)
    const reportTitle = [
      [
        {
          v: `Reporte de Vehículos - ${
            activeTab === "workdays" ? "Días Laborales" : "Días No Laborales"
          }`,
          s: boldStyle,
        },
      ],
      [
        {
          v: `Período: ${startDate} a ${endDate}`,
          s: boldStyle,
        },
      ],
      [],
    ];
  
    let rows = [];
  
    activityData.forEach((vehicle, index) => {
      const stats = calculateStats(vehicle);
      if (!stats) return;
  
      const ranking = index + 1;
      const placa = vehicle.vhc_alias.split("\t")[1];
      const horasTotales = formatTime(stats.totalSeconds);
      const kmTotales = stats.totalKm.toFixed(2);
  
      // Fila resumen del vehículo
      rows.push([
        { v: `Ranking: ${ranking}`, s: boldStyle },
        { v: `Placa: ${placa}`, s: boldStyle },
        { v: `Horas: ${horasTotales}`, s: boldStyle },
        { v: `Km: ${kmTotales}`, s: boldStyle },
      ]);
  
      // Fila que indica "Detalle Diario" (título)
      rows.push([
        {
          v: "Detalle Diario",
          s: { ...boldStyle, alignment: { horizontal: "left" } },
        },
        { v: "", s: {} },
        { v: "", s: {} },
        { v: "", s: {} },
      ]);
  
      // Encabezado del detalle diario en negrita
      rows.push([
        { v: "Fecha", s: boldStyle },
        { v: "Horas de Actividad", s: boldStyle },
        { v: "Km Recorridos", s: boldStyle },
        { v: "", s: boldStyle },
      ]);
  
      // Filas de detalle diario (sin negrita, para distinguir)
      const days =
        activeTab === "workdays"
          ? vehicle.dias_laborables
          : vehicle.dias_no_laborables;
  
      days.forEach((day) => {
        rows.push([
          { v: day.date },
          { v: formatHours(day.activity_hours) },
          { v: day.total_distance },
          { v: "" },
        ]);
      });
  
      // Fila en blanco para separar vehículos
      rows.push(["", "", "", ""]);
    });
  
    // Combinar títulos y filas
    const content = [...reportTitle, ...rows];
  
    // Creación del libro de Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(content);
  
    // Ajuste de anchos de columna
    ws["!cols"] = [
      { wch: 25 },
      { wch: 25 },
      { wch: 25 },
      { wch: 25 },
    ];
  
    // Merges para los títulos (primera y segunda fila)
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    ];
  
    // Agregar la hoja al libro y guardar
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
  
    // Título principal
    doc.setFontSize(16);
    doc.text(
      `Reporte de Vehículos - ${
        activeTab === "workdays" ? "Días Laborales" : "Días No Laborales"
      }`,
      doc.internal.pageSize.getWidth() / 2,
      20,
      { align: "center" }
    );
  
    // Subtítulo con fechas
    doc.setFontSize(12);
    doc.text(
      `Período: ${startDate} a ${endDate}`,
      doc.internal.pageSize.getWidth() / 2,
      30,
      { align: "center" }
    );
  
    // Fecha de generación
    const currentDate = new Date().toLocaleString("es-ES");
    doc.setFontSize(10);
    doc.text(
      `Generado el: ${currentDate}`,
      doc.internal.pageSize.getWidth() - 20,
      10,
      { align: "right" }
    );
  
    // Armamos el cuerpo de la tabla
    let bodyData = [];
  
    activityData.forEach((vehicle, index) => {
      const stats = calculateStats(vehicle);
      if (!stats) return;
  
      const ranking = index + 1;
      const placa = vehicle.vhc_alias.split("\t")[1];
      const horasTotales = formatTime(stats.totalSeconds);
      const kmTotales = stats.totalKm.toFixed(2);
  
      // Fila resumen: Ranking, Placa, Horas, Km (en negrita)
      bodyData.push([
        {
          content: `Ranking: ${ranking}`,
          styles: { fontStyle: "bold" },
        },
        {
          content: `Placa: ${placa}`,
          styles: { fontStyle: "bold" },
        },
        {
          content: `Horas: ${horasTotales}`,
          styles: { fontStyle: "bold" },
        },
        {
          content: `Km: ${kmTotales}`,
          styles: { fontStyle: "bold" },
        },
      ]);
  
      // Fila “Detalle Diario”
      bodyData.push([
        {
          content: "Detalle Diario",
          colSpan: 4,
          styles: { fontStyle: "bold", halign: "left", fillColor: [240, 240, 240] },
        },
      ]);
  
      // Encabezado del detalle diario en negrita
      bodyData.push([
        { content: "Fecha", styles: { fontStyle: "bold" } },
        { content: "Horas de Actividad", styles: { fontStyle: "bold" } },
        { content: "Km Recorridos", styles: { fontStyle: "bold" } },
        { content: "", styles: { fontStyle: "bold" } },
      ]);
  
      // Filas de detalle diario (normal)
      const days =
        activeTab === "workdays"
          ? vehicle.dias_laborables
          : vehicle.dias_no_laborables;
  
      days.forEach((day) => {
        bodyData.push([
          day.date,
          formatHours(day.activity_hours),
          day.total_distance,
          "",
        ]);
      });
  
      // Fila en blanco para separar
      bodyData.push(["", "", "", ""]);
    });
  
    // Configuración de estilos en autoTable
    doc.autoTable({
      body: bodyData,
      startY: 40,
      bodyStyles: { fontSize: 11, halign: "center" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 40 },
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
  
    // Metadatos del PDF
    doc.setProperties({
      title: `Reporte de Vehículos - ${startDate} a ${endDate}`,
      subject: "Reporte de Actividad Vehicular",
      author: "Sistema de Reportes",
      keywords: "vehiculos, reporte, actividad",
      creator: "Sistema de Gestión Vehicular",
    });
  
    // Guardamos el archivo
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
