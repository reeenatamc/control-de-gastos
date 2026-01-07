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

    getTotalIncome() {
        return this.transactions
            .filter(t => t.tipo === 'ingreso')
            .reduce((sum, t) => sum + parseFloat(t.valor_gasto), 0);
    }

    getTotalExpenses() {
        return this.transactions
            .filter(t => t.tipo === 'gasto')
            .reduce((sum, t) => sum + parseFloat(t.valor_gasto), 0);
    }

    getBalance() {
        return this.getTotalIncome() - this.getTotalExpenses();
    }

    getExpensesByCategory() {
        const expenses = this.transactions.filter(t => t.tipo === 'gasto');
        const byCategory = {};

        expenses.forEach(transaction => {
            if (!byCategory[transaction.categoria]) {
                byCategory[transaction.categoria] = 0;
            }
            byCategory[transaction.categoria] += parseFloat(transaction.valor_gasto);
        });

        return byCategory;
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
    }

    handleAddCategory() {
        const name = document.getElementById('new-category').value;
        const color = document.getElementById('category-color').value;

        // Check if category already exists
        if (this.dataStore.categories.some(c => c.name === name)) {
            alert('Esta categoría ya existe');
            return;
        }

        this.dataStore.addCategory({ name, color });
        document.getElementById('add-category-form').reset();
        this.updateUI();
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
    }

    importData(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const success = this.dataStore.importData(e.target.result);
            if (success) {
                alert('Datos importados correctamente');
                this.updateUI();
            } else {
                alert('Error al importar datos. Verifique el formato del archivo.');
            }
        };
        reader.readAsText(file);
    }

    updateUI() {
        this.updateCategorySelects();
        this.updateSummaryCards();
        this.renderCategoryChart();
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
        const income = this.dataStore.getTotalIncome();
        const expenses = this.dataStore.getTotalExpenses();
        const balance = this.dataStore.getBalance();

        document.getElementById('total-income').textContent = this.formatCurrency(income);
        document.getElementById('total-expenses').textContent = this.formatCurrency(expenses);
        document.getElementById('balance').textContent = this.formatCurrency(balance);
    }

    renderCategoryChart() {
        const expensesByCategory = this.dataStore.getExpensesByCategory();
        const chartContainer = document.getElementById('category-chart');
        
        chartContainer.innerHTML = '';

        const entries = Object.entries(expensesByCategory);
        
        if (entries.length === 0) {
            chartContainer.innerHTML = '<p class="empty-state">No hay gastos registrados</p>';
            return;
        }

        const maxAmount = Math.max(...entries.map(([_, amount]) => amount));

        entries.sort((a, b) => b[1] - a[1]).forEach(([category, amount]) => {
            const percentage = (amount / maxAmount) * 100;
            const categoryObj = this.dataStore.categories.find(c => c.name === category);
            const color = categoryObj ? categoryObj.color : '#95a5a6';

            const barHtml = `
                <div class="chart-bar">
                    <div class="chart-label">${category}</div>
                    <div class="chart-bar-container">
                        <div class="chart-bar-fill" style="width: ${percentage}%; background: ${color};"></div>
                    </div>
                    <div class="chart-value">${this.formatCurrency(amount)}</div>
                </div>
            `;
            chartContainer.insertAdjacentHTML('beforeend', barHtml);
        });
    }

    renderRecentTransactions() {
        const recentList = document.getElementById('recent-list');
        const transactions = this.dataStore.getTransactions().slice(0, 5);

        if (transactions.length === 0) {
            recentList.innerHTML = '<p class="empty-state">No hay transacciones recientes</p>';
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
            transactionsList.innerHTML = '<p class="empty-state">No hay transacciones</p>';
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
                    <div class="transaction-type ${transaction.tipo}">${transaction.tipo.toUpperCase()}</div>
                    <div class="transaction-description">${transaction.descripcion}</div>
                    <span class="transaction-category" style="background: ${categoryColor}20; color: ${categoryColor};">
                        ${transaction.categoria}
                    </span>
                    <div class="transaction-date">${this.formatDate(transaction.fecha)}</div>
                </div>
                <div class="transaction-amount ${transaction.tipo}">
                    ${transaction.tipo === 'ingreso' ? '+' : '-'}${this.formatCurrency(transaction.valor_gasto)}
                </div>
                ${showActions ? `
                    <div class="transaction-actions">
                        <button class="btn-danger delete-transaction" data-id="${transaction.id}">Eliminar</button>
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
                    <div class="category-name">${category.name}</div>
                    <button class="category-delete" data-name="${category.name}">Eliminar</button>
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
                    alert('No se puede eliminar esta categoría porque está siendo utilizada en transacciones.');
                    return;
                }

                if (confirm(`¿Está seguro de que desea eliminar la categoría "${name}"?`)) {
                    this.dataStore.deleteCategory(name);
                    this.updateUI();
                }
            });
        });
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString + 'T00:00:00').toLocaleDateString('es-ES', {
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
});
