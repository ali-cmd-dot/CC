// pages/index.js
import { useState, useEffect } from 'react';
import Head from 'next/head';

const GOOGLE_API_KEY = 'AIzaSyACruF4Qmzod8c0UlwfsBZlujoKguKsFDM';

const SHEETS_CONFIG = {
  misalignment: {
    id: '1GPDqOSURZNALalPzfHNbMft0HQ1c_fIkgfu_V3fSroY',
    range: 'Misalignment_Tracking!A:Z',
    gid: '2092228787'
  },
  alerts: {
    id: '1GPDqOSURZNALalPzfHNbMft0HQ1c_fIkgfu_V3fSroY',
    range: 'Alert_Tracking!A:Z',
    gid: '1740135614'
  },
  issues: {
    id: '1oHapc5HADod_2zPi0l1r8Ef2PjQlb4pfe-p9cKZFB2I',
    range: 'Issues- Realtime!A:Z',
    gid: '0'
  }
};

export default function Dashboard() {
  const [data, setData] = useState({
    misalignment: null,
    alerts: null,
    issues: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSheetData = async (sheetConfig) => {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetConfig.id}/values/${sheetConfig.range}?key=${GOOGLE_API_KEY}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }
      const result = await response.json();
      return result.values || [];
    } catch (error) {
      console.error(`Error fetching sheet data:`, error);
      throw error;
    }
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    
    // Handle different date formats
    if (dateStr.includes('/')) {
      const parts = dateStr.split(' ')[0].split('/');
      if (parts.length === 3) {
        // Assuming DD/MM/YYYY or MM/DD/YYYY
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Month is 0-indexed
        const year = parseInt(parts[2]);
        return new Date(year, month, day);
      }
    }
    
    return new Date(dateStr);
  };

  const getMonthKey = (date) => {
    if (!date || isNaN(date)) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const analyzeHistoricalVideos = (issuesData) => {
    if (!issuesData || issuesData.length < 2) return {};

    const headers = issuesData[0];
    const rows = issuesData.slice(1);

    const timestampRaisedIdx = headers.findIndex(h => h?.toLowerCase().includes('timestamp issues raised'));
    const timestampResolvedIdx = headers.findIndex(h => h?.toLowerCase().includes('timestamp issues resolved'));
    const issueIdx = headers.findIndex(h => h?.toLowerCase().includes('issue'));
    const clientIdx = headers.findIndex(h => h?.toLowerCase().includes('client'));

    const monthlyData = {};
    const clientData = {};
    const durations = [];

    rows.forEach(row => {
      if (!row[issueIdx] || !row[issueIdx].toLowerCase().includes('historical video request')) {
        return;
      }

      const raisedDate = parseDate(row[timestampRaisedIdx]);
      const resolvedDate = parseDate(row[timestampResolvedIdx]);
      const client = row[clientIdx] || 'Unknown';

      if (raisedDate) {
        const monthKey = getMonthKey(raisedDate);
        if (monthKey) {
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { requested: 0, resolved: 0 };
          }
          monthlyData[monthKey].requested++;

          if (!clientData[client]) {
            clientData[client] = {};
          }
          if (!clientData[client][monthKey]) {
            clientData[client][monthKey] = 0;
          }
          clientData[client][monthKey]++;
        }
      }

      if (raisedDate && resolvedDate && !isNaN(resolvedDate)) {
        const duration = (resolvedDate.getTime() - raisedDate.getTime()) / (1000 * 60); // minutes
        if (duration >= 0) {
          durations.push(duration);
          const monthKey = getMonthKey(raisedDate);
          if (monthKey && monthlyData[monthKey]) {
            monthlyData[monthKey].resolved++;
          }
        }
      }
    });

    const sortedDurations = durations.sort((a, b) => a - b);
    const stats = {
      fastest: sortedDurations[0] || 0,
      median: sortedDurations[Math.floor(sortedDurations.length / 2)] || 0,
      slowest: sortedDurations[sortedDurations.length - 1] || 0
    };

    return { monthlyData, clientData, stats, totalRequests: durations.length };
  };

  const analyzeMisalignment = (misalignmentData) => {
    if (!misalignmentData || misalignmentData.length < 2) return {};

    const headers = misalignmentData[0];
    const rows = misalignmentData.slice(1);

    const dateIdx = headers.findIndex(h => h?.toLowerCase().includes('date'));
    const vehicleIdx = headers.findIndex(h => h?.toLowerCase().includes('vehicle'));
    const clientIdx = headers.findIndex(h => h?.toLowerCase().includes('client'));

    const monthlyData = {};
    const clientData = {};
    const vehicleStats = {};
    const dailyData = {};

    // Group by date first
    const dateGroups = {};
    rows.forEach(row => {
      if (!row[dateIdx]) return;
      
      const date = parseDate(row[dateIdx]);
      if (!date || isNaN(date)) return;

      const dateKey = date.toISOString().split('T')[0];
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = [];
      }
      dateGroups[dateKey].push(row);
    });

    // Analyze each date
    Object.keys(dateGroups).forEach(dateKey => {
      const dateRows = dateGroups[dateKey];
      const vehicles = new Set();
      const clients = new Set();

      dateRows.forEach(row => {
        if (row[vehicleIdx]) {
          const vehicleList = row[vehicleIdx].split(',').map(v => v.trim());
          vehicleList.forEach(v => {
            if (v) vehicles.add(v);
          });
        }
        if (row[clientIdx]) {
          clients.add(row[clientIdx]);
        }
      });

      const date = new Date(dateKey);
      const monthKey = getMonthKey(date);

      // Monthly stats
      if (monthKey) {
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { raised: 0, resolved: 0 };
        }
        monthlyData[monthKey].raised += vehicles.size;
      }

      // Daily stats
      dailyData[dateKey] = {
        raised: vehicles.size,
        vehicles: Array.from(vehicles),
        clients: Array.from(clients)
      };

      // Client stats
      clients.forEach(client => {
        if (!clientData[client]) {
          clientData[client] = {};
        }
        if (!clientData[client][monthKey]) {
          clientData[client][monthKey] = { count: 0, vehicles: new Set() };
        }
        clientData[client][monthKey].count += vehicles.size;
        vehicles.forEach(v => clientData[client][monthKey].vehicles.add(v));
      });
    });

    // Calculate resolved misalignments (vehicles that disappear from next day)
    const sortedDates = Object.keys(dailyData).sort();
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const currentDate = sortedDates[i];
      const nextDate = sortedDates[i + 1];
      
      const currentVehicles = new Set(dailyData[currentDate].vehicles);
      const nextVehicles = new Set(dailyData[nextDate].vehicles);
      
      const resolved = Array.from(currentVehicles).filter(v => !nextVehicles.has(v));
      dailyData[currentDate].resolved = resolved.length;

      const date = new Date(currentDate);
      const monthKey = getMonthKey(date);
      if (monthKey && monthlyData[monthKey]) {
        monthlyData[monthKey].resolved += resolved.length;
      }
    }

    return { monthlyData, clientData, dailyData, vehicleStats };
  };

  const analyzeAlerts = (alertData) => {
    if (!alertData || alertData.length < 2) return {};

    const headers = alertData[0];
    const rows = alertData.slice(1);

    const dateIdx = headers.findIndex(h => h?.toLowerCase().includes('date'));
    const alertTypeIdx = headers.findIndex(h => h?.toLowerCase().includes('alert type'));
    const clientIdx = headers.findIndex(h => h?.toLowerCase().includes('client'));

    const monthlyData = {};
    const clientData = {};

    rows.forEach(row => {
      if (!row[dateIdx] || !row[alertTypeIdx]) return;
      
      // Skip "No L2 alerts found"
      if (row[alertTypeIdx].toLowerCase().includes('no l2 alerts found')) {
        return;
      }

      const date = parseDate(row[dateIdx]);
      if (!date || isNaN(date)) return;

      const monthKey = getMonthKey(date);
      const client = row[clientIdx] || 'Unknown';

      if (monthKey) {
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = 0;
        }
        monthlyData[monthKey]++;

        if (!clientData[client]) {
          clientData[client] = {};
        }
        if (!clientData[client][monthKey]) {
          clientData[client][monthKey] = 0;
        }
        clientData[client][monthKey]++;
      }
    });

    return { monthlyData, clientData };
  };

  const analyzeIssues = (issuesData) => {
    if (!issuesData || issuesData.length < 2) return {};

    const headers = issuesData[0];
    const rows = issuesData.slice(1);

    const timestampRaisedIdx = headers.findIndex(h => h?.toLowerCase().includes('timestamp issues raised'));
    const timestampResolvedIdx = headers.findIndex(h => h?.toLowerCase().includes('timestamp issues resolved'));
    const clientIdx = headers.findIndex(h => h?.toLowerCase().includes('client'));

    const monthlyData = {};
    const clientData = {};
    const durations = [];

    rows.forEach(row => {
      if (!row[timestampRaisedIdx]) return;

      const raisedDate = parseDate(row[timestampRaisedIdx]);
      const resolvedDate = parseDate(row[timestampResolvedIdx]);
      const client = row[clientIdx] || 'Unknown';

      if (raisedDate) {
        const monthKey = getMonthKey(raisedDate);
        if (monthKey) {
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { raised: 0, resolved: 0 };
          }
          monthlyData[monthKey].raised++;

          if (!clientData[client]) {
            clientData[client] = {};
          }
          if (!clientData[client][monthKey]) {
            clientData[client][monthKey] = { raised: 0, resolved: 0 };
          }
          clientData[client][monthKey].raised++;
        }
      }

      if (raisedDate && resolvedDate && !isNaN(resolvedDate)) {
        const duration = (resolvedDate.getTime() - raisedDate.getTime()) / (1000 * 60); // minutes
        if (duration >= 0) {
          durations.push(duration);
          const monthKey = getMonthKey(raisedDate);
          if (monthKey && monthlyData[monthKey]) {
            monthlyData[monthKey].resolved++;
          }
          if (monthKey && clientData[client] && clientData[client][monthKey]) {
            clientData[client][monthKey].resolved++;
          }
        }
      }
    });

    const sortedDurations = durations.sort((a, b) => a - b);
    const stats = {
      fastest: sortedDurations[0] || 0,
      median: sortedDurations[Math.floor(sortedDurations.length / 2)] || 0,
      slowest: sortedDurations[sortedDurations.length - 1] || 0
    };

    return { monthlyData, clientData, stats };
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} minutes`;
    } else if (minutes < 1440) {
      return `${Math.round(minutes / 60)} hours`;
    } else {
      return `${Math.round(minutes / 1440)} days`;
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [misalignmentData, alertData, issuesData] = await Promise.all([
          fetchSheetData(SHEETS_CONFIG.misalignment),
          fetchSheetData(SHEETS_CONFIG.alerts),
          fetchSheetData(SHEETS_CONFIG.issues)
        ]);

        setData({
          misalignment: misalignmentData,
          alerts: alertData,
          issues: issuesData
        });
      } catch (err) {
        setError(err.message);
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchAllData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-xl text-gray-600">Loading live data from Google Sheets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h2>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const misalignmentAnalysis = analyzeMisalignment(data.misalignment);
  const alertAnalysis = analyzeAlerts(data.alerts);
  const issueAnalysis = analyzeIssues(data.issues);
  const historicalVideoAnalysis = analyzeHistoricalVideos(data.issues);

  return (
    <>
      <Head>
        <title>Live Analytics Dashboard</title>
        <meta name="description" content="Real-time analytics from Google Sheets" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Live Analytics Dashboard</h1>
            <p className="text-gray-600">Real-time data from Google Sheets • Last updated: {new Date().toLocaleString()}</p>
          </div>

          {/* Misalignment Tracking */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Misalignment Tracking</h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Monthly Overview</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2">Month</th>
                        <th className="border border-gray-300 px-4 py-2">Raised</th>
                        <th className="border border-gray-300 px-4 py-2">Resolved</th>
                        <th className="border border-gray-300 px-4 py-2">Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(misalignmentAnalysis.monthlyData || {}).map(([month, stats]) => (
                        <tr key={month}>
                          <td className="border border-gray-300 px-4 py-2">{month}</td>
                          <td className="border border-gray-300 px-4 py-2">{stats.raised}</td>
                          <td className="border border-gray-300 px-4 py-2">{stats.resolved}</td>
                          <td className="border border-gray-300 px-4 py-2">{stats.raised - stats.resolved}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Client-wise Monthly Data</h3>
                <div className="max-h-64 overflow-y-auto">
                  {Object.entries(misalignmentAnalysis.clientData || {}).map(([client, months]) => (
                    <div key={client} className="mb-4 p-3 bg-gray-50 rounded">
                      <h4 className="font-medium text-gray-800">{client}</h4>
                      <div className="text-sm text-gray-600 mt-1">
                        {Object.entries(months).map(([month, data]) => (
                          <div key={month} className="flex justify-between">
                            <span>{month}:</span>
                            <span>{data.count} misalignments ({data.vehicles.size} unique vehicles)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Alert Tracking */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Alert Tracking</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Monthly Alerts</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2">Month</th>
                        <th className="border border-gray-300 px-4 py-2">Alert Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(alertAnalysis.monthlyData || {}).map(([month, count]) => (
                        <tr key={month}>
                          <td className="border border-gray-300 px-4 py-2">{month}</td>
                          <td className="border border-gray-300 px-4 py-2">{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Client-wise Alerts</h3>
                <div className="max-h-64 overflow-y-auto">
                  {Object.entries(alertAnalysis.clientData || {}).map(([client, months]) => (
                    <div key={client} className="mb-4 p-3 bg-gray-50 rounded">
                      <h4 className="font-medium text-gray-800">{client}</h4>
                      <div className="text-sm text-gray-600 mt-1">
                        {Object.entries(months).map(([month, count]) => (
                          <div key={month} className="flex justify-between">
                            <span>{month}:</span>
                            <span>{count} alerts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Historical Video Requests */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Historical Video Requests</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800">Fastest Response</h3>
                <p className="text-2xl font-bold text-green-600">{formatDuration(historicalVideoAnalysis.stats?.fastest || 0)}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-800">Median Response</h3>
                <p className="text-2xl font-bold text-yellow-600">{formatDuration(historicalVideoAnalysis.stats?.median || 0)}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-red-800">Slowest Response</h3>
                <p className="text-2xl font-bold text-red-600">{formatDuration(historicalVideoAnalysis.stats?.slowest || 0)}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Monthly Requests</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2">Month</th>
                        <th className="border border-gray-300 px-4 py-2">Requested</th>
                        <th className="border border-gray-300 px-4 py-2">Delivered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(historicalVideoAnalysis.monthlyData || {}).map(([month, stats]) => (
                        <tr key={month}>
                          <td className="border border-gray-300 px-4 py-2">{month}</td>
                          <td className="border border-gray-300 px-4 py-2">{stats.requested}</td>
                          <td className="border border-gray-300 px-4 py-2">{stats.resolved}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Client-wise Requests</h3>
                <div className="max-h-64 overflow-y-auto">
                  {Object.entries(historicalVideoAnalysis.clientData || {}).map(([client, months]) => (
                    <div key={client} className="mb-4 p-3 bg-gray-50 rounded">
                      <h4 className="font-medium text-gray-800">{client}</h4>
                      <div className="text-sm text-gray-600 mt-1">
                        {Object.entries(months).map(([month, count]) => (
                          <div key={month} className="flex justify-between">
                            <span>{month}:</span>
                            <span>{count} requests</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* General Issues Tracking */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">General Issues Tracking</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800">Fastest Resolution</h3>
                <p className="text-2xl font-bold text-blue-600">{formatDuration(issueAnalysis.stats?.fastest || 0)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-purple-800">Median Resolution</h3>
                <p className="text-2xl font-bold text-purple-600">{formatDuration(issueAnalysis.stats?.median || 0)}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-orange-800">Slowest Resolution</h3>
                <p className="text-2xl font-bold text-orange-600">{formatDuration(issueAnalysis.stats?.slowest || 0)}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Monthly Issues</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2">Month</th>
                        <th className="border border-gray-300 px-4 py-2">Raised</th>
                        <th className="border border-gray-300 px-4 py-2">Resolved</th>
                        <th className="border border-gray-300 px-4 py-2">Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(issueAnalysis.monthlyData || {}).map(([month, stats]) => (
                        <tr key={month}>
                          <td className="border border-gray-300 px-4 py-2">{month}</td>
                          <td className="border border-gray-300 px-4 py-2">{stats.raised}</td>
                          <td className="border border-gray-300 px-4 py-2">{stats.resolved}</td>
                          <td className="border border-gray-300 px-4 py-2">{stats.raised - stats.resolved}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Client-wise Issues</h3>
                <div className="max-h-64 overflow-y-auto">
                  {Object.entries(issueAnalysis.clientData || {}).map(([client, months]) => (
                    <div key={client} className="mb-4 p-3 bg-gray-50 rounded">
                      <h4 className="font-medium text-gray-800">{client}</h4>
                      <div className="text-sm text-gray-600 mt-1">
                        {Object.entries(months).map(([month, stats]) => (
                          <div key={month} className="flex justify-between">
                            <span>{month}:</span>
                            <span>{stats.raised} raised, {stats.resolved} resolved</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-gray-500 text-sm">
            <p>Dashboard automatically refreshes every 5 minutes</p>
          </div>
        </div>
      </div>
    </>
  );
}
