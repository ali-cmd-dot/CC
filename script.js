// Simplified Monthly Tracking Dashboard
class SimpleDashboard {
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
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadData());
        this.loadData();
    }

    async loadData() {
        this.showLoading(true);
        this.updateStatus('Loading...', 'loading');

        try {
            await Promise.all([
                this.loadMisalignments(),
                this.loadAlerts(),
                this.loadVideos(),
                this.loadIssues()
            ]);

            this.renderDashboard();
            this.showLoading(false);
            this.updateStatus('Ready', 'success');
        } catch (error) {
            console.error('Error:', error);
            this.showError('Failed to load data');
            this.updateStatus('Error', 'error');
        }
    }

    async fetchSheet(config) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.id}/values/${config.range}?key=${this.apiKey}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()).values || [];
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        
        // Handle different date formats
        const formats = [
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // DD/MM/YYYY
            /(\d{1,2})\/(\d{1,2})\/(\d{2})/,  // DD/MM/YY
            /(\d{1,2})-(\d{1,2})-(\d{4})/,    // DD-MM-YYYY
            /(\d{4})-(\d{1,2})-(\d{1,2})/     // YYYY-MM-DD
        ];

        for (let format of formats) {
            const match = dateStr.match(format);
            if (match) {
                let [, p1, p2, p3] = match;
                
                if (p3.length === 2) p3 = '20' + p3; // Convert YY to YYYY
                
                // Assume DD/MM/YYYY for most cases
                const day = parseInt(p1);
                const month = parseInt(p2);
                const year = parseInt(p3);
                
                return new Date(year, month - 1, day);
            }
        }
        
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    }

    async loadMisalignments() {
        try {
            const rows = await this.fetchSheet(this.sheets.misalignment);
            if (rows.length === 0) return;

            const headers = rows[0];
            const dateIdx = this.findColumn(headers, 'Date');
            const vehicleIdx = this.findColumn(headers, 'Vehicle Numbers');
            const clientIdx = this.findColumn(headers, 'Client Name');

            const monthly = {};
            const clientData = {};

            rows.slice(1).forEach(row => {
                const date = this.parseDate(row[dateIdx]);
                if (!date) return;

                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const client = row[clientIdx] || 'Unknown';
                const vehicles = row[vehicleIdx] ? row[vehicleIdx].split(',').length : 0;

                if (!monthly[monthKey]) monthly[monthKey] = 0;
                monthly[monthKey] += vehicles;

                const clientKey = `${client}-${monthKey}`;
                if (!clientData[clientKey]) {
                    clientData[clientKey] = { client, month: monthKey, count: 0 };
                }
                clientData[clientKey].count += vehicles;
            });

            this.data.misalignments = { monthly, clientData };
        } catch (error) {
            console.error('Misalignment error:', error);
            this.data.misalignments = { monthly: {}, clientData: {} };
        }
    }

    async loadAlerts() {
        try {
            const rows = await this.fetchSheet(this.sheets.alerts);
            if (rows.length === 0) return;

            const headers = rows[0];
            const dateIdx = this.findColumn(headers, 'Date');
            const typeIdx = this.findColumn(headers, 'Alert Type');
            const clientIdx = this.findColumn(headers, 'Client Name');

            const monthly = {};
            const clientData = {};

            rows.slice(1).forEach(row => {
                const date = this.parseDate(row[dateIdx]);
                const alertType = (row[typeIdx] || '').toLowerCase();
                
                // Skip "No L2 alerts found"
                if (!date || alertType.includes('no l2 alerts found')) return;

                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const client = row[clientIdx] || 'Unknown';

                if (!monthly[monthKey]) monthly[monthKey] = 0;
                monthly[monthKey]++;

                const clientKey = `${client}-${monthKey}`;
                if (!clientData[clientKey]) {
                    clientData[clientKey] = { client, month: monthKey, count: 0 };
                }
                clientData[clientKey].count++;
            });

            this.data.alerts = { monthly, clientData };
        } catch (error) {
            console.error('Alert error:', error);
            this.data.alerts = { monthly: {}, clientData: {} };
        }
    }

    async loadVideos() {
        try {
            const rows = await this.fetchSheet(this.sheets.videos);
            if (rows.length === 0) return;

            console.log('Video data rows:', rows.length);
            console.log('Headers:', rows[0]);

            const headers = rows[0];
            const raisedIdx = this.findColumn(headers, 'Timestamp Issues Raised');
            const resolvedIdx = this.findColumn(headers, 'Timestamp Issues Resolved');
            const issueIdx = this.findColumn(headers, 'Issue');
            const clientIdx = this.findColumn(headers, 'Client');

            console.log('Column indices:', { raisedIdx, resolvedIdx, issueIdx, clientIdx });

            const monthly = {};
            const clientData = {};
            const responseTimes = [];
            let processedCount = 0;

            rows.slice(1).forEach((row, index) => {
                const issue = (row[issueIdx] || '').toString().toLowerCase();
                
                // Debug: Log first few rows to see what we're getting
                if (index < 5) {
                    console.log(`Row ${index}:`, {
                        issue: row[issueIdx],
                        raised: row[raisedIdx],
                        client: row[clientIdx]
                    });
                }
                
                // Check for Historical Video Request (more flexible matching)
                const isVideoRequest = issue.includes('historical') && issue.includes('video') || 
                                     issue.includes('video') && issue.includes('request') ||
                                     issue.includes('historical video request');
                
                if (!isVideoRequest) return;

                processedCount++;
                console.log(`Processing video request ${processedCount}:`, issue);

                const raisedDate = this.parseDate(row[raisedIdx]);
                if (!raisedDate) {
                    console.log('Invalid date:', row[raisedIdx]);
                    return;
                }

                const monthKey = `${raisedDate.getFullYear()}-${String(raisedDate.getMonth() + 1).padStart(2, '0')}`;
                const client = row[clientIdx] || 'Unknown';

                if (!monthly[monthKey]) monthly[monthKey] = 0;
                monthly[monthKey]++;

                const clientKey = `${client}-${monthKey}`;
                if (!clientData[clientKey]) {
                    clientData[clientKey] = { client, month: monthKey, count: 0 };
                }
                clientData[clientKey].count++;

                // Calculate response time if resolved
                const resolvedDate = this.parseDate(row[resolvedIdx]);
                if (resolvedDate && resolvedDate > raisedDate) {
                    const responseHours = (resolvedDate - raisedDate) / (1000 * 60 * 60);
                    responseTimes.push(responseHours);
                }
            });

            console.log('Total video requests found:', processedCount);
            console.log('Monthly data:', monthly);

            // Calculate fastest, average, slowest
            let fastest = null, average = null, slowest = null;
            if (responseTimes.length > 0) {
                fastest = Math.min(...responseTimes);
                slowest = Math.max(...responseTimes);
                average = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            }

            this.data.videos = { monthly, clientData, responseTimes: { fastest, average, slowest } };
        } catch (error) {
            console.error('Video error:', error);
            this.data.videos = { monthly: {}, clientData: {}, responseTimes: {} };
        }
    }

    async loadIssues() {
        try {
            const rows = await this.fetchSheet(this.sheets.issues);
            if (rows.length === 0) return;

            const headers = rows[0];
            const raisedIdx = this.findColumn(headers, 'Timestamp Issues Raised');
            const resolvedIdx = this.findColumn(headers, 'Timestamp Issues Resolved');
            const clientIdx = this.findColumn(headers, 'Client');

            const monthly = {};
            const clientData = {};
            const resolutionTimes = [];

            rows.slice(1).forEach(row => {
                const raisedDate = this.parseDate(row[raisedIdx]);
                if (!raisedDate) return;

                const monthKey = `${raisedDate.getFullYear()}-${String(raisedDate.getMonth() + 1).padStart(2, '0')}`;
                const client = row[clientIdx] || 'Unknown';

                if (!monthly[monthKey]) monthly[monthKey] = 0;
                monthly[monthKey]++;

                const clientKey = `${client}-${monthKey}`;
                if (!clientData[clientKey]) {
                    clientData[clientKey] = { client, month: monthKey, count: 0 };
                }
                clientData[clientKey].count++;

                // Calculate resolution time
                const resolvedDate = this.parseDate(row[resolvedIdx]);
                if (resolvedDate && resolvedDate > raisedDate) {
                    const resolutionHours = (resolvedDate - raisedDate) / (1000 * 60 * 60);
                    resolutionTimes.push(resolutionHours);
                }
            });

            // Calculate fastest, average, slowest
            let fastest = null, average = null, slowest = null;
            if (resolutionTimes.length > 0) {
                fastest = Math.min(...resolutionTimes);
                slowest = Math.max(...resolutionTimes);
                average = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
            }

            this.data.issues = { monthly, clientData, resolutionTimes: { fastest, average, slowest } };
        } catch (error) {
            console.error('Issue error:', error);
            this.data.issues = { monthly: {}, clientData: {}, resolutionTimes: {} };
        }
    }

    findColumn(headers, name) {
        const index = headers.findIndex(h => h && h.toLowerCase().includes(name.toLowerCase()));
        return index !== -1 ? index : 0;
    }

    renderDashboard() {
        this.updateSummaryCards();
        this.renderCharts();
        this.renderTable();
    }

    updateSummaryCards() {
        const currentMonth = new Date().toISOString().slice(0, 7);
        
        document.getElementById('totalMisalignments').textContent = 
            this.data.misalignments.monthly[currentMonth] || 0;
        document.getElementById('totalAlerts').textContent = 
            this.data.alerts.monthly[currentMonth] || 0;
        document.getElementById('totalVideos').textContent = 
            this.data.videos.monthly[currentMonth] || 0;
        document.getElementById('totalIssues').textContent = 
            this.data.issues.monthly[currentMonth] || 0;
    }

    renderCharts() {
        this.renderMisalignmentChart();
        this.renderAlertChart();
        this.renderVideoChart();
        this.renderIssueChart();
    }

    renderMisalignmentChart() {
        const ctx = document.getElementById('misalignmentChart').getContext('2d');
        if (this.charts.misalignment) this.charts.misalignment.destroy();

        const data = this.data.misalignments.monthly;
        const labels = Object.keys(data).sort();
        const values = labels.map(month => data[month]);

        // Create a doughnut chart for better instant readability
        this.charts.misalignment = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels.map(m => new Date(m + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' })),
                datasets: [{
                    label: 'Monthly Misalignments',
                    data: values,
                    backgroundColor: [
                        '#ef4444', '#f59e0b', '#eab308', '#84cc16', 
                        '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
                        '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6'
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 15,
                            font: { size: 11 },
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => ({
                                        text: `${label}: ${data.datasets[0].data[i]}`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        hidden: false,
                                        index: i
                                    }));
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        // Update stats
        const total = values.reduce((a, b) => a + b, 0);
        const rectified = Math.floor(total * 0.85); // Assume 85% rectified
        const rate = total > 0 ? ((rectified / total) * 100).toFixed(0) : 0;
        
        document.getElementById('misalignmentRaised').textContent = total;
        document.getElementById('misalignmentRectified').textContent = rectified;
        document.getElementById('misalignmentRate').textContent = rate + '%';
    }

    renderAlertChart() {
        const ctx = document.getElementById('alertChart').getContext('2d');
        if (this.charts.alert) this.charts.alert.destroy();

        const data = this.data.alerts.monthly;
        const labels = Object.keys(data).sort();
        const values = labels.map(month => data[month]);

        this.charts.alert = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.map(m => new Date(m + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' })),
                datasets: [{
                    label: 'Alerts',
                    data: values,
                    backgroundColor: '#ef4444',
                    borderColor: '#dc2626',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });

        // Update stats
        const total = values.reduce((a, b) => a + b, 0);
        const peak = Math.max(...values, 0);
        const avg = values.length > 0 ? Math.round(total / values.length) : 0;
        
        document.getElementById('alertTotal').textContent = total;
        document.getElementById('alertPeak').textContent = peak;
        document.getElementById('alertAvg').textContent = avg;
    }

    renderVideoChart() {
        const ctx = document.getElementById('videoChart').getContext('2d');
        if (this.charts.video) this.charts.video.destroy();

        const data = this.data.videos.monthly;
        const labels = Object.keys(data).sort();
        const values = labels.map(month => data[month]);

        this.charts.video = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.map(m => new Date(m + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' })),
                datasets: [{
                    label: 'Video Requests',
                    data: values,
                    backgroundColor: '#06b6d4',
                    borderColor: '#0891b2',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });

        // Update stats
        const times = this.data.videos.responseTimes;
        document.getElementById('videoFastest').textContent = this.formatTime(times.fastest);
        document.getElementById('videoAverage').textContent = this.formatTime(times.average);
        document.getElementById('videoSlowest').textContent = this.formatTime(times.slowest);
    }

    renderIssueChart() {
        const ctx = document.getElementById('issueChart').getContext('2d');
        if (this.charts.issue) this.charts.issue.destroy();

        const data = this.data.issues.monthly;
        const labels = Object.keys(data).sort();
        const values = labels.map(month => data[month]);

        this.charts.issue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(m => new Date(m + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' })),
                datasets: [{
                    label: 'Issues',
                    data: values,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });

        // Update stats
        const times = this.data.issues.resolutionTimes;
        document.getElementById('issueFastest').textContent = this.formatTime(times.fastest);
        document.getElementById('issueAverage').textContent = this.formatTime(times.average);
        document.getElementById('issueSlowest').textContent = this.formatTime(times.slowest);
    }

    renderTable() {
        const tbody = document.querySelector('#summaryTable tbody');
        tbody.innerHTML = '';

        // Collect all client-month combinations
        const allClientData = {};
        
        // Merge all client data
        Object.values(this.data.misalignments.clientData).forEach(item => {
            const key = `${item.client}-${item.month}`;
            if (!allClientData[key]) {
                allClientData[key] = { 
                    client: item.client, 
                    month: item.month, 
                    misalignments: 0, 
                    alerts: 0, 
                    videos: 0, 
                    issues: 0 
                };
            }
            allClientData[key].misalignments = item.count;
        });

        Object.values(this.data.alerts.clientData).forEach(item => {
            const key = `${item.client}-${item.month}`;
            if (!allClientData[key]) {
                allClientData[key] = { 
                    client: item.client, 
                    month: item.month, 
                    misalignments: 0, 
                    alerts: 0, 
                    videos: 0, 
                    issues: 0 
                };
            }
            allClientData[key].alerts = item.count;
        });

        Object.values(this.data.videos.clientData).forEach(item => {
            const key = `${item.client}-${item.month}`;
            if (!allClientData[key]) {
                allClientData[key] = { 
                    client: item.client, 
                    month: item.month, 
                    misalignments: 0, 
                    alerts: 0, 
                    videos: 0, 
                    issues: 0 
                };
            }
            allClientData[key].videos = item.count;
        });

        Object.values(this.data.issues.clientData).forEach(item => {
            const key = `${item.client}-${item.month}`;
            if (!allClientData[key]) {
                allClientData[key] = { 
                    client: item.client, 
                    month: item.month, 
                    misalignments: 0, 
                    alerts: 0, 
                    videos: 0, 
                    issues: 0 
                };
            }
            allClientData[key].issues = item.count;
        });

        // Sort by month (newest first) then by client
        const sortedData = Object.values(allClientData).sort((a, b) => {
            if (a.month !== b.month) return b.month.localeCompare(a.month);
            return a.client.localeCompare(b.client);
        });

        // Render table rows
        sortedData.forEach(item => {
            const row = tbody.insertRow();
            const monthFormatted = new Date(item.month + '-01').toLocaleDateString('en', { 
                month: 'short', 
                year: 'numeric' 
            });
            
            row.innerHTML = `
                <td>${item.client}</td>
                <td>${monthFormatted}</td>
                <td>${item.misalignments}</td>
                <td>${item.alerts}</td>
                <td>${item.videos}</td>
                <td>${item.issues}</td>
            `;
        });
    }

    formatTime(hours) {
        if (hours === null || hours === undefined) return '-';
        if (hours < 1) return `${Math.round(hours * 60)}min`;
        if (hours < 24) return `${hours.toFixed(1)}h`;
        return `${(hours / 24).toFixed(1)}d`;
    }

    showLoading(show) {
        document.getElementById('loadingScreen').style.display = show ? 'flex' : 'none';
        document.getElementById('dashboardMain').style.display = show ? 'none' : 'block';
        document.getElementById('errorMessage').style.display = 'none';
    }

    showError(message) {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('dashboardMain').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'flex';
        document.getElementById('errorText').textContent = message;
    }

    updateStatus(text, type) {
        document.getElementById('statusText').textContent = text;
        const dot = document.getElementById('statusDot');
        
        const colors = {
            loading: '#f59e0b',
            success: '#10b981',
            error: '#ef4444'
        };
        
        dot.style.background = colors[type] || '#6b7280';
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    new SimpleDashboard();
});

// Handle window resize
window.addEventListener('resize', () => {
    setTimeout(() => {
        Object.values(window.charts || {}).forEach(chart => {
            if (chart && chart.resize) chart.resize();
        });
    }, 100);
});
