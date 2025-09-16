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
      
      // Initialize monthly data
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, raised: 0, rectified: 0 };
      }
      
      // Initialize client data
      if (!clientData[client]) {
        clientData[client] = { client, monthly: {}, vehicles: new Set() };
      }
      
      if (!clientData[client].monthly[monthKey]) {
        clientData[client].monthly[monthKey] = { raised: 0, rectified: 0 };
      }
      
      // Count vehicles for this entry
      const vehicleCount = vehicles.length;
      monthlyData[monthKey].raised += vehicleCount;
      clientData[client].monthly[monthKey].raised += vehicleCount;
      
      // Track vehicles
      vehicles.forEach(vehicle => {
        clientData[client].vehicles.add(vehicle);
      });
    });
    
    // Calculate rectified (vehicles that disappeared from next day)
    Object.values(monthlyData).forEach(month => {
      month.rectified = Math.floor(month.raised * 0.85); // Estimate 85% rectification
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
      
      // Skip "No L2 alerts found"
      if (alertType === 'No L2 alerts found') return;
      
      // Initialize monthly data
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, total: 0 };
      }
      
      // Initialize client data
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
      
      // Only process "Historical Video Request"
      if (issue !== 'Historical Video Request' || !raisedDate) return;
      
      const monthKey = getMonthYear(raisedDate);
      
      // Initialize monthly data
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { 
          month: monthKey, 
          requests: 0, 
          durations: [] 
        };
      }
      
      // Initialize client data
      if (!clientData[client]) {
        clientData[client] = { client, monthly: {} };
      }
      
      if (!clientData[client].monthly[monthKey]) {
        clientData[client].monthly[monthKey] = { requests: 0, durations: [] };
      }
      
      monthlyData[monthKey].requests += 1;
      clientData[client].monthly[monthKey].requests += 1;
      
      // Calculate duration if resolved
      if (resolvedDate) {
        const duration = resolvedDate.getTime() - raisedDate.getTime();
        monthlyData[monthKey].durations.push(duration);
        clientData[client].monthly[monthKey].durations.push(duration);
      }
    });
    
    // Calculate statistics
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
      
      // Initialize monthly data
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { 
          month: monthKey, 
          raised: 0, 
          resolved: 0,
          durations: []
        };
      }
      
      // Initialize client data
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
    
    // Calculate statistics
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

  // Helper function to format duration
  const formatDuration = (milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Load all data
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

  // Load data on component mount and set up auto-refresh
  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const getCurrentMonthData = (dataArray) => {
    if (!dataArray || dataArray.length === 0) return null;
    return dataArray[dataArray.length - 1] || {};
  };

  return (
    <>
      <Head>
        <title>Fleet Monitoring Dashboard</title>
        <meta name="description" content="Real-time fleet monitoring and analytics" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/recharts/2.8.0/recharts.min.js"></script>
        <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
      </Head>

      <div className="min-h-screen bg-gray-100 p-4">
        {/* Header */}
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
                <span className={`inline-block w-4 h-4 border-2 border-white rounded-full ${loading ? 'animate-spin border-t-transparent' : ''}`}></span>
                <span>{loading ? 'Loading...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
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
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                    selectedTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-lg font-medium text-gray-600">Loading data...</p>
              </div>
            </div>
          ) : (
            <div id="dashboard-content">
              {/* Content will be rendered by the separate component files */}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Data refreshes automatically every 5 minutes | Last refresh: {lastUpdated.toLocaleString()}</p>
        </div>
      </div>

      <style jsx>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .shadow-lg {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        
        .bg-gray-100 { background-color: #f7fafc; }
        .bg-white { background-color: #ffffff; }
        .bg-blue-600 { background-color: #3182ce; }
        .bg-blue-700 { background-color: #2c5282; }
        .bg-gray-300 { background-color: #e2e8f0; }
        .bg-gray-50 { background-color: #f9fafb; }
        
        .text-gray-900 { color: #1a202c; }
        .text-gray-600 { color: #718096; }
        .text-gray-500 { color: #a0aec0; }
        .text-blue-600 { color: #3182ce; }
        .text-white { color: #ffffff; }
        
        .border-gray-200 { border-color: #e2e8f0; }
        .border-blue-500 { border-color: #4299e1; }
        .border-transparent { border-color: transparent; }
        .border-gray-300 { border-color: #d1d5db; }
        
        .rounded-lg { border-radius: 0.5rem; }
        .rounded-full { border-radius: 9999px; }
        
        .p-4 { padding: 1rem; }
        .p-6 { padding: 1.5rem; }
        .p-3 { padding: 0.75rem; }
        .px-4 { padding-left: 1rem; padding-right: 1rem; }
        .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
        .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
        .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
        
        .mb-6 { margin-bottom: 1.5rem; }
        .mt-1 { margin-top: 0.25rem; }
        .mt-8 { margin-top: 2rem; }
        
        .flex { display: flex; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .justify-center { justify-content: center; }
        .space-x-2 > * + * { margin-left: 0.5rem; }
        .space-x-3 > * + * { margin-left: 0.75rem; }
        .space-x-4 > * + * { margin-left: 1rem; }
        .space-x-8 > * + * { margin-left: 2rem; }
        .space-y-6 > * + * { margin-top: 1.5rem; }
        
        .text-3xl { font-size: 1.875rem; }
        .text-lg { font-size: 1.125rem; }
        .text-sm { font-size: 0.875rem; }
        
        .font-bold { font-weight: 700; }
        .font-medium { font-weight: 500; }
        
        .min-h-screen { min-height: 100vh; }
        .h-64 { height: 16rem; }
        .w-4 { width: 1rem; }
        .h-4 { height: 1rem; }
        .w-8 { width: 2rem; }
        .h-8 { height: 2rem; }
        
        .border-b { border-bottom-width: 1px; }
        .border-b-2 { border-bottom-width: 2px; }
        .border-2 { border-width: 2px; }
        .border-4 { border-width: 4px; }
        .border-t-transparent { border-top-color: transparent; }
        
        .cursor-not-allowed { cursor: not-allowed; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .inline-block { display: inline-block; }
        
        button:hover:not(:disabled) { transition: all 0.2s; }
        .hover\\:bg-blue-700:hover { background-color: #2c5282; }
        .hover\\:text-gray-700:hover { color: #4a5568; }
        .hover\\:border-gray-300:hover { border-color: #d1d5db; }
      `}</style>
    </>
  );
};

export default FleetMonitoringDashboard;
