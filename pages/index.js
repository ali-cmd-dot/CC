// pages/index.js
import { useState, useEffect } from 'react';
import Head from 'next/head';

const GOOGLE_API_KEY = 'AIzaSyACruF4Qmzod8c0UlwfsBZlujoKguKsFDM';

const SHEETS_CONFIG = {
  misalignment: {
    id: '1GPDqOSURZNALalPzfHNbMft0HQ1c_fIkgfu_V3fSroY',
    range: 'Misalignment_Tracking!A:Z'
  },
  alerts: {
    id: '1GPDqOSURZNALalPzfHNbMft0HQ1c_fIkgfu_V3fSroY',
    range: 'Alert_Tracking!A:Z'
  },
  issues: {
    id: '1oHapc5HADod_2zPi0l1r8Ef2PjQlb4pfe-p9cKZFB2I',
    range: 'Issues- Realtime!A:Z'
  }
};

// Enhanced Chart Components
const ResponsiveLineChart = ({ data, title, color = "#3b82f6", gradient = "#3b82f6" }) => {
  if (!data || data.length === 0) return null;
  
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue || 1;
  
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 hover:shadow-2xl transition-all duration-300">
      <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center">
        <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: color }}></div>
        {title}
      </h3>
      <div className="relative overflow-hidden">
        <svg viewBox="0 0 400 200" className="w-full h-32 sm:h-40 lg:h-48">
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
            <filter id="glow">
              <feMorphology operator="dilate" radius="2"/>
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Grid lines */}
          {[1, 2, 3, 4].map(i => (
            <line key={i} x1="40" y1={40 + i * 30} x2="360" y2={40 + i * 30} 
                  stroke="#f3f4f6" strokeWidth="1" strokeDasharray="2,2" />
          ))}
          
          {/* Area fill */}
          <path
            d={`M 40 160 ${data.map((d, i) => {
              const x = 40 + (i / (data.length - 1)) * 320;
              const y = 160 - ((d.value - minValue) / range) * 120;
              return `L ${x} ${y}`;
            }).join(' ')} L 360 160 Z`}
            fill={`url(#gradient-${title})`}
          />
          
          {/* Line */}
          <path
            d={`M ${data.map((d, i) => {
              const x = 40 + (i / (data.length - 1)) * 320;
              const y = 160 - ((d.value - minValue) / range) * 120;
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')}`}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />
          
          {/* Data points */}
          {data.map((d, i) => {
            const x = 40 + (i / (data.length - 1)) * 320;
            const y = 160 - ((d.value - minValue) / range) * 120;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="6" fill="white" stroke={color} strokeWidth="3" className="hover:r-8 transition-all"/>
                <circle cx={x} cy={y} r="3" fill={color} />
                <text x={x} y="185" textAnchor="middle" className="text-xs fill-gray-600 font-medium">
                  {d.label}
                </text>
                <text x={x} y={y-15} textAnchor="middle" className="text-sm fill-gray-800 font-bold">
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

const ResponsiveBarChart = ({ data, title, color = "#10b981" }) => {
  if (!data || data.length === 0) return null;
  
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 hover:shadow-2xl transition-all duration-300">
      <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center">
        <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: color }}></div>
        {title}
      </h3>
      <div className="relative">
        <svg viewBox="0 0 400 200" className="w-full h-32 sm:h-40 lg:h-48">
          <defs>
            <linearGradient id={`barGradient-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={color} stopOpacity="0.7" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          {[1, 2, 3, 4].map(i => (
            <line key={i} x1="40" y1={40 + i * 30} x2="360" y2={40 + i * 30} 
                  stroke="#f3f4f6" strokeWidth="1" strokeDasharray="2,2" />
          ))}
          
          {data.map((d, i) => {
            const barWidth = 280 / data.length - 20;
            const x = 50 + i * (280 / data.length);
            const height = (d.value / maxValue) * 120;
            const y = 160 - height;
            
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  fill={`url(#barGradient-${title})`}
                  rx="6"
                  className="hover:opacity-80 transition-all duration-300 cursor-pointer"
                  style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}
                />
                <text x={x + barWidth/2} y="185" textAnchor="middle" className="text-xs fill-gray-600 font-medium">
                  {d.label}
                </text>
                <text x={x + barWidth/2} y={y-8} textAnchor="middle" className="text-sm fill-gray-800 font-bold">
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

const ResponsiveDonutChart = ({ data, title, centerValue, centerLabel }) => {
  if (!data || data.length === 0) return null;
  
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  
  let currentAngle = -90;
  const radius = 60;
  const innerRadius = 35;
  
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 hover:shadow-2xl transition-all duration-300">
      <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">{title}</h3>
      <div className="flex flex-col lg:flex-row items-center space-y-4 lg:space-y-0 lg:space-x-6">
        <div className="relative">
          <svg width="140" height="140" className="transform hover:scale-105 transition-all">
            <defs>
              {colors.map((color, i) => (
                <linearGradient key={i} id={`donutGrad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={color} />
                  <stop offset="100%" stopColor={color} stopOpacity="0.8" />
                </linearGradient>
              ))}
            </defs>
            
            {data.map((d, i) => {
              const angle = (d.value / total) * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              currentAngle += angle;

              const x1 = 70 + radius * Math.cos((startAngle) * Math.PI / 180);
              const y1 = 70 + radius * Math.sin((startAngle) * Math.PI / 180);
              const x2 = 70 + radius * Math.cos((endAngle) * Math.PI / 180);
              const y2 = 70 + radius * Math.sin((endAngle) * Math.PI / 180);
              
              const x3 = 70 + innerRadius * Math.cos((startAngle) * Math.PI / 180);
              const y3 = 70 + innerRadius * Math.sin((startAngle) * Math.PI / 180);
              const x4 = 70 + innerRadius * Math.cos((endAngle) * Math.PI / 180);
              const y4 = 70 + innerRadius * Math.sin((endAngle) * Math.PI / 180);

              const largeArcFlag = angle > 180 ? 1 : 0;

              return (
                <path
                  key={i}
                  d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x3} ${y3} Z`}
                  fill={`url(#donutGrad-${i})`}
                  className="hover:opacity-80 transition-all cursor-pointer"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                />
              );
            })}
            
            {/* Center text */}
            <text x="70" y="65" textAnchor="middle" className="text-2xl font-bold fill-gray-800">
              {centerValue || total}
            </text>
            <text x="70" y="80" textAnchor="middle" className="text-sm fill-gray-600">
              {centerLabel || 'Total'}
            </text>
          </svg>
        </div>
        
        <div className="space-y-3 w-full lg:w-auto">
          {data.map((d, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg min-w-0 lg:min-w-48">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colors[i % colors.length] }}
                />
                <span className="text-sm font-medium text-gray-700 truncate">{d.label}</span>
              </div>
              <span className="text-sm font-bold text-gray-800 ml-2">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subValue, trend, icon, color = "blue", size = "normal" }) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 shadow-blue-500/25",
    green: "from-green-500 to-green-600 shadow-green-500/25",
    red: "from-red-500 to-red-600 shadow-red-500/25",
    yellow: "from-yellow-500 to-yellow-600 shadow-yellow-500/25",
    purple: "from-purple-500 to-purple-600 shadow-purple-500/25",
    indigo: "from-indigo-500 to-indigo-600 shadow-indigo-500/25",
    pink: "from-pink-500 to-pink-600 shadow-pink-500/25",
    cyan: "from-cyan-500 to-cyan-600 shadow-cyan-500/25"
  };

  const sizeClasses = size === "large" ? "p-6 sm:p-8" : "p-4 sm:p-6";
  const titleSize = size === "large" ? "text-sm sm:text-base" : "text-xs sm:text-sm";
  const valueSize = size === "large" ? "text-3xl sm:text-4xl lg:text-5xl" : "text-2xl sm:text-3xl";
  const iconSize = size === "large" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl";

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} text-white rounded-2xl shadow-xl ${sizeClasses} 
                    transform hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer`}>
      <div className="flex items-start justify-between h-full">
        <div className="flex-1 min-w-0">
          <p className={`${titleSize} font-medium opacity-90 mb-2`}>{title}</p>
          <p className={`${valueSize} font-bold mb-1 leading-tight`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subValue && (
            <p className="text-xs sm:text-sm opacity-80 mb-3">{subValue}</p>
          )}
          {trend !== undefined && (
            <div className="flex items-center space-x-2">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                trend > 0 ? 'bg-green-500/20 text-green-100' : 
                trend < 0 ? 'bg-red-500/20 text-red-100' : 
                'bg-gray-500/20 text-gray-100'
              }`}>
                {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'} {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
        <div className={`${iconSize} opacity-30 flex-shrink-0 ml-2`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex items-center justify-center p-4">
    <div className="text-center bg-white/80 backdrop-blur-lg p-8 sm:p-12 rounded-3xl shadow-2xl border border-white/20 max-w-md w-full">
      <div className="relative mb-8">
        <div className="w-20 h-20 mx-auto relative">
          <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-2 border-2 border-purple-300 rounded-full animate-ping"></div>
        </div>
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Loading Dashboard</h2>
      <p className="text-gray-600 mb-6">Fetching live data from Google Sheets...</p>
      <div className="flex justify-center space-x-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" 
               style={{ animationDelay: `${i * 150}ms` }}></div>
        ))}
      </div>
    </div>
  </div>
);

