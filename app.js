// Data Storage
class DataStore {
    constructor() {
        this.transactions = this.loadTransactions();
        this.categories = this.loadCategories();
        
        // Initialize default categories if none exist
        if (this.categories.length === 0) {
            this.categories = [
                { name: 'Alimentación', color: '#e74c3c' },
                { name: 'Transporte', color: '#3498db' },
                { name: 'Entretenimiento', color: '#9b59b6' },
                { name: 'Servicios', color: '#f39c12' },
                { name: 'Salud', color: '#1abc9c' },
                { name: 'Educación', color: '#34495e' },
                { name: 'Salario', color: '#27ae60' },
                { name: 'Otros', color: '#95a5a6' }
            ];
            this.saveCategories();
        }
    }

    loadTransactions() {
        const data = localStorage.getItem('transactions');
        return data ? JSON.parse(data) : [];
    }

    saveTransactions() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }

    loadCategories() {
        const data = localStorage.getItem('categories');
        return data ? JSON.parse(data) : [];
    }

    saveCategories() {
        localStorage.setItem('categories', JSON.stringify(this.categories));
    }

    addTransaction(transaction) {
        transaction.id = Date.now().toString();
        this.transactions.push(transaction);
        this.saveTransactions();
        return transaction;
    }

    deleteTransaction(id) {
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveTransactions();
    }

    addCategory(category) {
        this.categories.push(category);
        this.saveCategories();
    }

    deleteCategory(name) {
        this.categories = this.categories.filter(c => c.name !== name);
        this.saveCategories();
    }

    getTransactions(filters = {}) {
        let filtered = [...this.transactions];

        if (filters.type) {
            filtered = filtered.filter(t => t.tipo === filters.type);
        }

        if (filters.category) {
            filtered = filtered.filter(t => t.categoria === filters.category);
        }

        if (filters.dateFrom) {
            filtered = filtered.filter(t => t.fecha >= filters.dateFrom);
        }

        if (filters.dateTo) {
            filtered = filtered.filter(t => t.fecha <= filters.dateTo);
        }

        return filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }

    // Get transactions filtered by period
    getTransactionsByPeriod(period = 'all') {
        const now = new Date();
        let startDate;

        switch (period) {
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                return [...this.transactions];
        }

        const startDateStr = startDate.toISOString().split('T')[0];
        return this.transactions.filter(t => t.fecha >= startDateStr);
    }

    getTotalIncome(transactions = null) {
        const data = transactions || this.transactions;
        return data
            .filter(t => t.tipo === 'ingreso')
            .reduce((sum, t) => sum + parseFloat(t.valor_gasto), 0);
    }

    getTotalExpenses(transactions = null) {
        const data = transactions || this.transactions;
        return data
            .filter(t => t.tipo === 'gasto')
            .reduce((sum, t) => sum + parseFloat(t.valor_gasto), 0);
    }

    getBalance(transactions = null) {
        return this.getTotalIncome(transactions) - this.getTotalExpenses(transactions);
    }

    getExpensesByCategory(transactions = null) {
        const data = transactions || this.transactions;
        const expenses = data.filter(t => t.tipo === 'gasto');
        const byCategory = {};

        expenses.forEach(transaction => {
            if (!byCategory[transaction.categoria]) {
                byCategory[transaction.categoria] = 0;
            }
            byCategory[transaction.categoria] += parseFloat(transaction.valor_gasto);
        });

        return byCategory;
    }

    // Get monthly data for the last 6 months
    getMonthlyData() {
        const months = [];
        const now = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = date.getMonth();
            
            const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const nextMonth = new Date(year, month + 1, 1);
            const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
            
            const monthTransactions = this.transactions.filter(t => 
                t.fecha >= monthStart && t.fecha < monthEnd
            );
            
            const income = this.getTotalIncome(monthTransactions);
            const expenses = this.getTotalExpenses(monthTransactions);
            
            months.push({
                label: date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
                income,
                expenses,
                balance: income - expenses
            });
        }
        
        return months;
    }

    // Get daily balance trend for the last 30 days
    getDailyBalanceTrend() {
        const days = [];
        const now = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dayTransactions = this.transactions.filter(t => t.fecha <= dateStr);
            const balance = this.getBalance(dayTransactions);
            
            days.push({
                label: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
                date: dateStr,
                balance
            });
        }
        
        return days;
    }

    clearAllData() {
        this.transactions = [];
        this.saveTransactions();
    }

    exportData() {
        return JSON.stringify({
            transactions: this.transactions,
            categories: this.categories
        }, null, 2);
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.transactions) {
                this.transactions = data.transactions;
                this.saveTransactions();
            }
            if (data.categories) {
                this.categories = data.categories;
                this.saveCategories();
            }
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
}

