import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Calendar, AlertTriangle, Video, Settings, TrendingUp, Clock, Users } from 'lucide-react';

const API_KEY = 'AIzaSyACruF4Qmzod8c0UlwfsBZlujoKguKsFDM';
const SHEET_ID_1 = '1GPDqOSURZNALalPzfHNbMft0HQ1c_fIkgfu_V3fSroY';
const SHEET_ID_2 = '1oHapc5HADod_2zPi0l1r8Ef2PjQlb4pfe-p9cKZFB2I';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff88', '#ff0080'];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({
    misalignments: [],
    alerts: [],
    historicalVideos: [],
    issues: []
  });
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    misalignmentStats: {},
    alertStats: {},
    videoStats: {},
    issueStats: {}
  });

  const fetchSheetData = async (sheetId, tabName) => {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tabName}?key=${API_KEY}`;
      const response = await fetch(url);
      const result = await response.json();
      return result.values || [];
    } catch (error) {
      console.error(`Error fetching ${tabName}:`, error);
      return [];
    }
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    
    // Handle different date formats
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // DD/MM/YYYY
      /(\d{1,2})\/(\d{1,2})\/(\d{2})/,   // DD/MM/YY
      /(\d{4})-(\d{1,2})-(\d{1,2})/      // YYYY-MM-DD
    ];
    
    for (let format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format.source.includes('\\d{4}') && match[3].length === 4) {
          // DD/MM/YYYY format
          return new Date(match[3], match[2] - 1, match[1]);
        } else if (format.source.includes('\\d{2}') && match[3].length === 2) {
          // DD/MM/YY format
          const year = parseInt(match[3]) + (parseInt(match[3]) > 50 ? 1900 : 2000);
          return new Date(year, match[2] - 1, match[1]);
        } else if (match[1].length === 4) {
          // YYYY-MM-DD format
          return new Date(match[1], match[2] - 1, match[3]);
        }
      }
    }
    return null;
  };

  const getMonthYear = (date) => {
    if (!date) return 'Unknown';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return null;
    return Math.abs(endDate - startDate) / (1000 * 60 * 60); // hours
  };

  const processMisalignmentData = (rawData) => {
    if (!rawData || rawData.length < 2) return { monthlyStats: {}, clientStats: {}, vehicleStats: {} };
    
    const headers = rawData[0];
    const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date'));
    const vehicleIndex = headers.findIndex(h => h.toLowerCase().includes('vehicle'));
    const clientIndex = headers.findIndex(h => h.toLowerCase().includes('client'));
    
    const monthlyStats = {};
    const clientStats = {};
    const vehicleStats = {};
    
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      const date = parseDate(row[dateIndex]);
      const vehicles = row[vehicleIndex] ? row[vehicleIndex].split(',').map(v => v.trim()) : [];
      const client = row[clientIndex] || 'Unknown';
      
      if (date) {
        const monthKey = getMonthYear(date);
        
        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = { raised: 0, resolved: 0 };
        }
        monthlyStats[monthKey].raised += vehicles.length;
        
        if (!clientStats[client]) {
          clientStats[client] = {};
        }
        if (!clientStats[client][monthKey]) {
          clientStats[client][monthKey] = { raised: 0, vehicles: new Set() };
        }
        clientStats[client][monthKey].raised += vehicles.length;
        
        vehicles.forEach(vehicle => {
          clientStats[client][monthKey].vehicles.add(vehicle);
          if (!vehicleStats[vehicle]) {
            vehicleStats[vehicle] = { count: 0, client };
          }
          vehicleStats[vehicle].count++;
        });
      }
    }
    
    return { monthlyStats, clientStats, vehicleStats };
  };

  const processAlertData = (rawData) => {
    if (!rawData || rawData.length < 2) return { monthlyStats: {}, clientStats: {} };
    
    const headers = rawData[0];
    const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date'));
    const alertTypeIndex = headers.findIndex(h => h.toLowerCase().includes('alert type'));
    const clientIndex = headers.findIndex(h => h.toLowerCase().includes('client'));
    
    const monthlyStats = {};
    const clientStats = {};
    
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      const date = parseDate(row[dateIndex]);
      const alertType = row[alertTypeIndex] || '';
      const client = row[clientIndex] || 'Unknown';
      
      // Skip "No L2 alerts found"
      if (alertType.toLowerCase().includes('no l2 alerts found')) continue;
      
      if (date) {
        const monthKey = getMonthYear(date);
        
        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = { count: 0 };
        }
        monthlyStats[monthKey].count++;
        
        if (!clientStats[client]) {
          clientStats[client] = {};
        }
        if (!clientStats[client][monthKey]) {
          clientStats[client][monthKey] = { count: 0 };
        }
        clientStats[client][monthKey].count++;
      }
    }
    
    return { monthlyStats, clientStats };
  };

  const processVideoData = (rawData) => {
    if (!rawData || rawData.length < 2) return { monthlyStats: {}, clientStats: {}, durations: [] };
    
    const headers = rawData[0];
    const raisedIndex = headers.findIndex(h => h.toLowerCase().includes('timestamp issues raised'));
    const resolvedIndex = headers.findIndex(h => h.toLowerCase().includes('timestamp issues resolved'));
    const issueIndex = headers.findIndex(h => h.toLowerCase().includes('issue'));
    const clientIndex = headers.findIndex(h => h.toLowerCase().includes('client'));
    
    const monthlyStats = {};
    const clientStats = {};
    const durations = [];
    
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      const issue = row[issueIndex] || '';
      
      // Only process Historical Video Requests
      if (!issue.toLowerCase().includes('historical video request')) continue;
      
      const raisedDate = parseDate(row[raisedIndex]);
      const resolvedDate = parseDate(row[resolvedIndex]);
      const client = row[clientIndex] || 'Unknown';
      
      if (raisedDate) {
        const monthKey = getMonthYear(raisedDate);
        
        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = { raised: 0, resolved: 0 };
        }
        monthlyStats[monthKey].raised++;
        
        if (resolvedDate) {
          monthlyStats[monthKey].resolved++;
          const duration = calculateDuration(raisedDate, resolvedDate);
          if (duration !== null) {
            durations.push(duration);
          }
        }
        
        if (!clientStats[client]) {
          clientStats[client] = {};
        }
        if (!clientStats[client][monthKey]) {
          clientStats[client][monthKey] = { count: 0 };
        }
        clientStats[client][monthKey].count++;
      }
    }
    
    return { monthlyStats, clientStats, durations };
  };

  const processIssueData = (rawData) => {
    if (!rawData || rawData.length < 2) return { monthlyStats: {}, clientStats: {}, durations: [] };
    
    const headers = rawData[0];
    const raisedIndex = headers.findIndex(h => h.toLowerCase().includes('timestamp issues raised'));
    const resolvedIndex = headers.findIndex(h => h.toLowerCase().includes('timestamp issues resolved'));
    const clientIndex = headers.findIndex(h => h.toLowerCase().includes('client'));
    
    const monthlyStats = {};
    const clientStats = {};
    const durations = [];
    
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      const raisedDate = parseDate(row[raisedIndex]);
      const resolvedDate = parseDate(row[resolvedIndex]);
      const client = row[clientIndex] || 'Unknown';
      
      if (raisedDate) {
        const monthKey = getMonthYear(raisedDate);
        
        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = { raised: 0, resolved: 0 };
        }
        monthlyStats[monthKey].raised++;
        
        if (resolvedDate) {
          monthlyStats[monthKey].resolved++;
          const duration = calculateDuration(raisedDate, resolvedDate);
          if (duration !== null) {
            durations.push(duration);
          }
        }
        
        if (!clientStats[client]) {
          clientStats[client] = {};
        }
        if (!clientStats[client][monthKey]) {
          clientStats[client][monthKey] = { raised: 0, resolved: 0 };
        }
        clientStats[client][monthKey].raised++;
        if (resolvedDate) {
          clientStats[client][monthKey].resolved++;
        }
      }
    }
    
    return { monthlyStats, clientStats, durations };
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        const [misalignmentData, alertData, videoData, issueData] = await Promise.all([
          fetchSheetData(SHEET_ID_1, 'Misalignment_Tracking'),
          fetchSheetData(SHEET_ID_1, 'Alert_Tracking'),
          fetchSheetData(SHEET_ID_2, 'Issues- Realtime'),
          fetchSheetData(SHEET_ID_2, 'Issues- Realtime')
        ]);

        const misalignmentStats = processMisalignmentData(misalignmentData);
        const alertStats = processAlertData(alertData);
        const videoStats = processVideoData(videoData);
        const issueStats = processIssueData(issueData);

        setData({
          misalignments: misalignmentData,
          alerts: alertData,
          historicalVideos: videoData,
          issues: issueData
        });

        setAnalytics({
          misalignmentStats,
          alertStats,
          videoStats,
          issueStats
        });
      } catch (error) {
        console.error('Error loading data:', error);
      }
      
      setLoading(false);
    };

    loadData();
    const interval = setInterval(loadData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const getDurationStats = (durations) => {
    if (durations.length === 0) return { fastest: 0, average: 0, slowest: 0 };
    
    const sorted = [...durations].sort((a, b) => a - b);
    return {
      fastest: sorted[0],
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      slowest: sorted[sorted.length - 1]
    };
  };

  const renderOverview = () => {
    const monthlyMisalignments = Object.entries(analytics.misalignmentStats.monthlyStats || {})
      .map(([month, data]) => ({ month, ...data }));
    
    const monthlyAlerts = Object.entries(analytics.alertStats.monthlyStats || {})
      .map(([month, data]) => ({ month, ...data }));

    const monthlyVideos = Object.entries(analytics.videoStats.monthlyStats || {})
      .map(([month, data]) => ({ month, ...data }));

    const monthlyIssues = Object.entries(analytics.issueStats.monthlyStats || {})
      .map(([month, data]) => ({ month, ...data }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Total Misalignments</h3>
                <p className="text-3xl font-bold">
                  {monthlyMisalignments.reduce((sum, item) => sum + item.raised, 0)}
                </p>
              </div>
              <Settings className="w-12 h-12 opacity-80" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Total Alerts</h3>
                <p className="text-3xl font-bold">
                  {monthlyAlerts.reduce((sum, item) => sum + item.count, 0)}
                </p>
              </div>
              <AlertTriangle className="w-12 h-12 opacity-80" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Video Requests</h3>
                <p className="text-3xl font-bold">
                  {monthlyVideos.reduce((sum, item) => sum + item.raised, 0)}
                </p>
              </div>
              <Video className="w-12 h-12 opacity-80" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Total Issues</h3>
                <p className="text-3xl font-bold">
                  {monthlyIssues.reduce((sum, item) => sum + item.raised, 0)}
                </p>
              </div>
              <TrendingUp className="w-12 h-12 opacity-80" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Monthly Misalignments Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyMisalignments}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="raised" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Monthly Alerts Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyAlerts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderMisalignments = () => {
    const monthlyData = Object.entries(analytics.misalignmentStats.monthlyStats || {})
      .map(([month, data]) => ({ month, ...data }));
    
    const clientData = Object.entries(analytics.misalignmentStats.clientStats || {})
      .map(([client, months]) => ({
        client,
        total: Object.values(months).reduce((sum, data) => sum + data.raised, 0)
      }));

    const vehicleData = Object.entries(analytics.misalignmentStats.vehicleStats || {})
      .slice(0, 10)
      .map(([vehicle, data]) => ({ vehicle, ...data }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Monthly Misalignments</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="raised" fill="#8884d8" name="Raised" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Client-wise Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={clientData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ client, value }) => `${client}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {clientData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Top Misaligned Vehicles</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vehicleData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="vehicle" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderAlerts = () => {
    const monthlyData = Object.entries(analytics.alertStats.monthlyStats || {})
      .map(([month, data]) => ({ month, ...data }));
    
    const clientData = Object.entries(analytics.alertStats.clientStats || {})
      .map(([client, months]) => ({
        client,
        total: Object.values(months).reduce((sum, data) => sum + data.count, 0)
      }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Monthly Alerts</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#ff7300" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Client-wise Alerts</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={clientData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ client, value }) => `${client}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {clientData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderVideos = () => {
    const monthlyData = Object.entries(analytics.videoStats.monthlyStats || {})
      .map(([month, data]) => ({ month, ...data }));
    
    const clientData = Object.entries(analytics.videoStats.clientStats || {})
      .map(([client, months]) => ({
        client,
        total: Object.values(months).reduce((sum, data) => sum + data.count, 0)
      }));

    const durationStats = getDurationStats(analytics.videoStats.durations || []);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-green-400 to-green-500 text-white p-4 rounded-lg">
            <h4 className="text-sm font-medium">Fastest Response</h4>
            <p className="text-2xl font-bold">{durationStats.fastest.toFixed(1)}h</p>
          </div>
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white p-4 rounded-lg">
            <h4 className="text-sm font-medium">Average Response</h4>
            <p className="text-2xl font-bold">{durationStats.average.toFixed(1)}h</p>
          </div>
          <div className="bg-gradient-to-r from-red-400 to-red-500 text-white p-4 rounded-lg">
            <h4 className="text-sm font-medium">Slowest Response</h4>
            <p className="text-2xl font-bold">{durationStats.slowest.toFixed(1)}h</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Monthly Video Requests</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="raised" fill="#82ca9d" name="Requested" />
                <Bar dataKey="resolved" fill="#8884d8" name="Delivered" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Client-wise Video Requests</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={clientData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ client, value }) => `${client}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {clientData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderIssues = () => {
    const monthlyData = Object.entries(analytics.issueStats.monthlyStats || {})
      .map(([month, data]) => ({ month, ...data }));
    
    const clientData = Object.entries(analytics.issueStats.clientStats || {})
      .map(([client, months]) => ({
        client,
        raised: Object.values(months).reduce((sum, data) => sum + data.raised, 0),
        resolved: Object.values(months).reduce((sum, data) => sum + data.resolved, 0)
      }));

    const durationStats = getDurationStats(analytics.issueStats.durations || []);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-green-400 to-green-500 text-white p-4 rounded-lg">
            <h4 className="text-sm font-medium">Fastest Resolution</h4>
            <p className="text-2xl font-bold">{durationStats.fastest.toFixed(1)}h</p>
          </div>
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white p-4 rounded-lg">
            <h4 className="text-sm font-medium">Average Resolution</h4>
            <p className="text-2xl font-bold">{durationStats.average.toFixed(1)}h</p>
          </div>
          <div className="bg-gradient-to-r from-red-400 to-red-500 text-white p-4 rounded-lg">
            <h4 className="text-sm font-medium">Slowest Resolution</h4>
            <p className="text-2xl font-bold">{durationStats.slowest.toFixed(1)}h</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Monthly Issues</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="raised" fill="#ff7300" name="Raised" />
                <Bar dataKey="resolved" fill="#82ca9d" name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Client-wise Issues</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clientData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="client" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="raised" fill="#ff7300" name="Raised" />
                <Bar dataKey="resolved" fill="#82ca9d" name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-xl">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Clock className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'misalignments', label: 'Misalignments', icon: Settings },
              { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
              { id: 'videos', label: 'Historical Videos', icon: Video },
              { id: 'issues', label: 'Issues', icon: Users },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'misalignments' && renderMisalignments()}
        {activeTab === 'alerts' && renderAlerts()}
        {activeTab === 'videos' && renderVideos()}
        {activeTab === 'issues' && renderIssues()}
      </main>
    </div>
  );
};

export default Dashboard;
