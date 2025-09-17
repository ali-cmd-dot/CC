// Professional Dashboard Script
class TrackingDashboard {
    constructor() {
        this.apiKey = 'AIzaSyACruF4Qmzod8c0UlwfsBZlujoKguKsFDM';
        this.sheets = {
            misalignment: {
                id: '1GPDqOSURZNALalPzfHNbMft0HQ1c_fIkgfu_V3fSroY',
                range: 'Misalignment_Tracking!A:Z'
            },
            alerts: {
                id: '1GPDqOSURZNALalPzfHNbMft0HQ1c_fIkgfu_V3fSroY',
                range: 'Alert_Tracking!A:Z'
            },
            videos: {
                id: '1oHapc5HADod_2zPi0l1r8Ef2PjQlb4pfe-p9cKZFB2I',
                range: 'Issues- Realtime!A:Z'
            },
            issues: {
                id: '1oHapc5HADod_2zPi0l1r8Ef2PjQlb4pfe-p9cKZFB2I',
                range: 'Issues- Realtime!A:Z'
            }
        };
        this.data = {};
        this.charts = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAllData();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadAllData();
        });

        // Month selectors
        document.querySelectorAll('.month-selector').forEach(selector => {
            selector.addEventListener('change', (e) => {
                this.filterDataByMonth(e.target.id, e.target.value);
            });
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    async loadAllData() {
        this.showLoading(true);
        this.updateStatus('Loading data...', 'loading');

        try {
            await Promise.all([
                this.loadMisalignmentData(),
                this.loadAlertData(),
                this.loadVideoData(),
                this.loadIssueData()
            ]);

            this.renderDashboard();
            this.showLoading(false);
            this.updateStatus('Ready', 'success');
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load data. Please try again.');
            this.updateStatus('Error', 'error');
        }
    }

    async fetchSheetData(sheetConfig) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetConfig.id}/values/${sheetConfig.range}?key=${this.apiKey}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    async loadMisalignmentData() {
        try {
            const response = await this.fetchSheetData(this.sheets.misalignment);
            const rows = response.values || [];
            
            if (rows.length === 0) {
                this.data.misalignment = { processed: [], summary: {} };
                return;
            }

            const headers = rows[0];
            const dateIndex = this.findColumnIndex(headers, 'Date');
            const vehicleIndex = this.findColumnIndex(headers, 'Vehicle Numbers');
            const clientIndex = this.findColumnIndex(headers, 'Client Name');

            const processed = this.processMisalignmentData(rows.slice(1), { dateIndex, vehicleIndex, clientIndex });
            
            this.data.misalignment = {
                raw: rows,
                processed: processed,
                summary: this.generateMisalignmentSummary(processed)
            };
        } catch (error) {
            console.error('Error loading misalignment data:', error);
            this.data.misalignment = { processed: [], summary: {} };
        }
    }

    async loadAlertData() {
        try {
            const response = await this.fetchSheetData(this.sheets.alerts);
            const rows = response.values || [];
            
            if (rows.length === 0) {
                this.data.alerts = { processed: [], summary: {} };
                return;
            }

            const headers = rows[0];
            const dateIndex = this.findColumnIndex(headers, 'Date');
            const alertTypeIndex = this.findColumnIndex(headers, 'Alert Type');
            const clientIndex = this.findColumnIndex(headers, 'Client Name');

            const processed = this.processAlertData(rows.slice(1), { dateIndex, alertTypeIndex, clientIndex });
            
            this.data.alerts = {
                raw: rows,
                processed: processed,
                summary: this.generateAlertSummary(processed)
            };
        } catch (error) {
            console.error('Error loading alert data:', error);
            this.data.alerts = { processed: [], summary: {} };
        }
    }

    async loadVideoData() {
        try {
            const response = await this.fetchSheetData(this.sheets.videos);
            const rows = response.values || [];
            
            if (rows.length === 0) {
                this.data.videos = { processed: [], summary: {} };
                return;
            }

            const headers = rows[0];
            const raisedIndex = this.findColumnIndex(headers, 'Timestamp Issues Raised');
            const resolvedIndex = this.findColumnIndex(headers, 'Timestamp Issues Resolved');
            const issueIndex = this.findColumnIndex(headers, 'Issue');
            const clientIndex = this.findColumnIndex(headers, 'Client');

            const processed = this.processVideoData(rows.slice(1), { raisedIndex, resolvedIndex, issueIndex, clientIndex });
            
            this.data.videos = {
                raw: rows,
                processed: processed,
                summary: this.generateVideoSummary(processed)
            };
        } catch (error) {
            console.error('Error loading video data:', error);
            this.data.videos = { processed: [], summary: {} };
        }
    }

    async loadIssueData() {
        try {
            const response = await this.fetchSheetData(this.sheets.issues);
            const rows = response.values || [];
            
            if (rows.length === 0) {
                this.data.issues = { processed: [], summary: {} };
                return;
            }

            const headers = rows[0];
            const raisedIndex = this.findColumnIndex(headers, 'Timestamp Issues Raised');
            const resolvedIndex = this.findColumnIndex(headers, 'Timestamp Issues Resolved');
            const clientIndex = this.findColumnIndex(headers, 'Client');

            const processed = this.processIssueData(rows.slice(1), { raisedIndex, resolvedIndex, clientIndex });
            
            this.data.issues = {
                raw: rows,
                processed: processed,
                summary: this.generateIssueSummary(processed)
            };
        } catch (error) {
            console.error('Error loading issue data:', error);
            this.data.issues = { processed: [], summary: {} };
        }
    }

    findColumnIndex(headers, columnName) {
        const index = headers.findIndex(header => 
            header && header.toLowerCase().includes(columnName.toLowerCase())
        );
        return index !== -1 ? index : 0;
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        
        // Handle various date formats
        const formats = [
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // DD/MM/YYYY or MM/DD/YYYY
            /(\d{1,2})\/(\d{1,2})\/(\d{2})/,  // DD/MM/YY or MM/DD/YY
            /(\d{4})-(\d{1,2})-(\d{1,2})/,    // YYYY-MM-DD
            /(\d{1,2})-(\d{1,2})-(\d{4})/     // DD-MM-YYYY
        ];

        for (let format of formats) {
            const match = dateStr.match(format);
            if (match) {
                if (match[3].length === 2) {
                    // Convert YY to YYYY
                    match[3] = '20' + match[3];
                }
                
                // Assume DD/MM/YYYY format for ambiguous cases
                const day = parseInt(match[1]);
                const month = parseInt(match[2]);
                const year = parseInt(match[3]);
                
                if (day <= 12 && month > 12) {
                    // MM/DD/YYYY format
                    return new Date(year, day - 1, month);
                } else {
                    // DD/MM/YYYY format
                    return new Date(year, month - 1, day);
                }
            }
        }
        
        // Try standard Date parsing as fallback
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    }

    processMisalignmentData(rows, indices) {
        const processed = [];
        const vehicleTracker = new Map(); // Track vehicle appearances by date
        
        rows.forEach(row => {
            if (!row[indices.dateIndex]) return;
            
            const date = this.parseDate(row[indices.dateIndex]);
            if (!date) return;
            
            const vehicles = row[indices.vehicleIndex] ? 
                row[indices.vehicleIndex].split(',').map(v => v.trim()).filter(v => v) : [];
            const client = row[indices.clientIndex] || 'Unknown';
            
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const dateKey = date.toISOString().split('T')[0];
            
            // Track vehicles for misalignment detection
            if (!vehicleTracker.has(dateKey)) {
                vehicleTracker.set(dateKey, new Set());
            }
            
            vehicles.forEach(vehicle => {
                vehicleTracker.get(dateKey).add(vehicle);
                
                processed.push({
                    date: date,
                    dateKey: dateKey,
                    monthYear: monthYear,
                    vehicle: vehicle,
                    client: client,
                    type: 'raised'
                });
            });
        });
        
        // Detect rectified vehicles (vehicles that appear one day but not the next)
        const sortedDates = Array.from(vehicleTracker.keys()).sort();
        const rectified = [];
        
        for (let i = 0; i < sortedDates.length - 1; i++) {
            const currentDate = sortedDates[i];
            const nextDate = sortedDates[i + 1];
            const currentVehicles = vehicleTracker.get(currentDate);
            const nextVehicles = vehicleTracker.get(nextDate);
            
            currentVehicles.forEach(vehicle => {
                if (!nextVehicles.has(vehicle)) {
                    const nextDateObj = new Date(nextDate);
                    const monthYear = `${nextDateObj.getFullYear()}-${String(nextDateObj.getMonth() + 1).padStart(2, '0')}`;
                    
                    rectified.push({
                        date: nextDateObj,
                        dateKey: nextDate,
                        monthYear: monthYear,
                        vehicle: vehicle,
                        client: this.getClientForVehicle(processed, vehicle),
                        type: 'rectified'
                    });
                }
            });
        }
        
        return [...processed, ...rectified];
    }

    getClientForVehicle(processed, vehicle) {
        const entry = processed.find(p => p.vehicle === vehicle);
        return entry ? entry.client : 'Unknown';
    }

    processAlertData(rows, indices) {
        const processed = [];
        
        rows.forEach(row => {
            if (!row[indices.dateIndex] || !row[indices.alertTypeIndex]) return;
            
            const date = this.parseDate(row[indices.dateIndex]);
            if (!date) return;
            
            const alertType = row[indices.alertTypeIndex].trim();
            
            // Skip "No L2 alerts found"
            if (alertType.toLowerCase().includes('no l2 alerts found')) return;
            
            const client = row[indices.clientIndex] || 'Unknown';
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            processed.push({
                date: date,
                monthYear: monthYear,
                alertType: alertType,
                client: client
            });
        });
        
        return processed;
    }

    processVideoData(rows, indices) {
        const processed = [];
        
        rows.forEach(row => {
            if (!row[indices.raisedIndex] || !row[indices.issueIndex]) return;
            
            const issue = row[indices.issueIndex].trim();
            
            // Only process "Historical Video Request"
            if (!issue.toLowerCase().includes('historical video request')) return;
            
            const raisedDate = this.parseDate(row[indices.raisedIndex]);
            if (!raisedDate) return;
            
            const resolvedDate = row[indices.resolvedIndex] ? this.parseDate(row[indices.resolvedIndex]) : null;
            const client = row[indices.clientIndex] || 'Unknown';
            const monthYear = `${raisedDate.getFullYear()}-${String(raisedDate.getMonth() + 1).padStart(2, '0')}`;
            
            let responseTime = null;
            if (resolvedDate) {
                responseTime = Math.abs(resolvedDate.getTime() - raisedDate.getTime()) / (1000 * 60 * 60); // hours
            }
            
            processed.push({
                raisedDate: raisedDate,
                resolvedDate: resolvedDate,
                monthYear: monthYear,
                client: client,
                responseTime: responseTime,
                status: resolvedDate ? 'resolved' : 'pending'
            });
        });
        
        return processed;
    }

    processIssueData(rows, indices) {
        const processed = [];
        
        rows.forEach(row => {
            if (!row[indices.raisedIndex]) return;
            
            const raisedDate = this.parseDate(row[indices.raisedIndex]);
            if (!raisedDate) return;
            
            const resolvedDate = row[indices.resolvedIndex] ? this.parseDate(row[indices.resolvedIndex]) : null;
            const client = row[indices.clientIndex] || 'Unknown';
            const monthYear = `${raisedDate.getFullYear()}-${String(raisedDate.getMonth() + 1).padStart(2, '0')}`;
            
            let resolutionTime = null;
            if (resolvedDate) {
                resolutionTime = Math.abs(resolvedDate.getTime() - raisedDate.getTime()) / (1000 * 60 * 60); // hours
            }
            
            processed.push({
                raisedDate: raisedDate,
                resolvedDate: resolvedDate,
                monthYear: monthYear,
                client: client,
                resolutionTime: resolutionTime,
                status: resolvedDate ? 'resolved' : 'pending'
            });
        });
        
        return processed;
    }

    generateMisalignmentSummary(data) {
        const summary = {
            monthly: {},
            clientMonthly: {},
            vehicleFrequency: {},
            totalMisalignments: 0,
            totalRectified: 0
        };
        
        data.forEach(item => {
            // Monthly summary
            if (!summary.monthly[item.monthYear]) {
                summary.monthly[item.monthYear] = { raised: 0, rectified: 0 };
            }
            
            if (item.type === 'raised') {
                summary.monthly[item.monthYear].raised++;
                summary.totalMisalignments++;
            } else {
                summary.monthly[item.monthYear].rectified++;
                summary.totalRectified++;
            }
            
            // Client monthly summary
            const clientKey = `${item.client}-${item.monthYear}`;
            if (!summary.clientMonthly[clientKey]) {
                summary.clientMonthly[clientKey] = {
                    client: item.client,
                    month: item.monthYear,
                    raised: 0,
                    rectified: 0,
                    vehicles: new Set()
                };
            }
            
            if (item.type === 'raised') {
                summary.clientMonthly[clientKey].raised++;
                summary.clientMonthly[clientKey].vehicles.add(item.vehicle);
            } else {
                summary.clientMonthly[clientKey].rectified++;
            }
            
            // Vehicle frequency
            if (item.type === 'raised') {
                const vehicleKey = `${item.client}-${item.vehicle}`;
                if (!summary.vehicleFrequency[vehicleKey]) {
                    summary.vehicleFrequency[vehicleKey] = {
                        client: item.client,
                        vehicle: item.vehicle,
                        count: 0
                    };
                }
                summary.vehicleFrequency[vehicleKey].count++;
            }
        });
        
        return summary;
    }

    generateAlertSummary(data) {
        const summary = {
            monthly: {},
            clientMonthly: {},
            totalAlerts: data.length
        };
        
        data.forEach(item => {
            // Monthly summary
            if (!summary.monthly[item.monthYear]) {
                summary.monthly[item.monthYear] = 0;
            }
            summary.monthly[item.monthYear]++;
            
            // Client monthly summary
            const clientKey = `${item.client}-${item.monthYear}`;
            if (!summary.clientMonthly[clientKey]) {
                summary.clientMonthly[clientKey] = {
                    client: item.client,
                    month: item.monthYear,
                    count: 0
                };
            }
            summary.clientMonthly[clientKey].count++;
        });
        
        return summary;
    }

    generateVideoSummary(data) {
        const summary = {
            monthly: {},
            clientMonthly: {},
            totalRequests: data.length,
            responseTimes: {
                fastest: null,
                slowest: null,
                average: null,
                all: []
            }
        };
        
        const validResponseTimes = data.filter(item => item.responseTime !== null).map(item => item.responseTime);
        
        if (validResponseTimes.length > 0) {
            summary.responseTimes.fastest = Math.min(...validResponseTimes);
            summary.responseTimes.slowest = Math.max(...validResponseTimes);
            summary.responseTimes.average = validResponseTimes.reduce((a, b) => a + b, 0) / validResponseTimes.length;
            summary.responseTimes.all = validResponseTimes;
        }
        
        data.forEach(item => {
            // Monthly summary
            if (!summary.monthly[item.monthYear]) {
                summary.monthly[item.monthYear] = { total: 0, resolved: 0 };
            }
            summary.monthly[item.monthYear].total++;
            if (item.status === 'resolved') {
                summary.monthly[item.monthYear].resolved++;
            }
            
            // Client monthly summary
            const clientKey = `${item.client}-${item.monthYear}`;
            if (!summary.clientMonthly[clientKey]) {
                summary.clientMonthly[clientKey] = {
                    client: item.client,
                    month: item.monthYear,
                    total: 0,
                    resolved: 0,
                    responseTimes: []
                };
            }
            summary.clientMonthly[clientKey].total++;
            if (item.status === 'resolved') {
                summary.clientMonthly[clientKey].resolved++;
                if (item.responseTime !== null) {
                    summary.clientMonthly[clientKey].responseTimes.push(item.responseTime);
                }
            }
        });
        
        return summary;
    }

    generateIssueSummary(data) {
        const summary = {
            monthly: {},
            clientMonthly: {},
            totalIssues: data.length,
            resolutionTimes: {
                fastest: null,
                slowest: null,
                average: null,
                all: []
            }
        };
        
        const validResolutionTimes = data.filter(item => item.resolutionTime !== null).map(item => item.resolutionTime);
        
        if (validResolutionTimes.length > 0) {
            summary.resolutionTimes.fastest = Math.min(...validResolutionTimes);
            summary.resolutionTimes.slowest = Math.max(...validResolutionTimes);
            summary.resolutionTimes.average = validResolutionTimes.reduce((a, b) => a + b, 0) / validResolutionTimes.length;
            summary.resolutionTimes.all = validResolutionTimes;
        }
        
        data.forEach(item => {
            // Monthly summary
            if (!summary.monthly[item.monthYear]) {
                summary.monthly[item.monthYear] = { total: 0, resolved: 0 };
            }
            summary.monthly[item.monthYear].total++;
            if (item.status === 'resolved') {
                summary.monthly[item.monthYear].resolved++;
            }
            
            // Client monthly summary
            const clientKey = `${item.client}-${item.monthYear}`;
            if (!summary.clientMonthly[clientKey]) {
                summary.clientMonthly[clientKey] = {
                    client: item.client,
                    month: item.monthYear,
                    total: 0,
                    resolved: 0,
                    resolutionTimes: []
                };
            }
            summary.clientMonthly[clientKey].total++;
            if (item.status === 'resolved') {
                summary.clientMonthly[clientKey].resolved++;
                if (item.resolutionTime !== null) {
                    summary.clientMonthly[clientKey].resolutionTimes.push(item.resolutionTime);
                }
            }
        });
        
        return summary;
    }

    renderDashboard() {
        this.updateSummaryCards();
        this.populateMonthSelectors();
        this.renderCharts();
        this.renderTables();
        this.renderStats();
    }

    updateSummaryCards() {
        const currentMonth = new Date().toISOString().slice(0, 7);
        
        // Misalignments
        const misalignmentCount = this.data.misalignment.summary.monthly[currentMonth]?.raised || 0;
        document.getElementById('totalMisalignments').textContent = misalignmentCount;
        
        // Alerts
        const alertCount = this.data.alerts.summary.monthly[currentMonth] || 0;
        document.getElementById('totalAlerts').textContent = alertCount;
        
        // Videos
        const videoCount = this.data.videos.summary.monthly[currentMonth]?.total || 0;
        document.getElementById('totalVideos').textContent = videoCount;
        
        // Issues
        const issueCount = this.data.issues.summary.monthly[currentMonth]?.total || 0;
        document.getElementById('totalIssues').textContent = issueCount;
    }

    populateMonthSelectors() {
        const allMonths = new Set();
        
        // Collect all months from all datasets
        Object.keys(this.data.misalignment.summary.monthly || {}).forEach(month => allMonths.add(month));
        Object.keys(this.data.alerts.summary.monthly || {}).forEach(month => allMonths.add(month));
        Object.keys(this.data.videos.summary.monthly || {}).forEach(month => allMonths.add(month));
        Object.keys(this.data.issues.summary.monthly || {}).forEach(month => allMonths.add(month));
        
        const sortedMonths = Array.from(allMonths).sort().reverse();
        
        document.querySelectorAll('.month-selector').forEach(selector => {
            selector.innerHTML = '<option value="all">All Months</option>';
            sortedMonths.forEach(month => {
                const option = document.createElement('option');
                option.value = month;
                option.textContent = new Date(month + '-01').toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                });
                selector.appendChild(option);
            });
        });
    }

    renderCharts() {
        this.renderMisalignmentChart();
        this.renderAlertChart();
        this.renderVideoChart();
        this.renderIssueChart();
    }

    renderMisalignmentChart() {
        const ctx = document.getElementById('misalignmentChart').getContext('2d');
        
        if (this.charts.misalignment) {
            this.charts.misalignment.destroy();
        }
        
        const monthlyData = this.data.misalignment.summary.monthly;
        const labels = Object.keys(monthlyData).sort();
        const raisedData = labels.map(month => monthlyData[month].raised);
        const rectifiedData = labels.map(month => monthlyData[month].rectified);
        
        this.charts.misalignment = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(month => new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })),
                datasets: [{
                    label: 'Raised',
                    data: raisedData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Rectified',
                    data: rectifiedData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
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

    renderAlertChart() {
        const ctx = document.getElementById('alertChart').getContext('2d');
        
        if (this.charts.alert) {
            this.charts.alert.destroy();
        }
        
        const monthlyData = this.data.alerts.summary.monthly;
        const labels = Object.keys(monthlyData).sort();
        const alertData = labels.map(month => monthlyData[month]);
        
        this.charts.alert = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.map(month => new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })),
                datasets: [{
                    label: 'Alerts',
                    data: alertData,
                    backgroundColor: '#ef4444',
                    borderColor: '#dc2626',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
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

    renderVideoChart() {
        const ctx = document.getElementById('videoChart').getContext('2d');
        
        if (this.charts.video) {
            this.charts.video.destroy();
        }
        
        const monthlyData = this.data.videos.summary.monthly;
        const labels = Object.keys(monthlyData).sort();
        const totalData = labels.map(month => monthlyData[month].total);
        const resolvedData = labels.map(month => monthlyData[month].resolved);
        
        this.charts.video = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.map(month => new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })),
                datasets: [{
                    label: 'Total Requests',
                    data: totalData,
                    backgroundColor: '#06b6d4',
                    borderColor: '#0891b2',
                    borderWidth: 1
                }, {
                    label: 'Resolved',
                    data: resolvedData,
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
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

    renderIssueChart() {
        const ctx = document.getElementById('issueChart').getContext('2d');
        
        if (this.charts.issue) {
            this.charts.issue.destroy();
        }
        
        const monthlyData = this.data.issues.summary.monthly;
        const labels = Object.keys(monthlyData).sort();
        const totalData = labels.map(month => monthlyData[month].total);
        const resolvedData = labels.map(month => monthlyData[month].resolved);
        
        this.charts.issue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(month => new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })),
                datasets: [{
                    label: 'Total Issues',
                    data: totalData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Resolved',
                    data: resolvedData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
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

    renderStats() {
        this.renderMisalignmentStats();
        this.renderAlertStats();
        this.renderVideoStats();
        this.renderIssueStats();
    }

    renderMisalignmentStats() {
        const stats = this.data.misalignment.summary;
        const container = document.getElementById('misalignmentStats');
        
        const avgDaily = stats.totalMisalignments / Math.max(Object.keys(stats.monthly).length * 30, 1);
        const rectificationRate = stats.totalRectified / Math.max(stats.totalMisalignments, 1) * 100;
        
        container.innerHTML = `
            <div class="stat-item">
                <div class="stat-label">Total Misalignments</div>
                <div class="stat-value">${stats.totalMisalignments}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Total Rectified</div>
                <div class="stat-value">${stats.totalRectified}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Rectification Rate</div>
                <div class="stat-value">${rectificationRate.toFixed(1)}%</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Avg Daily</div>
                <div class="stat-value">${avgDaily.toFixed(1)}</div>
            </div>
        `;
    }

    renderAlertStats() {
        const stats = this.data.alerts.summary;
        const container = document.getElementById('alertStats');
        
        const monthlyValues = Object.values(stats.monthly);
        const avgMonthly = monthlyValues.reduce((a, b) => a + b, 0) / Math.max(monthlyValues.length, 1);
        const peakMonth = Math.max(...monthlyValues, 0);
        
        container.innerHTML = `
            <div class="stat-item">
                <div class="stat-label">Total Alerts</div>
                <div class="stat-value">${stats.totalAlerts}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Avg Monthly</div>
                <div class="stat-value">${avgMonthly.toFixed(0)}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Peak Month</div>
                <div class="stat-value">${peakMonth}</div>
            </div>
        `;
    }

    renderVideoStats() {
        const stats = this.data.videos.summary;
        const container = document.getElementById('videoStats');
        
        const formatTime = (hours) => {
            if (hours < 1) return `${(hours * 60).toFixed(0)} min`;
            if (hours < 24) return `${hours.toFixed(1)} hrs`;
            return `${(hours / 24).toFixed(1)} days`;
        };
        
        container.innerHTML = `
            <div class="stat-item">
                <div class="stat-label">Total Requests</div>
                <div class="stat-value">${stats.totalRequests}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Fastest Response</div>
                <div class="stat-value">${stats.responseTimes.fastest ? formatTime(stats.responseTimes.fastest) : 'N/A'}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Average Response</div>
                <div class="stat-value">${stats.responseTimes.average ? formatTime(stats.responseTimes.average) : 'N/A'}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Slowest Response</div>
                <div class="stat-value">${stats.responseTimes.slowest ? formatTime(stats.responseTimes.slowest) : 'N/A'}</div>
            </div>
        `;
    }

    renderIssueStats() {
        const stats = this.data.issues.summary;
        const container = document.getElementById('issueStats');
        
        const formatTime = (hours) => {
            if (hours < 1) return `${(hours * 60).toFixed(0)} min`;
            if (hours < 24) return `${hours.toFixed(1)} hrs`;
            return `${(hours / 24).toFixed(1)} days`;
        };
        
        const monthlyValues = Object.values(stats.monthly);
        const totalResolved = monthlyValues.reduce((sum, month) => sum + month.resolved, 0);
        const resolutionRate = totalResolved / Math.max(stats.totalIssues, 1) * 100;
        
        container.innerHTML = `
            <div class="stat-item">
                <div class="stat-label">Total Issues</div>
                <div class="stat-value">${stats.totalIssues}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Resolution Rate</div>
                <div class="stat-value">${resolutionRate.toFixed(1)}%</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Fastest Resolution</div>
                <div class="stat-value">${stats.resolutionTimes.fastest ? formatTime(stats.resolutionTimes.fastest) : 'N/A'}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Average Resolution</div>
                <div class="stat-value">${stats.resolutionTimes.average ? formatTime(stats.resolutionTimes.average) : 'N/A'}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Slowest Resolution</div>
                <div class="stat-value">${stats.resolutionTimes.slowest ? formatTime(stats.resolutionTimes.slowest) : 'N/A'}</div>
            </div>
        `;
    }

    renderTables() {
        this.renderMisalignmentTable();
        this.renderAlertTable();
        this.renderVideoTable();
        this.renderIssueTable();
    }

    renderMisalignmentTable() {
        const tbody = document.querySelector('#misalignmentTable tbody');
        const clientData = this.data.misalignment.summary.clientMonthly;
        const vehicleFreq = this.data.misalignment.summary.vehicleFrequency;
        
        tbody.innerHTML = '';
        
        Object.values(clientData).forEach(item => {
            // Find most frequent vehicle for this client
            const clientVehicles = Object.values(vehicleFreq)
                .filter(v => v.client === item.client)
                .sort((a, b) => b.count - a.count);
            
            const mostFrequentVehicle = clientVehicles[0] || { vehicle: 'N/A', count: 0 };
            
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${item.client}</td>
                <td>${new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
                <td>${item.raised}</td>
                <td>${item.rectified}</td>
                <td>${item.raised - item.rectified}</td>
                <td>${mostFrequentVehicle.vehicle} (${mostFrequentVehicle.count}x)</td>
            `;
        });
    }

    renderAlertTable() {
        const tbody = document.querySelector('#alertTable tbody');
        const clientData = this.data.alerts.summary.clientMonthly;
        
        tbody.innerHTML = '';
        
        Object.values(clientData).forEach(item => {
            const avgDaily = item.count / 30; // Approximate daily average
            
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${item.client}</td>
                <td>${new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
                <td>${item.count}</td>
                <td>${avgDaily.toFixed(1)}</td>
                <td>${item.count}</td>
            `;
        });
    }

    renderVideoTable() {
        const tbody = document.querySelector('#videoTable tbody');
        const clientData = this.data.videos.summary.clientMonthly;
        
        const formatTime = (hours) => {
            if (!hours) return 'N/A';
            if (hours < 1) return `${(hours * 60).toFixed(0)} min`;
            if (hours < 24) return `${hours.toFixed(1)} hrs`;
            return `${(hours / 24).toFixed(1)} days`;
        };
        
        tbody.innerHTML = '';
        
        Object.values(clientData).forEach(item => {
            const avgResponseTime = item.responseTimes.length > 0 
                ? item.responseTimes.reduce((a, b) => a + b, 0) / item.responseTimes.length
                : null;
            
            const fastestResponse = item.responseTimes.length > 0 
                ? Math.min(...item.responseTimes)
                : null;
                
            const slowestResponse = item.responseTimes.length > 0 
                ? Math.max(...item.responseTimes)
                : null;
            
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${item.client}</td>
                <td>${new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
                <td>${item.total}</td>
                <td>${formatTime(avgResponseTime)}</td>
                <td>${formatTime(fastestResponse)}</td>
                <td>${formatTime(slowestResponse)}</td>
            `;
        });
    }

    renderIssueTable() {
        const tbody = document.querySelector('#issueTable tbody');
        const clientData = this.data.issues.summary.clientMonthly;
        
        const formatTime = (hours) => {
            if (!hours) return 'N/A';
            if (hours < 1) return `${(hours * 60).toFixed(0)} min`;
            if (hours < 24) return `${hours.toFixed(1)} hrs`;
            return `${(hours / 24).toFixed(1)} days`;
        };
        
        tbody.innerHTML = '';
        
        Object.values(clientData).forEach(item => {
            const avgResolutionTime = item.resolutionTimes.length > 0 
                ? item.resolutionTimes.reduce((a, b) => a + b, 0) / item.resolutionTimes.length
                : null;
            
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${item.client}</td>
                <td>${new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
                <td>${item.total}</td>
                <td>${item.resolved}</td>
                <td>${item.total - item.resolved}</td>
                <td>${formatTime(avgResolutionTime)}</td>
            `;
        });
    }

    filterDataByMonth(selectorId, selectedMonth) {
        // This method can be expanded to filter charts and tables by selected month
        // For now, it's a placeholder for future functionality
        console.log(`Filtering ${selectorId} by month: ${selectedMonth}`);
    }

    showLoading(show) {
        const loadingScreen = document.getElementById('loadingScreen');
        const dashboardMain = document.getElementById('dashboardMain');
        const errorMessage = document.getElementById('errorMessage');
        
        if (show) {
            loadingScreen.style.display = 'flex';
            dashboardMain.style.display = 'none';
            errorMessage.style.display = 'none';
        } else {
            loadingScreen.style.display = 'none';
            dashboardMain.style.display = 'block';
            errorMessage.style.display = 'none';
        }
    }

    showError(message) {
        const loadingScreen = document.getElementById('loadingScreen');
        const dashboardMain = document.getElementById('dashboardMain');
        const errorMessage = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        loadingScreen.style.display = 'none';
        dashboardMain.style.display = 'none';
        errorMessage.style.display = 'flex';
        errorText.textContent = message;
    }

    updateStatus(text, type) {
        const statusText = document.getElementById('statusText');
        const statusDot = document.getElementById('statusDot');
        
        statusText.textContent = text;
        
        statusDot.className = 'status-dot';
        switch (type) {
            case 'loading':
                statusDot.style.background = '#f59e0b';
                break;
            case 'success':
                statusDot.style.background = '#10b981';
                break;
            case 'error':
                statusDot.style.background = '#ef4444';
                break;
            default:
                statusDot.style.background = '#6b7280';
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TrackingDashboard();
});

// Handle window resize for responsive charts
window.addEventListener('resize', () => {
    // Chart.js will automatically handle resize, but we can add custom logic here if needed
    setTimeout(() => {
        Object.values(window.dashboard?.charts || {}).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }, 100);
});
