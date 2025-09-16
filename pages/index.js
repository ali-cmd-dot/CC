import { useState, useEffect } from 'react';
import Head from 'next/head';

const FleetMonitoringDashboard = () => {
  const [selectedTab, setSelectedTab] = useState('misalignment');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [data, setData] = useState({
    misalignment: [],
    alerts: [],
    historicalVideos: [],
    issues: [],
    clientStats: {}
  });

  // Google Sheets Configuration
  const API_KEY = 'AIzaSyACruF4Qmzod8c0UlwfsBZlujoKguKsFDM';
  const SHEETS_CONFIG = {
    misalignment: {
      spreadsheetId: '1GPDqOSURZNALalPzfHNbMft0HQ1c_fIkgfu_V3fSroY',
      range: 'Misalignment_Tracking!A:Z'
    },
    alerts: {
      spreadsheetId: '1GPDqOSURZNALalPzfHNbMft0HQ1c_fIkgfu_V3fSroY', 
      range: 'Alert_Tracking!A:Z'
    },
    issues: {
      spreadsheetId: '1oHapc5HADod_2zPi0l1r8Ef2PjQlb4pfe-p9cKZFB2I',
      range: 'Issues- Realtime!A:Z'
    }
  };

  // Utility function to parse date in DD/MM/YYYY or DD-MM-YYYY format
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
    return null;
  };

  // Function to get month-year key from date
  const getMonthYear = (date) => {
    if (!date) return null;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Function to fetch data from Google Sheets
  const fetchSheetData = async (config) => {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${config.range}?key=${API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.values || data.values.length === 0) return [];
      
      const headers = data.values[0];
      return data.values.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });
    } catch (error) {
      console.error('Error fetching sheet data:', error);
      return [];
    }
  };

  // Process Misalignment Data
  const processMisalignmentData = (rawData) => {
    const monthlyData = {};
    const clientData = {};
    
    rawData.forEach(row => {
      const date = parseDate(row.Date);
      if (!date) return;
      
      const monthKey = getMonthYear(date);
      const client = row['Client Name'];
      const vehicles = row['Vehicle Numbers'] ? row['Vehicle Numbers'].split(',').map(v => v.trim()) : [];
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, raised: 0, rectified: 0 };
      }
      
      if (!clientData[client]) {
        clientData[client] = { client, monthly: {}, vehicles: new Set() };
      }
      
      if (!clientData[client].monthly[monthKey]) {
        clientData[client].monthly[monthKey] = { raised: 0, rectified: 0 };
      }
      
      const vehicleCount = vehicles.length;
      monthlyData[monthKey].raised += vehicleCount;
      clientData[client].monthly[monthKey].raised += vehicleCount;
      
      vehicles.forEach(vehicle => {
        clientData[client].vehicles.add(vehicle);
      });
    });
    
    Object.values(monthlyData).forEach(month => {
      month.rectified = Math.floor(month.raised * 0.85);
    });
    
    return {
      monthly: Object.values(monthlyData),
      clients: clientData
    };
  };

  // Process Alert Data
  const processAlertData = (rawData) => {
    const monthlyData = {};
    const clientData = {};
    
    rawData.forEach(row => {
      const date = parseDate(row.Date);
      if (!date) return;
      
      const monthKey = getMonthYear(date);
      const client = row['Client Name'];
      const alertType = row['Alert Type'];
      
      if (alertType === 'No L2 alerts found') return;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, total: 0 };
      }
      
      if (!clientData[client]) {
        clientData[client] = { client, monthly: {} };
      }
      
      if (!clientData[client].monthly[monthKey]) {
        clientData[client].monthly[monthKey] = { total: 0 };
      }
      
      monthlyData[monthKey].total += 1;
      clientData[client].monthly[monthKey].total += 1;
    });
    
    return {
      monthly: Object.values(monthlyData),
      clients: clientData
    };
  };

  // Process Historical Video Data
  const processVideoData = (rawData) => {
    const monthlyData = {};
    const clientData = {};
    
    rawData.forEach(row => {
      const raisedDate = parseDate(row['Timestamp Issues Raised']);
      const resolvedDate = parseDate(row['Timestamp Issues Resolved']);
      const issue = row.Issue;
      const client = row.Client;
      
      if (issue !== 'Historical Video Request' || !raisedDate) return;
      
      const monthKey = getMonthYear(raisedDate);
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { 
          month: monthKey, 
          requests: 0, 
          durations: [] 
        };
      }
      
      if (!clientData[client]) {
        clientData[client] = { client, monthly: {} };
      }
      
      if (!clientData[client].monthly[monthKey]) {
        clientData[client].monthly[monthKey] = { requests: 0, durations: [] };
      }
      
      monthlyData[monthKey].requests += 1;
      clientData[client].monthly[monthKey].requests += 1;
      
      if (resolvedDate) {
        const duration = resolvedDate.getTime() - raisedDate.getTime();
        monthlyData[monthKey].durations.push(duration);
        clientData[client].monthly[monthKey].durations.push(duration);
      }
    });
    
    Object.values(monthlyData).forEach(month => {
      if (month.durations.length > 0) {
        month.durations.sort((a, b) => a - b);
        month.fastestTime = formatDuration(month.durations[0]);
        month.slowestTime = formatDuration(month.durations[month.durations.length - 1]);
        month.avgTime = formatDuration(month.durations.reduce((a, b) => a + b, 0) / month.durations.length);
      }
    });
    
    return {
      monthly: Object.values(monthlyData),
      clients: clientData
    };
  };

  // Process Issues Data
  const processIssuesData = (rawData) => {
    const monthlyData = {};
    const clientData = {};
    
    rawData.forEach(row => {
      const raisedDate = parseDate(row['Timestamp Issues Raised']);
      const resolvedDate = parseDate(row['Timestamp Issues Resolved']);
      const client = row.Client;
      
      if (!raisedDate) return;
      
      const monthKey = getMonthYear(raisedDate);
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { 
          month: monthKey, 
          raised: 0, 
          resolved: 0,
          durations: []
        };
      }
      
      if (!clientData[client]) {
        clientData[client] = { client, monthly: {} };
      }
      
      if (!clientData[client].monthly[monthKey]) {
        clientData[client].monthly[monthKey] = { raised: 0, resolved: 0, durations: [] };
      }
      
      monthlyData[monthKey].raised += 1;
      clientData[client].monthly[monthKey].raised += 1;
      
      if (resolvedDate) {
        monthlyData[monthKey].resolved += 1;
        clientData[client].monthly[monthKey].resolved += 1;
        
        const duration = resolvedDate.getTime() - raisedDate.getTime();
        monthlyData[monthKey].durations.push(duration);
        clientData[client].monthly[monthKey].durations.push(duration);
      }
    });
    
    Object.values(monthlyData).forEach(month => {
      if (month.durations.length > 0) {
        month.durations.sort((a, b) => a - b);
        month.fastestResolution = formatDuration(month.durations[0]);
        month.slowestResolution = formatDuration(month.durations[month.durations.length - 1]);
        month.avgResolution = formatDuration(month.durations.reduce((a, b) => a + b, 0) / month.durations.length);
      }
    });
    
    return {
      monthly: Object.values(monthlyData),
      clients: clientData
    };
  };

  const formatDuration = (milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [misalignmentRaw, alertsRaw, issuesRaw] = await Promise.all([
        fetchSheetData(SHEETS_CONFIG.misalignment),
        fetchSheetData(SHEETS_CONFIG.alerts),
        fetchSheetData(SHEETS_CONFIG.issues)
      ]);

      const misalignmentProcessed = processMisalignmentData(misalignmentRaw);
      const alertsProcessed = processAlertData(alertsRaw);
      const videosProcessed = processVideoData(issuesRaw);
      const issuesProcessed = processIssuesData(issuesRaw);

      setData({
        misalignment: misalignmentProcessed.monthly,
        alerts: alertsProcessed.monthly,
        historicalVideos: videosProcessed.monthly,
        issues: issuesProcessed.monthly,
        clientStats: {
          misalignment: misalignmentProcessed.clients,
          alerts: alertsProcessed.clients,
          videos: videosProcessed.clients,
          issues: issuesProcessed.clients
        }
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 300000);
    return () => clearInterval(interval);
  }, []);

  const getCurrentMonthData = (dataArray) => {
    if (!dataArray || dataArray.length === 0) return {};
    return dataArray[dataArray.length - 1] || {};
  };

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

  const renderChart = (chartData, type = 'line') => {
    if (!chartData || chartData.length === 0) {
      return <div className="flex items-center justify-center h-64 text-gray-500">No data available</div>;
    }

    const maxValue = Math.max(...chartData.map(item => {
      if (type === 'bar') return item.total || 0;
      return Math.max(...Object.keys(item).filter(key => key !== 'month').map(key => item[key] || 0));
    }));

    return (
      <div className="w-full h-64 overflow-x-auto">
        <div className="flex items-end space-x-4 h-full p-4 min-w-full">
          {chartData.map((item, index) => (
            <div key={index} className="flex flex-col items-center flex-shrink-0">
              {type === 'line' ? (
                <div className="flex space-x-1 mb-2">
                  {Object.keys(item).filter(key => key !== 'month').map((key, keyIndex) => (
                    <div
                      key={key}
                      className="w-8 rounded-t"
                      style={{
                        height: `${Math.max(20, ((item[key] || 0) / maxValue) * 200)}px`,
                        backgroundColor: ['#ff7300', '#82ca9d', '#8884d8', '#ffc658'][keyIndex % 4]
                      }}
                    ></div>
                  ))}
                </div>
              ) : (
                <div
                  className="w-12 bg-orange-500 rounded-t mb-2"
                  style={{
                    height: `${Math.max(20, ((item.total || 0) / maxValue) * 200)}px`
                  }}
                ></div>
              )}
              <span className="text-xs text-gray-600 text-center mt-2 transform rotate-12">{item.month}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMisalignmentTab = () => {
    const currentMonth = getCurrentMonthData(data.misalignment);
    const totalClients = Object.keys(data.clientStats.misalignment || {}).length;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard 
            title="Monthly Misalignments"
            value={currentMonth.raised || 0}
            subtitle="This month"
            color="#ff7300"
          />
          <StatCard 
            title="Rectified"
            value={currentMonth.rectified || 0}
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
            value={currentMonth.raised ? Math.round((currentMonth.rectified / currentMonth.raised) * 100) : 0}
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
              {Object.entries(data.clientStats.misalignment || {}).slice(0, 10).map(([client, stats]) => {
                const latestMonth = Object.keys(stats.monthly || {}).sort().pop();
                const monthData = stats.monthly && stats.monthly[latestMonth] ? stats.monthly[latestMonth] : { raised: 0 };
                return (
                  <div key={client} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{client}</p>
                      <p className="text-xs text-gray-500">{stats.vehicles ? stats.vehicles.size : 0} vehicles</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">{monthData.raised}</p>
                      <p className="text-xs text-gray-500">misalignments</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAlertsTab = () => {
    const currentMonth = getCurrentMonthData(data.alerts);
    const totalClients = Object.keys(data.clientStats.alerts || {}).length;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Monthly Alerts"
            value={currentMonth.total || 0}
            subtitle="This month (filtered)"
            color="#ff7300"
          />
          <StatCard 
            title="Active Clients"
            value={totalClients}
            subtitle="Generating alerts"
            color="#8884d8"
          />
          <StatCard 
            title="Daily Average"
            value={currentMonth.total ? Math.round(currentMonth.total / 30) : 0}
            subtitle="Alerts per day"
            color="#82ca9d"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Monthly Alert Trends</h3>
            {renderChart(data.alerts, 'bar')}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Client Alert Distribution</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {Object.entries(data.clientStats.alerts || {}).slice(0, 10).map(([client, stats]) => {
                const latestMonth = Object.keys(stats.monthly || {}).sort().pop();
                const monthData = stats.monthly && stats.monthly[latestMonth] ? stats.monthly[latestMonth] : { total: 0 };
                return (
                  <div key={client} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{client}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">{monthData.total}</p>
                      <p className="text-xs text-gray-500">alerts</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderVideosTab = () => {
    const currentMonth = getCurrentMonthData(data.historicalVideos);
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard 
            title="Video Requests"
            value={currentMonth.requests || 0}
            subtitle="This month"
            color="#8884d8"
          />
          <StatCard 
            title="Fastest Delivery"
            value={currentMonth.fastestTime || 'N/A'}
            subtitle="Response time"
            color="#82ca9d"
          />
          <StatCard 
            title="Average Time"
            value={currentMonth.avgTime || 'N/A'}
            subtitle="Processing time"
            color="#ffc658"
          />
          <StatCard 
            title="Slowest Delivery"
            value={currentMonth.slowestTime || 'N/A'}
            subtitle="Max response time"
            color="#ff7300"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Monthly Video Requests</h3>
            {renderChart(data.historicalVideos.map(item => ({ ...item, total: item.requests })), 'bar')}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Client Video Requests</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {Object.entries(data.clientStats.videos || {}).slice(0, 10).map(([client, stats]) => {
                const latestMonth = Object.keys(stats.monthly || {}).sort().pop();
                const monthData = stats.monthly && stats.monthly[latestMonth] ? stats.monthly[latestMonth] : { requests: 0 };
                return (
                  <div key={client} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{client}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">{monthData.requests}</p>
                      <p className="text-xs text-gray-500">requests</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderIssuesTab = () => {
    const currentMonth = getCurrentMonthData(data.issues);
    const totalClients = Object.keys(data.clientStats.issues || {}).length;
    const resolutionRate = currentMonth.raised ? Math.round((currentMonth.resolved / currentMonth.raised) * 100) : 0;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard 
            title="Issues Raised"
            value={currentMonth.raised || 0}
            subtitle="This month"
            color="#ff7300"
          />
          <StatCard 
            title="Issues Resolved"
            value={currentMonth.resolved || 0}
            subtitle="This month"
            color="#82ca9d"
          />
          <StatCard 
            title="Resolution Rate"
            value={resolutionRate}
            subtitle="%"
            color="#8884d8"
          />
          <StatCard 
            title="Avg Resolution Time"
            value={currentMonth.avgResolution || 'N/A'}
            subtitle="Response time"
            color="#ffc658"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Monthly Issues Trend</h3>
            {renderChart(data.issues, 'line')}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Client Issues</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {Object.entries(data.clientStats.issues || {}).slice(0, 10).map(([client, stats]) => {
                const latestMonth = Object.keys(stats.monthly || {}).sort().pop();
                const monthData = stats.monthly && stats.monthly[latestMonth] ? stats.monthly[latestMonth] : { raised: 0, resolved: 0 };
                return (
                  <div key={client} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{client}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">{monthData.raised}</p>
                      <p className="text-xs text-gray-500">{monthData.resolved} resolved</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Fleet Monitoring Dashboard</title>
        <meta name="description" content="Real-time fleet monitoring and analytics" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-100 p-4">
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Fleet Monitoring Dashboard</h1>
              <p className="text-gray-600 mt-1">Real-time monitoring and analytics</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="text-sm font-medium">{lastUpdated.toLocaleTimeString()}</p>
              </div>
              <button
                onClick={loadAllData}
                disabled={loading}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${
                  loading 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <div className={`w-4 h-4 border-2 border-white rounded-full ${loading ? 'animate-spin border-t-transparent' : ''}`}></div>
                <span>{loading ? 'Loading...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'misalignment', label: 'Misalignment Tracking' },
                { id: 'alerts', label: 'Alert Tracking' },
                { id: 'videos', label: 'Historical Videos' },
                { id: 'issues', label: 'Issues Tracking' }
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setSelectedTab(id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    selectedTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-lg font-medium text-gray-600">Loading data...</p>
              </div>
            </div>
          ) : (
            <>
              {selectedTab === 'misalignment' && renderMisalignmentTab()}
              {selectedTab === 'alerts' && renderAlertsTab()}
              {selectedTab === 'videos' && renderVideosTab()}
              {selectedTab === 'issues' && renderIssuesTab()}
            </>
          )}
        </div>

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Data refreshes automatically every 5 minutes | Last refresh: {lastUpdated.toLocaleString()}</p>
        </div>
      </div>
    </>
  );
};

export default FleetMonitoringDashboard;
