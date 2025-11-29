// ==========================================
// STUDENT ANALYTICS DASHBOARD
// Interactive Charts and Data Visualization
// ==========================================

// Theme Manager (shared with main app)
class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'light';
        this.apply();
    }

    toggle() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.apply();
        localStorage.setItem('theme', this.theme);
    }

    apply() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const icon = document.getElementById('themeIcon');
        if (icon) {
            icon.textContent = this.theme === 'dark' ? '☀️' : '🌙';
        }
    }
}

// Analytics Manager
class AnalyticsManager {
    constructor() {
        this.students = this.loadStudents();
        this.charts = {};
    }

    loadStudents() {
        const data = localStorage.getItem('studentRecords');
        return data ? JSON.parse(data) : [];
    }

    calculateAge(dob) {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    getStatistics() {
        const total = this.students.length;
        const avgGPA = total > 0
            ? (this.students.reduce((sum, s) => sum + (parseFloat(s.gpa) || 0), 0) / total).toFixed(2)
            : '0.00';
        const courses = new Set(this.students.map(s => s.course)).size;
        const avgAttendance = total > 0
            ? (this.students.reduce((sum, s) => sum + (parseFloat(s.attendance) || 0), 0) / total).toFixed(1)
            : '0';

        return { total, avgGPA, courses, avgAttendance };
    }

    getGPADistribution() {
        const ranges = {
            '0.0-1.0': 0,
            '1.0-2.0': 0,
            '2.0-2.5': 0,
            '2.5-3.0': 0,
            '3.0-3.5': 0,
            '3.5-4.0': 0
        };

        this.students.forEach(student => {
            const gpa = parseFloat(student.gpa);
            if (isNaN(gpa)) return;

            if (gpa < 1.0) ranges['0.0-1.0']++;
            else if (gpa < 2.0) ranges['1.0-2.0']++;
            else if (gpa < 2.5) ranges['2.0-2.5']++;
            else if (gpa < 3.0) ranges['2.5-3.0']++;
            else if (gpa < 3.5) ranges['3.0-3.5']++;
            else ranges['3.5-4.0']++;
        });

        return ranges;
    }

    getCourseDistribution() {
        const courses = {};
        this.students.forEach(student => {
            courses[student.course] = (courses[student.course] || 0) + 1;
        });
        return courses;
    }

    getYearDistribution() {
        const years = { '1': 0, '2': 0, '3': 0, '4': 0 };
        this.students.forEach(student => {
            if (years.hasOwnProperty(student.year)) {
                years[student.year]++;
            }
        });
        return years;
    }

    getAttendanceDistribution() {
        const ranges = {
            '0-50%': 0,
            '50-75%': 0,
            '75-90%': 0,
            '90-100%': 0
        };

        this.students.forEach(student => {
            const attendance = parseFloat(student.attendance);
            if (isNaN(attendance)) return;

            if (attendance < 50) ranges['0-50%']++;
            else if (attendance < 75) ranges['50-75%']++;
            else if (attendance < 90) ranges['75-90%']++;
            else ranges['90-100%']++;
        });

        return ranges;
    }

    getGPAByCourse() {
        const coursesData = {};
        this.students.forEach(student => {
            const course = student.course;
            const gpa = parseFloat(student.gpa) || 0;

            if (!coursesData[course]) {
                coursesData[course] = { total: 0, count: 0 };
            }

            coursesData[course].total += gpa;
            coursesData[course].count += 1;
        });

        const result = {};
        Object.keys(coursesData).forEach(course => {
            result[course] = (coursesData[course].total / coursesData[course].count).toFixed(2);
        });

        return result;
    }

    getAgeDistribution() {
        const ranges = {
            '16-18': 0,
            '19-21': 0,
            '22-24': 0,
            '25+': 0
        };

        this.students.forEach(student => {
            const age = this.calculateAge(student.dob);
            if (!age) return;

            if (age <= 18) ranges['16-18']++;
            else if (age <= 21) ranges['19-21']++;
            else if (age <= 24) ranges['22-24']++;
            else ranges['25+']++;
        });

        return ranges;
    }
}

// Chart Renderer
class ChartRenderer {
    constructor(analytics) {
        this.analytics = analytics;
        this.isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    }

    getChartColors() {
        return this.isDark
            ? {
                primary: '#818cf8',
                secondary: '#a78bfa',
                success: '#34d399',
                warning: '#fbbf24',
                danger: '#f87171',
                info: '#60a5fa',
                gridColor: 'rgba(255, 255, 255, 0.1)',
                textColor: '#f9fafb'
            }
            : {
                primary: '#6366f1',
                secondary: '#8b5cf6',
                success: '#10b981',
                warning: '#f59e0b',
                danger: '#ef4444',
                info: '#3b82f6',
                gridColor: 'rgba(0, 0, 0, 0.1)',
                textColor: '#1f2937'
            };
    }

