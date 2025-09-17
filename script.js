// Dashboard JavaScript
class VehicleMonitoringDashboard {
    constructor() {
        this.API_KEY = 'AIzaSyACruF4Qmzod8c0UlwfsBZlujoKguKsFDM';
        this.SHEET_IDS = {
            misalignment: '1GPDqOSURZNALalPzfHNbMft0HQ1c_fIkgfu_V3fSroY',
            issues: '1oHapc5HADod_2zPi0l1r8Ef2PjQlb4pfe-p9cKZFB2I'
        };
        
        this.data = {
            misalignments: { monthly: [], byClient: {}, vehicleRepeats: {} },
            videoRequests: { monthly: [], byClient: {}, responseStats: { fastest: 0, median: 0, slowest: 0 } },
            issues: { monthly: [], byClient: {}, resolutionStats: { fastest: 0, median: 0, slowest: 0 } },
            summaryStats: {}
        };
        
        this.charts = {};
        this.currentTab = 'overview';
        this.isLoading = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadData();
    }
    
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Refresh buttons
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadData();
        });
        
        document.getElementById('footer-refresh-btn').addEventListener('click', () => {
            this.loadData();
        });
    }
    
    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        this.currentTab = tabName;
    }
    
    showLoading() {
        document.getElementById('loading-screen').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
        document.getElementById('error-screen').classList.add('hidden');
        this.isLoading = true;
        
        // Update refresh button states
        const refreshBtns = [document.getElementById('refresh-btn'), document.getElementById('footer-refresh-btn')];
        refreshBtns.forEach(btn => {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            }
        });
    }
    
    hideLoading() {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        document.getElementById('error-screen').classList.add('hidden');
        this.isLoading = false;
        
        // Reset refresh button states
        const refreshBtns = [document.getElementById('refresh-btn'), document.getElementById('footer-refresh-btn')];
        refreshBtns.forEach(btn => {
            if (btn) {
                btn.disabled = false;
            }
        });
        document.getElementById('refresh-btn').innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
        document.getElementById('footer-refresh-btn').innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
        
        // Update last updated time
        document.getElementById('last-updated').textContent = new Date().toLocaleString();
    }
    
    showError(message) {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('dashboard').classList.add('hidden');
        document.getElementById('error-screen').classList.remove('hidden');
        document.getElementById('error-message').textContent = message;
        this.isLoading = false;
    }
    
    async fetchGoogleSheetData(sheetId, range) {
        try {
            const response = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${this.API_KEY}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data.values || [];
        } catch (error) {
            console.error('Error fetching sheet data:', error);
            throw error;
        }
    }
    
    parseDate(dateStr) {
        if (!dateStr) return null;
        
        // Handle different date formats
        const formats = [
            /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
            /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
            /^(\d{2})-(\d{2})-(\d{2})$/, // DD-MM-YY
            /^(\d{2})\/(\d{2})\/(\d{2})$/, // DD/MM/YY
            /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/ // DD/MM/YYYY HH:MM:SS
        ];
        
        for (let format of formats) {
            const match = dateStr.match(format);
            if (match) {
                let day, month, year;
                if (format.source.includes('HH:MM:SS')) {
                    [, day, month, year] = match;
                } else {
                    [, day, month, year] = match;
                }
                
                // Handle 2-digit years
                if (year && year.length === 2) {
                    year = '20' + year;
                }
                
                return new Date(year, month - 1, day);
            }
        }
        
        return new Date(dateStr);
    }
    
    getMonthYear(date) {
        if (!date || isNaN(date)) return null;
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
    
    calculateDuration(startDate, endDate) {
        if (!startDate || !endDate) return 0;
        return Math.abs(endDate - startDate) / (1000 * 60 * 60); // Hours
    }
    
    processMisalignmentData(rawData) {
        if (!rawData || rawData.length < 2) return { monthly: [], byClient: {}, vehicleRepeats: {} };
        
        const [headers, ...rows] = rawData;
        const monthlyData = {};
        const clientData = {};
        const vehicleRepeatData = {};
        
        rows.forEach(row => {
            const date = this.parseDate(row[0]);
            const client = row[1] || 'Unknown';
            const vehicles = row[2] ? row[2].split(',').map(v => v.trim()) : [];
            
            if (!date) return;
            
            const monthKey = this.getMonthYear(date);
            if (!monthKey) return;
            
            // Initialize monthly data
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { month: monthKey, raised: 0, resolved: 0 };
            }
            
            // Initialize client data
            if (!clientData[client]) {
                clientData[client] = {};
            }
            if (!clientData[client][monthKey]) {
                clientData[client][monthKey] = { raised: 0, vehicles: new Set() };
            }
            
            // Count raised misalignments
            vehicles.forEach(vehicle => {
                monthlyData[monthKey].raised++;
                clientData[client][monthKey].raised++;
                clientData[client][monthKey].vehicles.add(vehicle);
                
                // Track vehicle repeats
                if (!vehicleRepeatData[vehicle]) {
                    vehicleRepeatData[vehicle] = { client, count: 0, months: new Set() };
                }
                vehicleRepeatData[vehicle].count++;
                vehicleRepeatData[vehicle].months.add(monthKey);
            });
        });
        
        return {
            monthly: Object.values(monthlyData),
            byClient: clientData,
            vehicleRepeats: vehicleRepeatData
        };
    }
    
    processVideoRequestData(rawData) {
        if (!rawData || rawData.length < 2) return { monthly: [], byClient: {}, responseStats: { fastest: 0, median: 0, slowest: 0 } };
        
        const [headers, ...rows] = rawData;
        const monthlyData = {};
        const clientData = {};
        const responseTimes = [];
        
        rows.forEach(row => {
            const raisedDate = this.parseDate(row[5]); // Timestamp Issues Raised
            const resolvedDate = this.parseDate(row[20]); // Timestamp Issues Resolved
            const issue = row[8] || '';
            const client = row[2] || 'Unknown';
            
            if (!raisedDate || issue !== 'Historical Video Request') return;
            
            const monthKey = this.getMonthYear(raisedDate);
            if (!monthKey) return;
            
            // Initialize data structures
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { month: monthKey, requests: 0, resolved: 0 };
            }
            if (!clientData[client]) {
                clientData[client] = {};
            }
            if (!clientData[client][monthKey]) {
                clientData[client][monthKey] = { requests: 0, resolved: 0 };
            }
            
            monthlyData[monthKey].requests++;
            clientData[client][monthKey].requests++;
            
            if (resolvedDate) {
                monthlyData[monthKey].resolved++;
                clientData[client][monthKey].resolved++;
                
                const duration = this.calculateDuration(raisedDate, resolvedDate);
                responseTimes.push(duration);
            }
        });
        
        // Calculate response time statistics
        const sortedTimes = responseTimes.sort((a, b) => a - b);
        const stats = {
            fastest: sortedTimes[0] || 0,
            median: sortedTimes[Math.floor(sortedTimes.length / 2)] || 0,
            slowest: sortedTimes[sortedTimes.length - 1] || 0
        };
        
        return {
            monthly: Object.values(monthlyData),
            byClient: clientData,
            responseStats: stats
        };
    }
    
    processIssuesData(rawData) {
        if (!rawData || rawData.length < 2) return { monthly: [], byClient: {}, resolutionStats: { fastest: 0, median: 0, slowest: 0 } };
        
        const [headers, ...rows] = rawData;
        const monthlyData = {};
        const clientData = {};
        const resolutionTimes = [];
        
        rows.forEach(row => {
            const raisedDate = this.parseDate(row[5]);
            const resolvedDate = this.parseDate(row[20]);
            const client = row[2] || 'Unknown';
            
            if (!raisedDate) return;
            
            const monthKey = this.getMonthYear(raisedDate);
            if (!monthKey) return;
            
            // Initialize data structures
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { month: monthKey, raised: 0, resolved: 0 };
            }
            if (!clientData[client]) {
                clientData[client] = {};
            }
            if (!clientData[client][monthKey]) {
                clientData[client][monthKey] = { raised: 0, resolved: 0 };
            }
            
            monthlyData[monthKey].raised++;
            clientData[client][monthKey].raised++;
            
            if (resolvedDate) {
                monthlyData[monthKey].resolved++;
                clientData[client][monthKey].resolved++;
                
                const duration = this.calculateDuration(raisedDate, resolvedDate);
                resolutionTimes.push(duration);
            }
        });
        
        // Calculate resolution time statistics
        const sortedTimes = resolutionTimes.sort((a, b) => a - b);
        const stats = {
            fastest: sortedTimes[0] || 0,
            median: sortedTimes[Math.floor(sortedTimes.length / 2)] || 0,
            slowest: sortedTimes[sortedTimes.length - 1] || 0
        };
        
        return {
            monthly: Object.values(monthlyData),
            byClient: clientData,
            resolutionStats: stats
        };
    }
    
    async loadData() {
        if (this.isLoading) return;
        
        this.showLoading();
        
        try {
            // Fetch all sheets data
            const [misalignmentData, issuesData] = await Promise.all([
                this.fetchGoogleSheetData(this.SHEET_IDS.misalignment, 'Misalignment_Tracking!A:F'),
                this.fetchGoogleSheetData(this.SHEET_IDS.issues, 'Issues- Realtime!A:AH')
            ]);
            
            // Process the data
            const processedMisalignment = this.processMisalignmentData(misalignmentData);
            const processedVideoRequests = this.processVideoRequestData(issuesData);
            const processedIssues = this.processIssuesData(issuesData);
            
            // Calculate summary statistics
            const totalMisalignments = processedMisalignment.monthly.reduce((sum, item) => sum + item.raised, 0);
            const totalVideoRequests = processedVideoRequests.monthly.reduce((sum, item) => sum + item.requests, 0);
            const totalIssues = processedIssues.monthly.reduce((sum, item) => sum + item.raised, 0);
            
            this.data = {
                misalignments: processedMisalignment,
                videoRequests: processedVideoRequests,
                issues: processedIssues,
                summaryStats: {
                    totalMisalignments,
                    totalVideoRequests,
                    totalIssues,
                    avgResponseTime: processedVideoRequests.responseStats.median,
                    avgResolutionTime: processedIssues.resolutionStats.median
                }
            };
            
            this.updateUI();
            this.hideLoading();
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load data. Please check your internet connection and try again.');
        }
    }
    
    updateUI() {
        this.updateSummaryStats();
        this.updateCharts();
        this.updateTables();
    }
    
    updateSummaryStats() {
        const { summaryStats, videoRequests, issues } = this.data;
        
        // Overview stats
        document.getElementById('total-misalignments').textContent = summaryStats.totalMisalignments?.toLocaleString() || '0';
        document.getElementById('total-videos').textContent = summaryStats.totalVideoRequests?.toLocaleString() || '0';
        document.getElementById('total-issues').textContent = summaryStats.totalIssues?.toLocaleString() || '0';
        document.getElementById('avg-response').textContent = `${(summaryStats.avgResponseTime || 0).toFixed(1)}h`;
        document.getElementById('avg-resolution').textContent = `${(summaryStats.avgResolutionTime || 0).toFixed(1)}h`;
        
        // Video request stats
        document.getElementById('fastest-response').textContent = `${(videoRequests.responseStats.fastest || 0).toFixed(1)}h`;
        document.getElementById('median-response').textContent = `${(videoRequests.responseStats.median || 0).toFixed(1)}h`;
        document.getElementById('slowest-response').textContent = `${(videoRequests.responseStats.slowest || 0).toFixed(1)}h`;
        
        // Issue resolution stats
        document.getElementById('fastest-resolution').textContent = `${(issues.resolutionStats.fastest || 0).toFixed(1)}h`;
        document.getElementById('median-resolution').textContent = `${(issues.resolutionStats.median || 0).toFixed(1)}h`;
        document.getElementById('slowest-resolution').textContent = `${(issues.resolutionStats.slowest || 0).toFixed(1)}h`;
    }
    
    updateCharts() {
        // Destroy existing charts
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
        
        // Overview Chart
        this.createOverviewChart();
        
        // Misalignment Chart
        this.createMisalignmentChart();
        
        // Video Requests Chart
        this.createVideoRequestsChart();
        
        // Issues Chart
        this.createIssuesChart();
    }
    
    createOverviewChart() {
        const ctx = document.getElementById('overview-chart');
        if (!ctx) return;
        
        const data = this.data.misalignments.monthly;
        
        this.charts.overview = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.month),
                datasets: [
                    {
                        label: 'Misalignments Raised',
                        data: data.map(item => item.raised),
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Misalignments Resolved',
                        data: data.map(item => item.resolved),
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    createMisalignmentChart() {
        const ctx = document.getElementById('misalignment-chart');
        if (!ctx) return;
        
        const data = this.data.misalignments.monthly;
        
        this.charts.misalignment = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.month),
                datasets: [
                    {
                        label: 'Raised',
                        data: data.map(item => item.raised),
                        backgroundColor: '#e74c3c',
                        borderColor: '#c0392b',
                        borderWidth: 1
                    },
                    {
                        label: 'Resolved',
                        data: data.map(item => item.resolved),
                        backgroundColor: '#27ae60',
                        borderColor: '#229954',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    createVideoRequestsChart() {
        const ctx = document.getElementById('video-requests-chart');
        if (!ctx) return;
        
        const data = this.data.videoRequests.monthly;
        
        this.charts.videoRequests = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.month),
                datasets: [
                    {
                        label: 'Requests',
                        data: data.map(item => item.requests),
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.2)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Resolved',
                        data: data.map(item => item.resolved),
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.2)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    createIssuesChart() {
        const ctx = document.getElementById('issues-chart');
        if (!ctx) return;
        
        const data = this.data.issues.monthly;
        
        this.charts.issues = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.month),
                datasets: [
                    {
                        label: 'Raised',
                        data: data.map(item => item.raised),
                        backgroundColor: '#f39c12',
                        borderColor: '#e67e22',
                        borderWidth: 1
                    },
                    {
                        label: 'Resolved',
                        data: data.map(item => item.resolved),
                        backgroundColor: '#27ae60',
                        borderColor: '#229954',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    updateTables() {
        this.updateClientLists();
        this.updateVehicleTable();
    }
    
    updateClientLists() {
        // Top clients for misalignments
        const topClientsContainer = document.getElementById('top-clients');
        if (topClientsContainer) {
            const clientData = Object.entries(this.data.misalignments.byClient || {})
                .sort(([,a], [,b]) => {
                    const aTotal = Object.values(a).reduce((sum, month) => sum + month.raised, 0);
                    const bTotal = Object.values(b).reduce((sum, month) => sum + month.raised, 0);
                    return bTotal - aTotal;
                })
                .slice(0, 10);
            
            topClientsContainer.innerHTML = clientData.map(([client, months]) => {
                const total = Object.values(months).reduce((sum, month) => sum + month.raised, 0);
                return `
                    <div class="client-item">
                        <span class="client-name">${client}</span>
                        <span class="client-count text-red">${total}</span>
                    </div>
                `;
            }).join('');
        }
        
        // Video request clients
        const videoClientsContainer = document.getElementById('video-clients');
        if (videoClientsContainer) {
            const clientData = Object.entries(this.data.videoRequests.byClient || {})
                .sort(([,a], [,b]) => {
                    const aTotal = Object.values(a).reduce((sum, month) => sum + month.requests, 0);
                    const bTotal = Object.values(b).reduce((sum, month) => sum + month.requests, 0);
                    return bTotal - aTotal;
                });
            
            videoClientsContainer.innerHTML = clientData.map(([client, months]) => {
                const total = Object.values(months).reduce((sum, month) => sum + month.requests, 0);
                const resolved = Object.values(months).reduce((sum, month) => sum + month.resolved, 0);
                const percentage = total > 0 ? ((resolved / total) * 100).toFixed(1) : 0;
                return `
                    <div class="client-item">
                        <span class="client-name">${client}</span>
                        <div class="client-stats">
                            <span class="client-count text-blue">${total}</span>
                            <span class="client-percentage">(${percentage}% resolved)</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // Issue clients
        const issueClientsContainer = document.getElementById('issue-clients');
        if (issueClientsContainer) {
            const clientData = Object.entries(this.data.issues.byClient || {})
                .sort(([,a], [,b]) => {
                    const aTotal = Object.values(a).reduce((sum, month) => sum + month.raised, 0);
                    const bTotal = Object.values(b).reduce((sum, month) => sum + month.raised, 0);
                    return bTotal - aTotal;
                });
            
            issueClientsContainer.innerHTML = clientData.map(([client, months]) => {
                const total = Object.values(months).reduce((sum, month) => sum + month.raised, 0);
                const resolved = Object.values(months).reduce((sum, month) => sum + month.resolved, 0);
                const percentage = total > 0 ? ((resolved / total) * 100).toFixed(1) : 0;
                return `
                    <div class="client-item">
                        <span class="client-name">${client}</span>
                        <div class="client-stats">
                            <span class="client-count text-yellow">${total}</span>
                            <span class="client-percentage">(${percentage}% resolved)</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
    
    updateVehicleTable() {
        const tableBody = document.querySelector('#vehicle-table tbody');
        if (!tableBody) return;
        
        const vehicleData = Object.entries(this.data.misalignments.vehicleRepeats || {})
            .sort(([,a], [,b]) => b.count - a.count)
            .slice(0, 10);
        
        tableBody.innerHTML = vehicleData.map(([vehicle, info]) => `
            <tr>
                <td>${vehicle}</td>
                <td>${info.client}</td>
                <td><span class="table-cell-highlight">${info.count}</span></td>
                <td>${info.months.size}</td>
            </tr>
        `).join('');
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new VehicleMonitoringDashboard();
});
