// VehicleReport.jsx
import React, { useState, useEffect } from 'react';
import vehicleData from '../data/InformacionReportes.json'; 
import '../style/vehiculosMU.css';

const VehicleReport = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [activeTab, setActiveTab] = useState('workdays');

  useEffect(() => {
    
    setFilteredData(vehicleData.data);
  }, []);

  const handleDateChange = (date, type) => {
    if (type === 'start') {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
  };

  const filterData = () => {
    if (!startDate || !endDate) return;

    const filtered = vehicleData.data.filter(vehicle => {
      const vehicleStart = new Date(vehicle.fecha_inicio);
      const vehicleEnd = new Date(vehicle.fecha_fin);
      const filterStart = new Date(startDate);
      const filterEnd = new Date(endDate);

      return vehicleStart >= filterStart && vehicleEnd <= filterEnd;
    });

    setFilteredData(filtered);
  };

  const calculateStats = (vehicle) => {
    const days = activeTab === 'workdays' ? vehicle.dias_laborables : vehicle.dias_no_laborables;
    const totalHours = days.reduce((sum, day) => sum + day.horas_actividad, 0);
    const totalKm = days.reduce((sum, day) => sum + day.km_recorridos, 0);
    const avgPercentage = days.length > 0 
      ? days.reduce((sum, day) => sum + day.porcentaje_actividad, 0) / days.length 
      : 0;

    return { totalHours, totalKm, avgPercentage };
  };

  return (
    <div className="containerVMU">
      <h1 className="titleVMU">Reporte de Vehículos menos Utilizados</h1>
      
      <div className="filterSectionVMU">
        <div className="dateRangeVMU">
          <label className="dateLabel_VMU">
            Ingrese el rango de fecha
            <div className="dateInputsVMU">
              <input
                type="date"
                className="dateInputVMU"
                value={startDate}
                onChange={(e) => handleDateChange(e.target.value, 'start')}
              />
              <input
                type="date"
                className="dateInputVMU"
                value={endDate}
                min={startDate}
                onChange={(e) => handleDateChange(e.target.value, 'end')}
              />
            </div>
          </label>
        </div>

        <div className="vehicleSelectVMU">
          <button className="generateButtonVMU" onClick={filterData}>
            Generar Reporte
          </button>
        </div>
      </div>

      <div className="tabsContainerVMU">
        <button 
          className={`tabButtonVMU ${activeTab === 'workdays' ? 'activeVMU' : ''}`}
          onClick={() => setActiveTab('workdays')}
        >
          Días laborales
        </button>
        <button 
          className={`tabButtonVMU ${activeTab === 'nonworkdays' ? 'activeVMU' : ''}`}
          onClick={() => setActiveTab('nonworkdays')}
        >
          Días no laborales
        </button>
      </div>

      <div className="tableWrapperVMU">
        <table className="dataTableVMU">
          <thead>
            <tr>
              <th>Ranking</th>
              <th>Placa</th>
              <th>Horas de Actividad</th>
              <th>Kilómetros Recorridos</th>
              <th>Porcentaje Promedio</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(vehicle => {
              const stats = calculateStats(vehicle);
              return (
                <tr key={vehicle.vhc_id}>
                  <td>{vehicle.ranking}</td>
                  <td>{vehicle.vhc_placa}</td>
                  <td>{stats.totalHours}</td>
                  <td>{stats.totalKm}</td>
                  <td>{stats.avgPercentage.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VehicleReport;