    renderGPAChart() {
        const data = this.analytics.getGPADistribution();
        const colors = this.getChartColors();
        const ctx = document.getElementById('gpaChart');

        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    label: 'Number of Students',
                    data: Object.values(data),
                    backgroundColor: [
                        colors.danger,
                        colors.warning,
                        '#fb923c',
                        colors.info,
                        colors.primary,
                        colors.success
                    ],
                    borderColor: colors.textColor,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: colors.textColor
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: colors.textColor,
                            stepSize: 1
                        },
                        grid: {
                            color: colors.gridColor
                        }
                    },
                    x: {
                        ticks: {
                            color: colors.textColor
                        },
                        grid: {
                            color: colors.gridColor
                        }
                    }
                }
            }
        });
    }

    renderCourseChart() {
        const data = this.analytics.getCourseDistribution();
        const colors = this.getChartColors();
        const ctx = document.getElementById('courseChart');

        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    data: Object.values(data),
                    backgroundColor: [
                        colors.primary,
                        colors.secondary,
                        colors.success,
                        colors.warning,
                        colors.danger,
                        colors.info
                    ],
                    borderWidth: 2,
                    borderColor: this.isDark ? '#1f2937' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: colors.textColor,
                            padding: 15
                        }
                    }
                }
            }
        });
    }

    renderYearChart() {
        const data = this.analytics.getYearDistribution();
        const colors = this.getChartColors();
        const ctx = document.getElementById('yearChart');

        return new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(data).map(y => `Year ${y}`),
                datasets: [{
                    data: Object.values(data),
                    backgroundColor: [
                        colors.primary,
                        colors.secondary,
                        colors.success,
                        colors.warning
                    ],
                    borderWidth: 2,
                    borderColor: this.isDark ? '#1f2937' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: colors.textColor,
                            padding: 15
                        }
                    }
                }
            }
        });
    }

    renderAttendanceChart() {
        const data = this.analytics.getAttendanceDistribution();
        const colors = this.getChartColors();
        const ctx = document.getElementById('attendanceChart');

        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    label: 'Number of Students',
                    data: Object.values(data),
                    backgroundColor: [
                        colors.danger,
                        colors.warning,
                        colors.info,
                        colors.success
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: colors.textColor
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: colors.textColor,
                            stepSize: 1
                        },
                        grid: {
                            color: colors.gridColor
                        }
                    },
                    x: {
                        ticks: {
                            color: colors.textColor
                        },
                        grid: {
                            color: colors.gridColor
                        }
                    }
                }
            }
        });
    }

    renderGPAByCourseChart() {
        const data = this.analytics.getGPAByCourse();
        const colors = this.getChartColors();
        const ctx = document.getElementById('gpaByCourseChart');

        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    label: 'Average GPA',
                    data: Object.values(data),
                    backgroundColor: colors.primary,
                    borderColor: colors.textColor,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: colors.textColor
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 4,
                        ticks: {
                            color: colors.textColor
                        },
                        grid: {
                            color: colors.gridColor
                        }
                    },
                    x: {
                        ticks: {
                            color: colors.textColor
                        },
                        grid: {
                            color: colors.gridColor
                        }
                    }
                }
            }
        });
    }

    renderAgeChart() {
        const data = this.analytics.getAgeDistribution();
        const colors = this.getChartColors();
        const ctx = document.getElementById('ageChart');

        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    data: Object.values(data),
                    backgroundColor: [
                        colors.primary,
                        colors.secondary,
                        colors.success,
                        colors.warning
                    ],
                    borderWidth: 2,
                    borderColor: this.isDark ? '#1f2937' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: colors.textColor,
                            padding: 15
                        }
                    }
                }
            }
        });
    }

    renderAllCharts() {
        return {
            gpaChart: this.renderGPAChart(),
            courseChart: this.renderCourseChart(),
            yearChart: this.renderYearChart(),
            attendanceChart: this.renderAttendanceChart(),
            gpaByCourseChart: this.renderGPAByCourseChart(),
            ageChart: this.renderAgeChart()
        };
    }
}

// Initialize Dashboard
let analytics, renderer, themeManager, charts;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    themeManager = new ThemeManager();

    // Theme toggle
    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            themeManager.toggle();
            // Reload charts with new theme
            destroyCharts();
            initializeCharts();
        });
    }

    // Initialize analytics
    initializeCharts();
});

function initializeCharts() {
    analytics = new AnalyticsManager();
    renderer = new ChartRenderer(analytics);

    // Update statistics
    const stats = analytics.getStatistics();
    document.getElementById('totalStudents').textContent = stats.total;
    document.getElementById('avgGPA').textContent = stats.avgGPA;
    document.getElementById('totalCourses').textContent = stats.courses;
    document.getElementById('avgAttendance').textContent = stats.avgAttendance + '%';

    // Render all charts
    charts = renderer.renderAllCharts();

    console.log('📊 Analytics Dashboard initialized!');
    console.log(`📈 Visualizing data for ${stats.total} students`);
}

function destroyCharts() {
    if (charts) {
        Object.values(charts).forEach(chart => {
            if (chart) chart.destroy();
        });
    }
}
