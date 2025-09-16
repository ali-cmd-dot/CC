import { useState, useEffect } from 'react';

const Dashboard = ({ data, selectedTab }) => {
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'];

  const StatCard = ({ title, value, subtitle, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-lg border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="h-8 w-8 rounded-full" style={{ backgroundColor: color, opacity: 0.2 }}></div>
      </div>
    </div>
  );

  const getCurrentMonthData = (dataArray) => {
    if (!dataArray || dataArray.length === 0) return null;
    return dataArray[dataArray.length - 1] || {};
  };

  const renderChart = (chartData, type = 'line') => {
    if (!chartData || chartData.length === 0) {
      return <div className="flex items-center justify-center h-64 text-gray-500">No data available</div>;
    }

    if (type === 'line') {
      return (
        <div className="w-full h-64 overflow-x-auto">
          <div className="flex items-end space-x-4 h-full p-4">
            {chartData.map((item, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="flex space-x-1 mb-2">
                  {Object.keys(item).filter(key => key !== 'month').map((key, keyIndex) => (
                    <div
                      key={key}
                      className="w-8 rounded-t"
                      style={{
                        height: `${Math.max(20, (item[key] / Math.max(...chartData.map(d => Math.max(...Object.keys(d).filter(k => k !== 'month').map(k => d[k] || 0))))) * 200)}px`,
                        backgroundColor: colors[keyIndex % colors.length]
                      }}
                    ></div>
                  ))}
                </div>
                <span className="text-xs text-gray-600 transform rotate-45 mt-2">{item.month}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (type === 'bar') {
      return (
        <div className="w-full h-64 overflow-x-auto">
          <div className="flex items-end space-x-4 h-full p-4">
            {chartData.map((item, index) => (
              <div key={index} className="flex flex-col items-center">
                <div
                  className="w-12 bg-orange-500 rounded-t"
                  style={{
                    height: `${Math.max(20, (item.total / Math.max(...chartData.map(d => d.total || 0))) * 200)}px`
                  }}
                ></div>
                <span className="text-xs text-gray-600 transform rotate-45 mt-2">{item.month}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  };

  const renderMisalignmentTab = () => {
    const currentMonth = getCurrentMonthData(data.misalignment);
    const totalClients = Object.keys(data.clientStats.misalignment || {}).length;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard 
            title="Monthly Misalignments"
            value={currentMonth?.raised || 0}
            subtitle="This month"
            color="#ff7300"
          />
          <StatCard 
            title="Rectified"
            value={currentMonth?.rectified || 0}
            subtitle="This month"
            color="#82ca9d"
          />
          <StatCard 
            title="Active Clients"
            value={totalClients}
            subtitle="Total clients"
            color="#8884d8"
          />
          <StatCard 
            title="Resolution Rate"
            value={currentMonth?.raised ? Math.round((currentMonth.rectified / currentMonth.raised) * 100) : 0}
            subtitle="%"
            color="#0088fe"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Monthly Misalignment Trends</h3>
            {renderChart(data.misalignment, 'line')}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Client Performance</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {Object.entries(data.clientStats.misalignment || {}).slice(0, 10).map(([client, stats], index) => {
                const latestMonth = Object.keys(stats.monthly || {}).sort().pop();
                const monthData = stats.monthly?.[latestMonth] || { raised: 0 };
                return (
                  <div key={client} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{client}</p>
                      <p className="text-xs text-gray-500">{stats.vehicles?.size || 0} vehicles</p>
                    </div>
                    <div className="text-right">
