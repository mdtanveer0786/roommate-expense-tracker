/**
 * Charts Module for Roommate Expense Tracker
 * Handles chart creation and management
 */

const Charts = (function () {
    // Chart instances storage
    const chartInstances = {};

    // Initialize all charts on a page
    function initCharts() {
        // Find all chart canvases and initialize them
        document.querySelectorAll('canvas[data-chart-type]').forEach(canvas => {
            const chartType = canvas.getAttribute('data-chart-type');
            const chartId = canvas.id;

            if (chartId) {
                initChart(chartId, chartType);
            }
        });
    }

    // Initialize a specific chart
    function initChart(chartId, chartType, data = null, options = null) {
        try {
            const canvas = document.getElementById(chartId);
            if (!canvas) {
                console.warn(`Canvas element with id '${chartId}' not found`);
                return null;
            }

            // Destroy existing chart if it exists
            if (chartInstances[chartId]) {
                chartInstances[chartId].destroy();
            }

            // Get context
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('Could not get canvas context');
                return null;
            }

            // Default data and options
            const defaultData = getDefaultChartData(chartType);
            const defaultOptions = getDefaultChartOptions(chartType);

            // Merge with provided data/options
            const chartData = data ? { ...defaultData, ...data } : defaultData;
            const chartOptions = options ? { ...defaultOptions, ...options } : defaultOptions;

            // Create chart
            let chart;
            switch (chartType) {
                case 'doughnut':
                case 'pie':
                    chart = createPieChart(ctx, chartData, chartOptions);
                    break;
                case 'bar':
                    chart = createBarChart(ctx, chartData, chartOptions);
                    break;
                case 'line':
                    chart = createLineChart(ctx, chartData, chartOptions);
                    break;
                default:
                    console.error(`Unsupported chart type: ${chartType}`);
                    return null;
            }

            // Store instance
            chartInstances[chartId] = chart;

            return chart;
        } catch (error) {
            console.error(`Error initializing chart '${chartId}':`, error);
            return null;
        }
    }

    // Create pie/doughnut chart
    function createPieChart(ctx, data, options) {
        return new Chart(ctx, {
            type: data.type || 'doughnut',
            data: {
                labels: data.labels || [],
                datasets: [{
                    data: data.values || [],
                    backgroundColor: data.colors || generateColors(data.labels?.length || 0),
                    borderColor: data.borderColors || 'var(--bg-primary)',
                    borderWidth: data.borderWidth || 1,
                    hoverOffset: data.hoverOffset || 15
                }]
            },
            options: mergeOptions({
                responsive: true,
                maintainAspectRatio: false,
                cutout: data.type === 'doughnut' ? '60%' : 0,
                plugins: {
                    legend: {
                        position: data.legendPosition || 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            color: 'var(--text-primary)'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }, options)
        });
    }

    // Create bar chart
    function createBarChart(ctx, data, options) {
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels || [],
                datasets: data.datasets || [{
                    label: data.datasetLabel || 'Data',
                    data: data.values || [],
                    backgroundColor: data.colors || generateColors(data.labels?.length || 0, 0.7),
                    borderColor: data.borderColors || generateColors(data.labels?.length || 0, 1),
                    borderWidth: data.borderWidth || 1,
                    borderRadius: data.borderRadius || 4,
                    borderSkipped: false
                }]
            },
            options: mergeOptions({
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: data.indexAxis || 'x',
                plugins: {
                    legend: {
                        display: data.showLegend !== false,
                        position: 'top',
                        labels: {
                            color: 'var(--text-primary)'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.dataset.label || '';
                                const value = context.raw || 0;
                                return `${label}: ${formatCurrency(value)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'var(--border-color)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'var(--text-secondary)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'var(--border-color)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'var(--text-secondary)',
                            callback: function (value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                }
            }, options)
        });
    }

    // Create line chart
    function createLineChart(ctx, data, options) {
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: data.datasets || [{
                    label: data.datasetLabel || 'Data',
                    data: data.values || [],
                    backgroundColor: data.fillColor || 'rgba(59, 130, 246, 0.1)',
                    borderColor: data.borderColor || 'var(--primary-600)',
                    borderWidth: data.borderWidth || 2,
                    tension: data.tension || 0.1,
                    fill: data.fill || false,
                    pointBackgroundColor: data.pointColor || 'var(--primary-600)',
                    pointBorderColor: data.pointBorderColor || 'var(--bg-primary)',
                    pointBorderWidth: data.pointBorderWidth || 2,
                    pointRadius: data.pointRadius || 4,
                    pointHoverRadius: data.pointHoverRadius || 6
                }]
            },
            options: mergeOptions({
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: data.showLegend !== false,
                        position: 'top',
                        labels: {
                            color: 'var(--text-primary)'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.dataset.label || '';
                                const value = context.raw || 0;
                                return `${label}: ${formatCurrency(value)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'var(--border-color)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'var(--text-secondary)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'var(--border-color)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'var(--text-secondary)',
                            callback: function (value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                }
            }, options)
        });
    }

    // Create expense category chart
    function createCategoryChart(chartId, categoryData) {
        const labels = Object.keys(categoryData.breakdown || {});
        const values = Object.values(categoryData.breakdown || {}).map(item => item.amount || item);

        // Generate colors based on category
        const colors = labels.map(label => getCategoryColor(label));

        return initChart(chartId, 'doughnut', {
            labels: labels,
            values: values,
            colors: colors,
            type: 'doughnut'
        }, {
            plugins: {
                title: {
                    display: true,
                    text: 'Expenses by Category',
                    color: 'var(--text-primary)',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            }
        });
    }

    // Create member balance chart
    function createBalanceChart(chartId, balanceData) {
        const labels = balanceData.map(item => item.memberName || 'Unknown');
        const values = balanceData.map(item => item.balance || 0);

        // Generate colors based on balance (green for positive, red for negative)
        const colors = values.map(value =>
            value >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'
        );

        return initChart(chartId, 'bar', {
            labels: labels,
            values: values,
            colors: colors,
            indexAxis: 'y'
        }, {
            plugins: {
                title: {
                    display: true,
                    text: 'Member Balances',
                    color: 'var(--text-primary)',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Balance',
                        color: 'var(--text-secondary)'
                    }
                }
            }
        });
    }

    // Create monthly trend chart
    function createTrendChart(chartId, trendData) {
        const labels = trendData.map(item => item.monthName || item.month);
        const values = trendData.map(item => item.total || 0);

        return initChart(chartId, 'line', {
            labels: labels,
            values: values,
            datasetLabel: 'Monthly Expenses',
            borderColor: 'var(--primary-600)',
            pointColor: 'var(--primary-600)',
            fill: true,
            fillColor: 'rgba(59, 130, 246, 0.1)'
        }, {
            plugins: {
                title: {
                    display: true,
                    text: 'Monthly Expense Trends',
                    color: 'var(--text-primary)',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Total Expenses',
                        color: 'var(--text-secondary)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Month',
                        color: 'var(--text-secondary)'
                    }
                }
            }
        });
    }

    // Create settlement chart
    function createSettlementChart(chartId, settlementData) {
        const labels = settlementData.map(item =>
            `${item.fromName} → ${item.toName}`
        );
        const values = settlementData.map(item => item.amount || 0);

        return initChart(chartId, 'bar', {
            labels: labels,
            values: values,
            colors: generateColors(values.length, 0.7),
            indexAxis: 'y'
        }, {
            plugins: {
                title: {
                    display: true,
                    text: 'Settlement Amounts',
                    color: 'var(--text-primary)',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Amount',
                        color: 'var(--text-secondary)'
                    }
                }
            }
        });
    }

    // Update chart data
    function updateChart(chartId, newData) {
        try {
            const chart = chartInstances[chartId];
            if (!chart) {
                console.warn(`Chart '${chartId}' not found`);
                return false;
            }

            if (newData.labels) {
                chart.data.labels = newData.labels;
            }

            if (newData.datasets) {
                chart.data.datasets = newData.datasets;
            } else if (newData.values && chart.data.datasets[0]) {
                chart.data.datasets[0].data = newData.values;
            }

            if (newData.colors && chart.data.datasets[0]) {
                chart.data.datasets[0].backgroundColor = newData.colors;
            }

            chart.update();
            return true;
        } catch (error) {
            console.error(`Error updating chart '${chartId}':`, error);
            return false;
        }
    }

    // Destroy a chart
    function destroyChart(chartId) {
        try {
            const chart = chartInstances[chartId];
            if (chart) {
                chart.destroy();
                delete chartInstances[chartId];
            }
            return true;
        } catch (error) {
            console.error(`Error destroying chart '${chartId}':`, error);
            return false;
        }
    }

    // Destroy all charts
    function destroyAllCharts() {
        Object.keys(chartInstances).forEach(chartId => {
            destroyChart(chartId);
        });
    }

    // Generate colors for charts
    function generateColors(count, alpha = 1) {
        const baseColors = [
            'rgba(59, 130, 246, ALPHA)',    // Blue
            'rgba(16, 185, 129, ALPHA)',    // Green
            'rgba(245, 158, 11, ALPHA)',    // Amber
            'rgba(239, 68, 68, ALPHA)',     // Red
            'rgba(139, 92, 246, ALPHA)',    // Purple
            'rgba(236, 72, 153, ALPHA)',    // Pink
            'rgba(6, 182, 212, ALPHA)',     // Cyan
            'rgba(132, 204, 22, ALPHA)',    // Lime
            'rgba(249, 115, 22, ALPHA)',    // Orange
            'rgba(99, 102, 241, ALPHA)'     // Indigo
        ];

        // Replace ALPHA placeholder with actual alpha value
        const colors = baseColors.map(color => color.replace('ALPHA', alpha));

        // Repeat colors if needed
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(colors[i % colors.length]);
        }

        return result;
    }

    // Get color for a category
    function getCategoryColor(category) {
        const colorMap = {
            'Food': 'rgba(239, 68, 68, 0.7)',      // Red
            'Rent': 'rgba(59, 130, 246, 0.7)',     // Blue
            'Bill': 'rgba(16, 185, 129, 0.7)',     // Green
            'Gas': 'rgba(245, 158, 11, 0.7)',      // Amber
            'Drinking Water': 'rgba(6, 182, 212, 0.7)', // Cyan
            'Travel': 'rgba(139, 92, 246, 0.7)',   // Purple
            'Other': 'rgba(156, 163, 175, 0.7)',   // Gray
            'Settlement': 'rgba(236, 72, 153, 0.7)' // Pink
        };

        return colorMap[category] || 'rgba(156, 163, 175, 0.7)';
    }

    // Get default chart data based on type
    function getDefaultChartData(chartType) {
        const defaults = {
            doughnut: {
                labels: ['Category 1', 'Category 2', 'Category 3'],
                values: [300, 500, 200],
                type: 'doughnut'
            },
            bar: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr'],
                values: [1000, 1200, 800, 1500],
                datasetLabel: 'Expenses'
            },
            line: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                values: [300, 400, 350, 500],
                datasetLabel: 'Weekly Expenses'
            }
        };

        return defaults[chartType] || defaults.doughnut;
    }

    // Get default chart options based on type
    function getDefaultChartOptions(chartType) {
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'var(--text-primary)'
                    }
                }
            }
        };

        return commonOptions;
    }

    // Merge options objects
    function mergeOptions(defaultOptions, customOptions) {
        if (!customOptions) return defaultOptions;

        // Deep merge
        const mergeDeep = (target, source) => {
            const isObject = obj => obj && typeof obj === 'object';

            if (!isObject(target) || !isObject(source)) {
                return source;
            }

            Object.keys(source).forEach(key => {
                const targetValue = target[key];
                const sourceValue = source[key];

                if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
                    target[key] = sourceValue;
                } else if (isObject(targetValue) && isObject(sourceValue)) {
                    target[key] = mergeDeep(Object.assign({}, targetValue), sourceValue);
                } else {
                    target[key] = sourceValue;
                }
            });

            return target;
        };

        return mergeDeep(JSON.parse(JSON.stringify(defaultOptions)), customOptions);
    }

    // Format currency
    function formatCurrency(amount) {
        const settings = window.storage ? window.storage.getSettings() : null;
        const currency = settings?.currency || '₹';
        const decimalPlaces = settings?.decimalPlaces || 2;

        return `${currency}${parseFloat(amount).toFixed(decimalPlaces)}`;
    }

    // Public API
    return {
        initCharts,
        initChart,
        createCategoryChart,
        createBalanceChart,
        createTrendChart,
        createSettlementChart,
        updateChart,
        destroyChart,
        destroyAllCharts,
        generateColors,
        getCategoryColor,
        formatCurrency
    };
})();

// Make available globally
window.chartsModule = Charts;

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Wait a bit for any dynamic content
    setTimeout(() => {
        if (window.chartsModule) {
            window.chartsModule.initCharts();
        }
    }, 100);
});