// UI Controller
class UIController {
    constructor(dataStore) {
        this.dataStore = dataStore;
        this.currentView = 'dashboard';
        this.currentPeriod = 'all';
        this.charts = {
            pie: null,
            bar: null,
            line: null
        };
        this.initializeEventListeners();
        this.updateUI();
    }

    initializeEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // View all link
        document.querySelectorAll('.view-all-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // Period selector
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentPeriod = e.target.dataset.period;
                this.updateUI();
            });
        });

        // Quick Add Form
        document.getElementById('quick-add-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleQuickAdd();
        });

        // Transaction Modal
        document.getElementById('add-transaction-btn').addEventListener('click', () => {
            this.openTransactionModal();
        });

        document.querySelector('.close').addEventListener('click', () => {
            this.closeTransactionModal();
        });

        document.getElementById('cancel-transaction').addEventListener('click', () => {
            this.closeTransactionModal();
        });

        document.getElementById('transaction-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddTransaction();
        });

        // Category Management
        document.getElementById('add-category-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddCategory();
        });

        // Filters
        document.getElementById('apply-filters').addEventListener('click', () => {
            this.applyFilters();
        });

        document.getElementById('clear-filters').addEventListener('click', () => {
            this.clearFilters();
        });

        // Data Management
        document.getElementById('export-data').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('import-data').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });

        document.getElementById('import-file').addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });

        document.getElementById('clear-data').addEventListener('click', () => {
            if (confirm('¿Está seguro de que desea borrar todos los datos? Esta acción no se puede deshacer.')) {
                this.dataStore.clearAllData();
                this.updateUI();
            }
        });

        // Close modal on outside click
        document.getElementById('transaction-modal').addEventListener('click', (e) => {
            if (e.target.id === 'transaction-modal') {
                this.closeTransactionModal();
            }
        });
    }

    switchView(viewName) {
        // Update active view
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(viewName).classList.add('active');

        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

        this.currentView = viewName;
        this.updateUI();
    }

    handleQuickAdd() {
        const type = document.getElementById('quick-type').value;
        const amount = document.getElementById('quick-amount').value;
        const category = document.getElementById('quick-category').value;
        const description = document.getElementById('quick-description').value;

        const transaction = {
            tipo: type,
            fecha: new Date().toISOString().split('T')[0],
            valor_gasto: parseFloat(amount),
            categoria: category,
            descripcion: description
        };

        this.dataStore.addTransaction(transaction);
        
        // Reset form
        document.getElementById('quick-add-form').reset();
        
        this.updateUI();
        this.showNotification('Transacción agregada correctamente', 'success');
    }

    openTransactionModal() {
        document.getElementById('transaction-modal').classList.add('active');
        document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
    }

    closeTransactionModal() {
        document.getElementById('transaction-modal').classList.remove('active');
        document.getElementById('transaction-form').reset();
    }

    handleAddTransaction() {
        const transaction = {
            tipo: document.getElementById('transaction-type').value,
            fecha: document.getElementById('transaction-date').value,
            valor_gasto: parseFloat(document.getElementById('transaction-amount').value),
            categoria: document.getElementById('transaction-category').value,
            descripcion: document.getElementById('transaction-description').value
        };

        this.dataStore.addTransaction(transaction);
        this.closeTransactionModal();
        this.updateUI();
        this.showNotification('Transacción agregada correctamente', 'success');
    }

    handleAddCategory() {
        const name = document.getElementById('new-category').value;
        const color = document.getElementById('category-color').value;

        // Check if category already exists
        if (this.dataStore.categories.some(c => c.name === name)) {
            this.showNotification('Esta categoría ya existe', 'error');
            return;
        }

        this.dataStore.addCategory({ name, color });
        document.getElementById('add-category-form').reset();
        this.updateUI();
        this.showNotification('Categoría agregada correctamente', 'success');
    }

    applyFilters() {
        const filters = {
            type: document.getElementById('filter-type').value,
            category: document.getElementById('filter-category').value,
            dateFrom: document.getElementById('filter-date-from').value,
            dateTo: document.getElementById('filter-date-to').value
        };

        this.renderTransactionsList(filters);
    }

    clearFilters() {
        document.getElementById('filter-type').value = '';
        document.getElementById('filter-category').value = '';
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';
        this.renderTransactionsList();
    }

    exportData() {
        const data = this.dataStore.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `control-gastos-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showNotification('Datos exportados correctamente', 'success');
    }

    importData(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const success = this.dataStore.importData(e.target.result);
            if (success) {
                this.showNotification('Datos importados correctamente', 'success');
                this.updateUI();
            } else {
                this.showNotification('Error al importar datos', 'error');
            }
        };
        reader.readAsText(file);
    }

    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 25px;
                border-radius: 10px;
                color: white;
                font-weight: 500;
                z-index: 2000;
                transform: translateX(400px);
                transition: transform 0.3s ease;
                box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            `;
            document.body.appendChild(notification);
        }

        notification.textContent = message;
        notification.style.background = type === 'success' 
            ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
            : type === 'error'
            ? 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

        // Show notification
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Hide after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
        }, 3000);
    }

    updateUI() {
        this.updateCategorySelects();
        this.updateSummaryCards();
        this.renderCharts();
        this.renderRecentTransactions();
        this.renderTransactionsList();
        this.renderCategoriesList();
    }

    updateCategorySelects() {
        const selects = [
            document.getElementById('quick-category'),
            document.getElementById('transaction-category'),
            document.getElementById('filter-category')
        ];

        selects.forEach((select, index) => {
            const currentValue = select.value;
            const isFilter = index === 2;
            
            select.innerHTML = isFilter ? '<option value="">Todas las categorías</option>' : '<option value="">Categoría</option>';
            
            this.dataStore.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.name;
                select.appendChild(option);
            });

            select.value = currentValue;
        });
    }

    updateSummaryCards() {
        const periodTransactions = this.dataStore.getTransactionsByPeriod(this.currentPeriod);
        const income = this.dataStore.getTotalIncome(periodTransactions);
        const expenses = this.dataStore.getTotalExpenses(periodTransactions);
        const balance = income - expenses;

        document.getElementById('total-income').textContent = this.formatCurrency(income);
        document.getElementById('total-expenses').textContent = this.formatCurrency(expenses);
        document.getElementById('balance').textContent = this.formatCurrency(balance);
        document.getElementById('total-transactions').textContent = periodTransactions.length;

        // Update trends (compare with previous period)
        this.updateTrends(periodTransactions);
    }

    updateTrends(currentTransactions) {
        const incomeTrend = document.getElementById('income-trend');
        const expensesTrend = document.getElementById('expenses-trend');
        const balanceTrend = document.getElementById('balance-trend');

        // Calculate number of income and expense transactions
        const incomeCount = currentTransactions.filter(t => t.tipo === 'ingreso').length;
        const expenseCount = currentTransactions.filter(t => t.tipo === 'gasto').length;

        incomeTrend.textContent = `${incomeCount} transacciones`;
        expensesTrend.textContent = `${expenseCount} transacciones`;
        
        const balance = this.dataStore.getBalance(currentTransactions);
        balanceTrend.textContent = balance >= 0 ? '✓ Positivo' : '⚠ Negativo';
        balanceTrend.style.color = balance >= 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,200,200,1)';
    }

    renderCharts() {
        // Check if Chart.js is available
        if (typeof Chart !== 'undefined') {
            this.renderPieChart();
            this.renderBarChart();
            this.renderLineChart();
        } else {
            // Fallback to CSS-based charts
            this.renderPieChartFallback();
            this.renderBarChartFallback();
            this.renderLineChartFallback();
        }
    }

    renderPieChartFallback() {
        const periodTransactions = this.dataStore.getTransactionsByPeriod(this.currentPeriod);
        const expensesByCategory = this.dataStore.getExpensesByCategory(periodTransactions);
        const chartSection = document.querySelector('.charts-grid .chart-section:first-child');
        const chartWrapper = chartSection.querySelector('.chart-wrapper');
        let legendContainer = document.getElementById('category-legend');
        
        const entries = Object.entries(expensesByCategory);
        
        // Ensure legend container exists
        if (!legendContainer) {
            legendContainer = document.createElement('div');
            legendContainer.id = 'category-legend';
            legendContainer.className = 'chart-legend';
            chartSection.appendChild(legendContainer);
        }
        legendContainer.innerHTML = '';
        
        if (entries.length === 0) {
            chartWrapper.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><p>No hay gastos registrados</p></div>';
            return;
        }

        const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
        
        // Create CSS pie chart simulation with bars
        let html = '<div class="fallback-chart">';
        entries.sort((a, b) => b[1] - a[1]).forEach(([category, amount]) => {
            const cat = this.dataStore.categories.find(c => c.name === category);
            const color = cat ? cat.color : '#95a5a6';
            const percentage = ((amount / total) * 100).toFixed(1);
            
            html += `
                <div class="chart-bar">
                    <div class="chart-label">${this.escapeHtml(category)}</div>
                    <div class="chart-bar-container">
                        <div class="chart-bar-fill" style="width: ${percentage}%; background: ${color};"></div>
                    </div>
                    <div class="chart-value">${this.formatCurrency(amount)} (${percentage}%)</div>
                </div>
            `;
            
            // Add to legend
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <span class="legend-color" style="background: ${color};"></span>
                <span>${this.escapeHtml(category)}: ${percentage}%</span>
            `;
            legendContainer.appendChild(legendItem);
        });
        html += '</div>';
        
        chartWrapper.innerHTML = html;
    }

    renderBarChartFallback() {
        const monthlyData = this.dataStore.getMonthlyData();
        const chartSection = document.querySelector('.charts-grid .chart-section:last-child');
        const chartWrapper = chartSection.querySelector('.chart-wrapper');
        
        if (monthlyData.every(m => m.income === 0 && m.expenses === 0)) {
            chartWrapper.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><p>No hay datos mensuales</p></div>';
            return;
        }

        const maxValue = Math.max(...monthlyData.map(m => Math.max(m.income, m.expenses)), 1);
        
        let html = '<div class="fallback-bar-chart">';
        monthlyData.forEach(m => {
            const incomeHeight = (m.income / maxValue) * 100;
            const expenseHeight = (m.expenses / maxValue) * 100;
            
            html += `
                <div class="bar-group">
                    <div class="bars">
                        <div class="bar income-bar" style="height: ${incomeHeight}%;" title="Ingresos: ${this.formatCurrency(m.income)}"></div>
                        <div class="bar expense-bar" style="height: ${expenseHeight}%;" title="Gastos: ${this.formatCurrency(m.expenses)}"></div>
                    </div>
                    <div class="bar-label">${m.label}</div>
                </div>
            `;
        });
        html += '</div>';
        html += '<div class="bar-legend"><span class="income-legend">● Ingresos</span> <span class="expense-legend">● Gastos</span></div>';
        
        chartWrapper.innerHTML = html;
    }

    renderLineChartFallback() {
        const trendData = this.dataStore.getDailyBalanceTrend();
        const chartSection = document.querySelector('.chart-section.full-width');
        const chartWrapper = chartSection.querySelector('.chart-wrapper-wide');
        
        if (trendData.every(d => d.balance === 0)) {
            chartWrapper.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📈</div><p>No hay datos de tendencia</p></div>';
            return;
        }

        const minBalance = Math.min(...trendData.map(d => d.balance));
        const maxBalance = Math.max(...trendData.map(d => d.balance));
        const range = maxBalance - minBalance || 1;
        
        let html = '<div class="fallback-line-chart">';
        html += '<div class="line-points">';
        trendData.forEach((d, i) => {
            const height = ((d.balance - minBalance) / range) * 80 + 10;
            const left = (i / (trendData.length - 1)) * 100;
            
            html += `<div class="line-point" style="left: ${left}%; bottom: ${height}%;" title="${d.label}: ${this.formatCurrency(d.balance)}"></div>`;
        });
        html += '</div>';
        html += `<div class="line-labels">
            <span>${trendData[0].label}</span>
            <span>${trendData[Math.floor(trendData.length/2)].label}</span>
            <span>${trendData[trendData.length-1].label}</span>
        </div>`;
        html += '</div>';
        
        chartWrapper.innerHTML = html;
    }

    renderPieChart() {
        const periodTransactions = this.dataStore.getTransactionsByPeriod(this.currentPeriod);
        const expensesByCategory = this.dataStore.getExpensesByCategory(periodTransactions);
        const canvas = document.getElementById('category-pie-chart');
        const legendContainer = document.getElementById('category-legend');
        
        const entries = Object.entries(expensesByCategory);
        
        // Clear legend
        legendContainer.innerHTML = '';
        
        if (entries.length === 0) {
            if (this.charts.pie) {
                this.charts.pie.destroy();
                this.charts.pie = null;
            }
            canvas.parentElement.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><p>No hay gastos registrados</p></div>';
            return;
        }

        // Ensure canvas exists
        if (!canvas.getContext) {
            const wrapper = document.querySelector('.chart-section .chart-wrapper');
            wrapper.innerHTML = '<canvas id="category-pie-chart"></canvas>';
        }

        const ctx = document.getElementById('category-pie-chart').getContext('2d');
        
        const labels = entries.map(([category]) => category);
        const data = entries.map(([, amount]) => amount);
        const colors = entries.map(([category]) => {
            const cat = this.dataStore.categories.find(c => c.name === category);
            return cat ? cat.color : '#95a5a6';
        });

        if (this.charts.pie) {
            this.charts.pie.destroy();
        }

        this.charts.pie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 3,
                    borderColor: '#fff',
                    hoverBorderWidth: 4,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 46, 0.9)',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => {
                                const total = data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${this.formatCurrency(context.parsed)} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '65%',
                animation: {
                    animateRotate: true,
                    animateScale: true
                }
            }
        });

        // Render custom legend
        entries.forEach(([category, amount]) => {
            const cat = this.dataStore.categories.find(c => c.name === category);
            const color = cat ? cat.color : '#95a5a6';
            const total = data.reduce((a, b) => a + b, 0);
            const percentage = ((amount / total) * 100).toFixed(1);
            
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <span class="legend-color" style="background: ${color};"></span>
                <span>${category}: ${percentage}%</span>
            `;
            legendContainer.appendChild(legendItem);
        });
    }

    renderBarChart() {
        const monthlyData = this.dataStore.getMonthlyData();
        const canvas = document.getElementById('monthly-bar-chart');
        
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');

        if (this.charts.bar) {
            this.charts.bar.destroy();
        }

        this.charts.bar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthlyData.map(m => m.label),
                datasets: [
                    {
                        label: 'Ingresos',
                        data: monthlyData.map(m => m.income),
                        backgroundColor: 'rgba(17, 153, 142, 0.8)',
                        borderColor: '#11998e',
                        borderWidth: 2,
                        borderRadius: 6,
                        borderSkipped: false
                    },
                    {
                        label: 'Gastos',
                        data: monthlyData.map(m => m.expenses),
                        backgroundColor: 'rgba(235, 51, 73, 0.8)',
                        borderColor: '#eb3349',
                        borderWidth: 2,
                        borderRadius: 6,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { size: 12, weight: '500' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 46, 0.9)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${this.formatCurrency(context.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 11 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            font: { size: 11 },
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    renderLineChart() {
        const trendData = this.dataStore.getDailyBalanceTrend();
        const canvas = document.getElementById('trend-line-chart');
        
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');

        if (this.charts.line) {
            this.charts.line.destroy();
        }

        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
        gradient.addColorStop(1, 'rgba(102, 126, 234, 0)');

        this.charts.line = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.map(d => d.label),
                datasets: [{
                    label: 'Balance',
                    data: trendData.map(d => d.balance),
                    borderColor: '#667eea',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#667eea',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(26, 26, 46, 0.9)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => `Balance: ${this.formatCurrency(context.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { 
                            font: { size: 10 },
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            font: { size: 11 },
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    renderRecentTransactions() {
        const recentList = document.getElementById('recent-list');
        const transactions = this.dataStore.getTransactions().slice(0, 5);

        if (transactions.length === 0) {
            recentList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><p>No hay transacciones recientes</p></div>';
            return;
        }

        recentList.innerHTML = '';
        transactions.forEach(transaction => {
            recentList.insertAdjacentHTML('beforeend', this.createTransactionHTML(transaction, false));
        });
    }

    renderTransactionsList(filters = {}) {
        const transactionsList = document.getElementById('transactions-list');
        const transactions = this.dataStore.getTransactions(filters);

        if (transactions.length === 0) {
            transactionsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><p>No hay transacciones</p></div>';
            return;
        }

        transactionsList.innerHTML = '';
        transactions.forEach(transaction => {
            transactionsList.insertAdjacentHTML('beforeend', this.createTransactionHTML(transaction, true));
        });

        // Add delete event listeners
        document.querySelectorAll('.delete-transaction').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if (confirm('¿Está seguro de que desea eliminar esta transacción?')) {
                    this.dataStore.deleteTransaction(id);
                    this.updateUI();
                    this.showNotification('Transacción eliminada', 'info');
                }
            });
        });
    }

    createTransactionHTML(transaction, showActions) {
        const categoryObj = this.dataStore.categories.find(c => c.name === transaction.categoria);
        const categoryColor = categoryObj ? categoryObj.color : '#95a5a6';
        
        return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-type ${transaction.tipo}">${transaction.tipo === 'ingreso' ? '📈' : '📉'} ${transaction.tipo.toUpperCase()}</div>
                    <div class="transaction-description">${this.escapeHtml(transaction.descripcion)}</div>
                    <span class="transaction-category" style="background: ${categoryColor}20; color: ${categoryColor};">
                        ${this.escapeHtml(transaction.categoria)}
                    </span>
                    <div class="transaction-date">📅 ${this.formatDate(transaction.fecha)}</div>
                </div>
                <div class="transaction-amount ${transaction.tipo}">
                    ${transaction.tipo === 'ingreso' ? '+' : '-'}${this.formatCurrency(transaction.valor_gasto)}
                </div>
                ${showActions ? `
                    <div class="transaction-actions">
                        <button class="btn-danger delete-transaction" data-id="${transaction.id}">🗑️ Eliminar</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderCategoriesList() {
        const categoriesList = document.getElementById('categories-list');
        categoriesList.innerHTML = '';

        this.dataStore.categories.forEach(category => {
            const html = `
                <div class="category-item">
                    <div class="category-color" style="background: ${category.color};"></div>
                    <div class="category-name">${this.escapeHtml(category.name)}</div>
                    <button class="category-delete" data-name="${this.escapeHtml(category.name)}">🗑️ Eliminar</button>
                </div>
            `;
            categoriesList.insertAdjacentHTML('beforeend', html);
        });

        // Add delete event listeners
        document.querySelectorAll('.category-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.target.dataset.name;
                
                // Check if category is used in transactions
                const isUsed = this.dataStore.transactions.some(t => t.categoria === name);
                if (isUsed) {
                    this.showNotification('No se puede eliminar esta categoría porque está siendo utilizada', 'error');
                    return;
                }

                if (confirm(`¿Está seguro de que desea eliminar la categoría "${name}"?`)) {
                    this.dataStore.deleteCategory(name);
                    this.updateUI();
                    this.showNotification('Categoría eliminada', 'info');
                }
            });
        });
    }

    escapeHtml(text) {
        const htmlEntities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return String(text).replace(/[&<>"']/g, (char) => htmlEntities[char]);
    }

    formatCurrency(amount) {
        // Use es-US for Spanish formatting with USD currency
        return new Intl.NumberFormat('es-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDate(dateString) {
        // Parse date in local timezone to avoid timezone shift issues
        const [year, month, day] = dateString.split('-');
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    const dataStore = new DataStore();
    const uiController = new UIController(dataStore);
    
    // Listen for Chart.js load event to re-render charts
    window.addEventListener('chartjs-loaded', () => {
        uiController.renderCharts();
    });
});
