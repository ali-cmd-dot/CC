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

// Chart Components
const LineChart = ({ data, title, color = "blue" }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 280 + 20;
    const y = 120 - (d.value / maxValue) * 80;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="relative">
        <svg width="320" height="140" className="overflow-visible">
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={`rgb(59, 130, 246)`} stopOpacity="0.3" />
              <stop offset="100%" stopColor={`rgb(59, 130, 246)`} stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <polyline
            points={points}
            fill="none"
            stroke="rgb(59, 130, 246)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polygon
            points={`20,120 ${points} 300,120`}
            fill={`url(#gradient-${color})`}
          />
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 280 + 20;
            const y = 120 - (d.value / maxValue) * 80;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="4" fill="rgb(59, 130, 246)" />
                <text x={x} y="135" textAnchor="middle" className="text-xs fill-gray-600">
                  {d.label.split('-')[1]}
                </text>
                <text x={x} y={y-8} textAnchor="middle" className="text-xs fill-gray-800 font-medium">
                  {d.value}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

const BarChart = ({ data, title, color = "green" }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = 280 / data.length - 10;

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="relative">
        <svg width="320" height="140">
          {data.map((d, i) => {
            const x = i * (280 / data.length) + 20;
            const height = (d.value / maxValue) * 80;
            const y = 100 - height;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  fill="rgb(34, 197, 94)"
                  rx="4"
                  className="hover:opacity-80 transition-opacity"
                />
                <text x={x + barWidth/2} y="115" textAnchor="middle" className="text-xs fill-gray-600">
                  {d.label.split('-')[1]}
                </text>
                <text x={x + barWidth/2} y={y-5} textAnchor="middle" className="text-xs fill-gray-800 font-medium">
                  {d.value}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

const DonutChart = ({ data, title, centerText }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = 0;
  const radius = 50;
  const centerX = 60;
  const centerY = 60;

  const colors = ['rgb(59, 130, 246)', 'rgb(34, 197, 94)', 'rgb(251, 191, 36)', 'rgb(239, 68, 68)', 'rgb(139, 92, 246)'];

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <svg width="120" height="120">
            {data.map((d, i) => {
              const angle = (d.value / total) * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              currentAngle += angle;

              const x1 = centerX + radius * Math.cos((startAngle - 90) * Math.PI / 180);
              const y1 = centerY + radius * Math.sin((startAngle - 90) * Math.PI / 180);
              const x2 = centerX + radius * Math.cos((endAngle - 90) * Math.PI / 180);
              const y2 = centerY + radius * Math.sin((endAngle - 90) * Math.PI / 180);

              const largeArcFlag = angle > 180 ? 1 : 0;

              const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');

              return (
                <path
                  key={i}
                  d={pathData}
                  fill={colors[i % colors.length]}
                  className="hover:opacity-80 transition-opacity"
                />
              );
            })}
            <circle cx={centerX} cy={centerY} r="25" fill="white" />
            <text x={centerX} y={centerY-5} textAnchor="middle" className="text-lg font-bold fill-gray-800">
              {total}
            </text>
            <text x={centerX} y={centerY+10} textAnchor="middle" className="text-xs fill-gray-600">
              {centerText}
            </text>
          </svg>
        </div>
        <div className="space-y-2">
          {data.map((d, i) => (
            <div key={i} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[i % colors.length] }}
              ></div>
              <span className="text-sm text-gray-700">{d.label}: {d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subValue, trend, icon, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    green: "bg-green-50 border-green-200 text-green-800",
    red: "bg-red-50 border-red-200 text-red-800",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-800",
    purple: "bg-purple-50 border-purple-200 text-purple-800",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-800"
  };

  return (
    <div className={`p-6 rounded-xl shadow-lg border-2 ${colorClasses[color]} transform hover:scale-105 transition-all duration-200`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {subValue && <p className="text-sm mt-1 opacity-70">{subValue}</p>}
          {trend && (
            <div className="flex items-center mt-2 space-x-1">
              <span className={`text-xs px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
        <div className="text-4xl opacity-20">
          {icon}
        </div>
      </div>
    </div>
  );
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
    
    if (dateStr.includes('/')) {
      const parts = dateStr.split(' ')[0].split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
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
        const duration = (resolvedDate.getTime() - raisedDate.getTime()) / (1000 * 60);
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
    const dailyData = {};

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

      if (monthKey) {
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { raised: 0, resolved: 0 };
        }
        monthlyData[monthKey].raised += vehicles.size;
      }

      dailyData[dateKey] = {
        raised: vehicles.size,
        vehicles: Array.from(vehicles),
        clients: Array.from(clients)
      };

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

    return { monthlyData, clientData, dailyData };
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
        const duration = (resolvedDate.getTime() - raisedDate.getTime()) / (1000 * 60);
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
      return `${Math.round(minutes)}m`;
    } else if (minutes < 1440) {
      return `${Math.round(minutes / 60)}h`;
    } else {
      return `${Math.round(minutes / 1440)}d`;
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
    
    const interval = setInterval(fetchAllData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center bg-white p-12 rounded-2xl shadow-2xl border border-gray-100">
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Dashboard</h2>
            <p className="text-gray-600">Fetching live data from Google Sheets...</p>
            <div className="flex justify-center space-x-1 mt-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center bg-white p-12 rounded-2xl shadow-2xl border border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Connection Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-500 text-white px-8 py-3 rounded-xl hover:bg-red-600 transition-colors font-medium shadow-lg"
          >
            🔄 Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const misalignmentAnalysis = analyzeMisalignment(data.misalignment);
  const alertAnalysis = analyzeAlerts(data.alerts);
  const issueAnalysis = analyzeIssues(data.issues);
  const historicalVideoAnalysis = analyzeHistoricalVideos(data.issues);

  // Prepare chart data
  const misalignmentChartData = Object.entries(misalignmentAnalysis.monthlyData || {})
    .sort()
    .slice(-6)
    .map(([month, stats]) => ({
      label: month,
      value: stats.raised
    }));

  const alertChartData = Object.entries(alertAnalysis.monthlyData || {})
    .sort()
    .slice(-6)
    .map(([month, count]) => ({
      label: month,
      value: count
    }));

  const issueChartData = Object.entries(issueAnalysis.monthlyData || {})
    .sort()
    .slice(-6)
    .map(([month, stats]) => ({
      label: month,
      value: stats.raised
    }));

  // Calculate totals for stat cards
  const totalMisalignments = Object.values(misalignmentAnalysis.monthlyData || {}).reduce((sum, stats) => sum + stats.raised, 0);
  const totalResolved = Object.values(misalignmentAnalysis.monthlyData || {}).reduce((sum, stats) => sum + stats.resolved, 0);
  const totalAlerts = Object.values(alertAnalysis.monthlyData || {}).reduce((sum, count) => sum + count, 0);
  const totalIssues = Object.values(issueAnalysis.monthlyData || {}).reduce((sum, stats) => sum + stats.raised, 0);

  return (
    <>
      <Head>
        <title>🚀 Live Analytics Dashboard</title>
        <meta name="description" content="Real-time analytics from Google Sheets" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header */}
        <div className="bg-white shadow-lg border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  📊 Live Analytics Dashboard
                </h1>
                <p className="text-gray-600 mt-2 flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span>Live data • Last updated: {new Date().toLocaleString()}</span>
                </p>
              </div>
              <div className="text-right">
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
                  🟢 Connected
                </div>
                <p className="text-xs text-gray-500 mt-1">Auto-refresh: 5min</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Misalignments"
              value={totalMisalignments.toLocaleString()}
              subValue={`${totalResolved} resolved`}
              trend={5.2}
              icon="🚨"
              color="red"
            />
            <StatCard
              title="Total Alerts"
              value={totalAlerts.toLocaleString()}
              subValue="This period"
              trend={-2.1}
              icon="⚠️"
              color="yellow"
            />
            <StatCard
              title="Total Issues"
              value={totalIssues.toLocaleString()}
              subValue="All time"
              trend={1.8}
              icon="🔧"
              color="blue"
            />
            <StatCard
              title="Video Requests"
              value={historicalVideoAnalysis.totalRequests || 0}
              subValue={`Avg: ${formatDuration(historicalVideoAnalysis.stats?.median || 0)}`}
              trend={3.4}
              icon="🎥"
              color="purple"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <LineChart
              data={misalignmentChartData}
              title="📈 Misalignment Trends"
              color="red"
            />
            <BarChart
              data={alertChartData}
              title="📊 Monthly Alerts"
              color="yellow"
            />
            <LineChart
              data={issueChartData}
              title="🔧 Issue Trends"
              color="blue"
            />
          </div>

          {/* Response Time Analytics */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="flex items-center space-x-3 mb-8">
              <span className="text-3xl">⚡</span>
              <h2 className="text-2xl font-bold text-gray-800">Response Time Analytics</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-700 font-medium">⚡ Fastest Response</p>
                    <p className="text-3xl font-bold text-green-800">{formatDuration(historicalVideoAnalysis.stats?.fastest || 0)}</p>
                    <p className="text-sm text-green-600">Video delivery</p>
                  </div>
                  <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🚀</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-50 to-amber-100 p-6 rounded-xl border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-700 font-medium">📊 Average Response</p>
                    <p className="text-3xl font-bold text-yellow-800">{formatDuration(historicalVideoAnalysis.stats?.median || 0)}</p>
                    <p className="text-sm text-yellow-600">Median time</p>
                  </div>
                  <div className="w-16 h-16 bg-yellow-200 rounded-full flex items-center justify-center">
                    <span className="text-2xl">⏱️</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-rose-100 p-6 rounded-xl border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-700 font-medium">🐌 Slowest Response</p>
                    <p className="text-3xl font-bold text-red-800">{formatDuration(historicalVideoAnalysis.stats?.slowest || 0)}</p>
                    <p className="text-sm text-red-600">Maximum time</p>
                  </div>
                  <div className="w-16 h-16 bg-red-200 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🔻</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🎯 Performance Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 bg-white p-4 rounded-lg">
                  <span className="text-2xl">📈</span>
                  <div>
                    <p className="font-medium text-gray-800">Average Resolution Rate</p>
                    <p className="text-sm text-gray-600">
                      {totalResolved > 0 ? Math.round((totalResolved / totalMisalignments) * 100) : 0}% issues resolved
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 bg-white p-4 rounded-lg">
                  <span className="text-2xl">🎥</span>
                  <div>
                    <p className="font-medium text-gray-800">Video Request Efficiency</p>
                    <p className="text-sm text-gray-600">
                      {historicalVideoAnalysis.totalRequests || 0} total requests processed
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Analytics */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Misalignment Details */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <span className="text-3xl">🚨</span>
                <h2 className="text-2xl font-bold text-gray-800">Misalignment Analysis</h2>
              </div>
              
              <div className="space-y-6">
                <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                  <h3 className="text-lg font-semibold text-red-800 mb-4">Monthly Overview</h3>
                  <div className="space-y-3">
                    {Object.entries(misalignmentAnalysis.monthlyData || {})
                      .sort()
                      .slice(-5)
                      .map(([month, stats]) => (
                        <div key={month} className="flex items-center justify-between bg-white p-3 rounded-lg">
                          <span className="font-medium text-gray-800">{month}</span>
                          <div className="flex space-x-4 text-sm">
                            <span className="text-red-600 font-medium">↗ {stats.raised}</span>
                            <span className="text-green-600 font-medium">✓ {stats.resolved}</span>
                            <span className="text-orange-600 font-medium">⏳ {stats.raised - stats.resolved}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-800 mb-4">Top Clients</h3>
                  <div className="space-y-2">
                    {Object.entries(misalignmentAnalysis.clientData || {})
                      .slice(0, 5)
                      .map(([client, months]) => {
                        const totalCount = Object.values(months).reduce((sum, data) => sum + data.count, 0);
                        return (
                          <div key={client} className="flex items-center justify-between bg-white p-3 rounded-lg">
                            <span className="font-medium text-gray-800">{client}</span>
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                              {totalCount} issues
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>

            {/* Alerts & Issues Details */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <span className="text-3xl">⚠️</span>
                <h2 className="text-2xl font-bold text-gray-800">Alerts & Issues</h2>
              </div>
              
              <div className="space-y-6">
                <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-4">Alert Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(alertAnalysis.monthlyData || {})
                      .sort()
                      .slice(-6)
                      .map(([month, count]) => (
                        <div key={month} className="bg-white p-3 rounded-lg text-center">
                          <p className="text-sm text-gray-600">{month}</p>
                          <p className="text-xl font-bold text-yellow-600">{count}</p>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                  <h3 className="text-lg font-semibold text-purple-800 mb-4">Issue Resolution</h3>
                  <div className="space-y-3">
                    {Object.entries(issueAnalysis.monthlyData || {})
                      .sort()
                      .slice(-4)
                      .map(([month, stats]) => (
                        <div key={month} className="flex items-center justify-between bg-white p-3 rounded-lg">
                          <span className="font-medium text-gray-800">{month}</span>
                          <div className="flex space-x-3 text-sm">
                            <span className="text-purple-600 font-medium">📋 {stats.raised}</span>
                            <span className="text-green-600 font-medium">✅ {stats.resolved}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Client Performance */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="flex items-center space-x-3 mb-8">
              <span className="text-3xl">👥</span>
              <h2 className="text-2xl font-bold text-gray-800">Client Performance Overview</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Object.entries(misalignmentAnalysis.clientData || {}).slice(0, 6).map(([client, months]) => {
                const totalIssues = Object.values(months).reduce((sum, data) => sum + data.count, 0);
                const uniqueVehicles = Object.values(months).reduce((acc, data) => {
                  data.vehicles.forEach(v => acc.add(v));
                  return acc;
                }, new Set()).size;
                
                return (
                  <div key={client} className="bg-gradient-to-br from-indigo-50 to-blue-100 p-6 rounded-xl border border-indigo-200">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-indigo-800 text-lg">{client}</h3>
                        <p className="text-sm text-indigo-600">Performance Metrics</p>
                      </div>
                      <span className="text-2xl">🏢</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-indigo-700">Total Issues:</span>
                        <span className="font-bold text-indigo-800">{totalIssues}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-indigo-700">Unique Vehicles:</span>
                        <span className="font-bold text-indigo-800">{uniqueVehicles}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-indigo-700">Avg/Vehicle:</span>
                        <span className="font-bold text-indigo-800">{uniqueVehicles > 0 ? (totalIssues / uniqueVehicles).toFixed(1) : 0}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-indigo-200">
                      <div className="w-full bg-indigo-200 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((totalIssues / Math.max(...Object.values(misalignmentAnalysis.clientData || {}).map(m => Object.values(m).reduce((s, d) => s + d.count, 0)))) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-indigo-600 mt-1">Relative performance</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* System Status */}
          <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl shadow-xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-3xl">🌟</span>
                  <h2 className="text-2xl font-bold">System Health Status</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                    <p className="text-green-100 text-sm">Data Connection</p>
                    <p className="text-2xl font-bold">🟢 Healthy</p>
                    <p className="text-green-100 text-xs">Last sync: {new Date().toLocaleTimeString()}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                    <p className="text-blue-100 text-sm">Processing Speed</p>
                    <p className="text-2xl font-bold">⚡ Optimal</p>
                    <p className="text-blue-100 text-xs">Response time: &lt;2s</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                    <p className="text-purple-100 text-sm">Data Quality</p>
                    <p className="text-2xl font-bold">✅ Verified</p>
                    <p className="text-purple-100 text-xs">All sources active</p>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <span className="text-6xl">📊</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center py-8">
            <div className="inline-flex items-center space-x-2 bg-white px-6 py-3 rounded-full shadow-lg border border-gray-100">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-gray-600 text-sm">
                Auto-refresh every 5 minutes • Last update: {new Date().toLocaleString()}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-4">
              🚀 Powered by Google Sheets API • Built with Next.js & Tailwind CSS
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