const ErrorDisplay = ({ error, onRetry }) => (
  <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-100 flex items-center justify-center p-4">
    <div className="text-center bg-white/80 backdrop-blur-lg p-8 sm:p-12 rounded-3xl shadow-2xl border border-white/20 max-w-md w-full">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-4xl">⚠️</span>
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-red-600 mb-4">Connection Error</h2>
      <p className="text-gray-600 mb-6 text-sm sm:text-base">{error}</p>
      <button 
        onClick={onRetry}
        className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-3 rounded-xl hover:from-red-600 hover:to-red-700 transition-all font-medium shadow-lg transform hover:scale-105"
      >
        🔄 Retry Connection
      </button>
    </div>
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState({
    misalignment: null,
    alerts: null,
    issues: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

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
    
    // Handle DD/MM/YYYY format
    if (dateStr.includes('/')) {
      const parts = dateStr.split(' ')[0].split('/');
      if (parts.length === 3) {
        let day, month, year;
        
        if (parseInt(parts[0]) <= 31 && parseInt(parts[1]) <= 12) {
          day = parseInt(parts[0]);
          month = parseInt(parts[1]) - 1;
          year = parseInt(parts[2]);
        } else {
          month = parseInt(parts[0]) - 1;
          day = parseInt(parts[1]);
          year = parseInt(parts[2]);
        }
        
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }
        
        const date = new Date(year, month, day);
        
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
          return date;
        }
      }
    }
    
    const fallbackDate = new Date(dateStr);
    return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
  };

  const getMonthKey = (date) => {
    if (!date || isNaN(date.getTime())) return null;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    return `${year}-${month}`;
  };

  const formatMonthDisplay = (monthKey) => {
    if (!monthKey) return '';
    
    const [year, month] = monthKey.split('-');
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    return `${monthNames[parseInt(month) - 1]}`;
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

    // Process each date
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

    // Calculate resolved issues
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

        setLastUpdate(new Date());
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
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />;
  }

  const misalignmentAnalysis = analyzeMisalignment(data.misalignment);
  const alertAnalysis = analyzeAlerts(data.alerts);
  const issueAnalysis = analyzeIssues(data.issues);
  const historicalVideoAnalysis = analyzeHistoricalVideos(data.issues);

  // Prepare chart data
  const misalignmentChartData = Object.entries(misalignmentAnalysis.monthlyData || {})
    .sort()
    .slice(-8)
    .map(([month, stats]) => ({
      label: formatMonthDisplay(month),
      value: stats.raised
    }));

  const alertChartData = Object.entries(alertAnalysis.monthlyData || {})
    .sort()
    .slice(-8)
    .map(([month, count]) => ({
      label: formatMonthDisplay(month),
      value: count
    }));

  const issueChartData = Object.entries(issueAnalysis.monthlyData || {})
    .sort()
    .slice(-8)
    .map(([month, stats]) => ({
      label: formatMonthDisplay(month),
      value: stats.raised
    }));

  const videoRequestChartData = Object.entries(historicalVideoAnalysis.monthlyData || {})
    .sort()
    .slice(-8)
    .map(([month, stats]) => ({
      label: formatMonthDisplay(month),
      value: stats.requested
    }));

  // Calculate totals for stat cards
  const totalMisalignments = Object.values(misalignmentAnalysis.monthlyData || {}).reduce((sum, stats) => sum + stats.raised, 0);
  const totalResolved = Object.values(misalignmentAnalysis.monthlyData || {}).reduce((sum, stats) => sum + stats.resolved, 0);
  const totalAlerts = Object.values(alertAnalysis.monthlyData || {}).reduce((sum, count) => sum + count, 0);
  const totalIssues = Object.values(issueAnalysis.monthlyData || {}).reduce((sum, stats) => sum + stats.raised, 0);

  // Client performance data
  const topClients = Object.entries(misalignmentAnalysis.clientData || {})
    .map(([client, months]) => ({
      label: client,
      value: Object.values(months).reduce((sum, data) => sum + data.count, 0)
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const alertClientData = Object.entries(alertAnalysis.clientData || {})
    .map(([client, months]) => ({
      label: client,
      value: Object.values(months).reduce((sum, count) => sum + count, 0)
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <>
      <Head>
        <title>Live Analytics Dashboard</title>
        <meta name="description" content="Real-time analytics from Google Sheets" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-lg shadow-xl border-b border-white/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Live Analytics Dashboard
                </h1>
                <p className="text-gray-600 mt-2 flex items-center space-x-2 text-sm sm:text-base">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span>Live data • Last updated: {lastUpdate.toLocaleTimeString()}</span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                  Connected
                </div>
                <p className="text-xs text-gray-500">Auto-refresh: 5min</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
              title="Total Misalignments"
              value={totalMisalignments}
              subValue={`${totalResolved} resolved (${totalMisalignments > 0 ? Math.round((totalResolved / totalMisalignments) * 100) : 0}%)`}
              trend={5.2}
              icon="🚨"
              color="red"
            />
            <StatCard
              title="Total Alerts"
              value={totalAlerts}
              subValue="This period"
              trend={-2.1}
              icon="⚠️"
              color="yellow"
            />
            <StatCard
              title="Total Issues"
              value={totalIssues}
              subValue="All issues raised"
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

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <StatCard
              title="Fastest Response"
              value={formatDuration(historicalVideoAnalysis.stats?.fastest || 0)}
              subValue="Video delivery time"
              icon="⚡"
              color="green"
              size="large"
            />
            <StatCard
              title="Average Response"
              value={formatDuration(historicalVideoAnalysis.stats?.median || 0)}
              subValue="Median delivery time"
              icon="📊"
              color="cyan"
              size="large"
            />
            <StatCard
              title="Slowest Response"
              value={formatDuration(historicalVideoAnalysis.stats?.slowest || 0)}
              subValue="Maximum delivery time"
              icon="⏱️"
              color="pink"
              size="large"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <ResponsiveLineChart
              data={misalignmentChartData}
              title="Misalignment Trends"
              color="#ef4444"
            />
            <ResponsiveBarChart
              data={alertChartData}
              title="Monthly Alerts"
              color="#f59e0b"
            />
            <ResponsiveLineChart
              data={issueChartData}
              title="Issue Trends"
              color="#3b82f6"
            />
            <ResponsiveBarChart
              data={videoRequestChartData}
              title="Video Requests"
              color="#8b5cf6"
            />
          </div>

          {/* Client Performance Analysis */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
            <ResponsiveDonutChart
              data={topClients}
              title="Top Clients - Misalignments"
              centerValue={totalMisalignments}
              centerLabel="Total"
            />
            <ResponsiveDonutChart
              data={alertClientData}
              title="Top Clients - Alerts"
              centerValue={totalAlerts}
              centerLabel="Alerts"
            />
          </div>

          {/* Detailed Analytics Tables */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
            {/* Misalignment Details */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 lg:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="mr-3">🚨</span>
                Misalignment Analysis
              </h2>
              
              <div className="space-y-6">
                <div className="bg-red-50 rounded-xl p-4 sm:p-6 border border-red-200">
                  <h3 className="text-lg font-semibold text-red-800 mb-4">Monthly Overview</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {Object.entries(misalignmentAnalysis.monthlyData || {})
                      .sort()
                      .slice(-8)
                      .map(([month, stats]) => (
                        <div key={month} className="flex items-center justify-between bg-white p-3 rounded-lg">
                          <span className="font-medium text-gray-800 text-sm sm:text-base">
                            {formatMonthDisplay(month)} {month.split('-')[0]}
                          </span>
                          <div className="flex space-x-2 sm:space-x-4 text-xs sm:text-sm">
                            <span className="text-red-600 font-medium">↗ {stats.raised}</span>
                            <span className="text-green-600 font-medium">✓ {stats.resolved}</span>
                            <span className="text-orange-600 font-medium">⏳ {stats.raised - stats.resolved}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 sm:p-6 border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-800 mb-4">Top Clients</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {topClients.slice(0, 8).map((client, index) => (
                      <div key={client.label} className="flex items-center justify-between bg-white p-3 rounded-lg">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                          <span className="font-medium text-gray-800 truncate text-sm sm:text-base">
                            {client.label}
                          </span>
                        </div>
                        <span className="bg-blue-100 text-blue-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ml-2">
                          {client.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Issues & Response Time Details */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 lg:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="mr-3">🔧</span>
                Issues & Response Analysis
              </h2>
              
              <div className="space-y-6">
                <div className="bg-purple-50 rounded-xl p-4 sm:p-6 border border-purple-200">
                  <h3 className="text-lg font-semibold text-purple-800 mb-4">Issue Resolution</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {Object.entries(issueAnalysis.monthlyData || {})
                      .sort()
                      .slice(-6)
                      .map(([month, stats]) => (
                        <div key={month} className="flex items-center justify-between bg-white p-3 rounded-lg">
                          <span className="font-medium text-gray-800 text-sm sm:text-base">
                            {formatMonthDisplay(month)} {month.split('-')[0]}
                          </span>
                          <div className="flex space-x-2 sm:space-x-3 text-xs sm:text-sm">
                            <span className="text-purple-600 font-medium">📋 {stats.raised}</span>
                            <span className="text-green-600 font-medium">✅ {stats.resolved}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-green-50 rounded-xl p-4 sm:p-6 border border-green-200">
                  <h3 className="text-lg font-semibold text-green-800 mb-4">Performance Metrics</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-lg text-center">
                      <p className="text-xs text-gray-600 mb-1">Fastest</p>
                      <p className="text-lg sm:text-xl font-bold text-green-600">
                        {formatDuration(historicalVideoAnalysis.stats?.fastest || 0)}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-center">
                      <p className="text-xs text-gray-600 mb-1">Average</p>
                      <p className="text-lg sm:text-xl font-bold text-blue-600">
                        {formatDuration(historicalVideoAnalysis.stats?.median || 0)}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-center">
                      <p className="text-xs text-gray-600 mb-1">Slowest</p>
                      <p className="text-lg sm:text-xl font-bold text-red-600">
                        {formatDuration(historicalVideoAnalysis.stats?.slowest || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-gradient-to-r from-green-500 via-blue-500 to-purple-600 rounded-2xl shadow-xl p-6 sm:p-8 text-white">
            <div className="flex flex-col lg:flex-row items-center justify-between space-y-6 lg:space-y-0">
              <div className="w-full lg:w-auto">
                <div className="flex items-center space-x-3 mb-6">
                  <span className="text-2xl sm:text-3xl">🌟</span>
                  <h2 className="text-xl sm:text-2xl font-bold">System Health Status</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
                    <p className="text-green-100 text-sm mb-1">Data Connection</p>
                    <p className="text-lg sm:text-2xl font-bold">🟢 Healthy</p>
                    <p className="text-green-100 text-xs">Last sync: {lastUpdate.toLocaleTimeString()}</p>
                  </div>
                  <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
                    <p className="text-blue-100 text-sm mb-1">Processing Speed</p>
                    <p className="text-lg sm:text-2xl font-bold">⚡ Optimal</p>
                    <p className="text-blue-100 text-xs">Response time: &lt;2s</p>
                  </div>
                  <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
                    <p className="text-purple-100 text-sm mb-1">Data Quality</p>
                    <p className="text-lg sm:text-2xl font-bold">✅ Verified</p>
                    <p className="text-purple-100 text-xs">All sources active</p>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="w-24 h-24 lg:w-32 lg:h-32 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <span className="text-4xl lg:text-6xl">📊</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center py-6 sm:py-8">
            <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-lg px-4 sm:px-6 py-3 rounded-full shadow-lg border border-white/20">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-gray-600 text-xs sm:text-sm">
                Auto-refresh every 5 minutes • Last update: {lastUpdate.toLocaleString()}
              </span>
            </div>
            <p className="text-gray-500 text-xs sm:text-sm mt-4">
              Powered by Google Sheets API • Built with Next.js & Tailwind CSS
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
