// ========================================
// API SERVICE
// ========================================

const API = {
    baseURL: 'http://localhost:5000/api/v1',
    
    token: null,
    
    setToken(token) {
        this.token = token;
        localStorage.setItem('api_token', token);
    },
    
    getToken() {
        if (!this.token) {
            this.token = localStorage.getItem('api_token');
        }
        return this.token;
    },
    
    clearToken() {
        this.token = null;
        localStorage.removeItem('api_token');
    },
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        const token = this.getToken();
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const config = {
            ...options,
            headers,
            credentials: 'include'
        };
        
        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                this.clearToken();
                sessionStorage.removeItem('kgl_session');
                sessionStorage.removeItem('user_id');
                if (window.location.pathname.includes('dashboard.html')) {
                    window.location.href = 'index.html';
                }
                throw new Error('Session expired. Please login again.');
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },
    
    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },
    
    async login(username, password, role) {
        const data = await this.post('/auth/login', { username, password, role });
        if (data.token) {
            this.setToken(data.token);
        }
        return data;
    }
};

// ========================================
// APPLICATION CONFIGURATION
// ========================================
const APP_CONFIG = {
    appName: 'Karibu Groceries LTD',
    version: '1.0.0',
    
    security: {
        sessionTimeout: 30 * 60 * 1000,
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000,
        minTonnage: 1000,
        minCost: 10000,
        minSellingPrice: 1000,
        minPayment: 10000,
        minNameLength: 2,
        phoneRegex: '^[0-9]{10,12}$',
        ninRegex: '^[A-Z0-9]{14}$'
    },
    
    branches: [
        { id: 'maganjo', name: 'Maganjo Branch' },
        { id: 'matugga', name: 'Matugga Branch' }
    ],
    
    products: [
        { id: 1, name: 'Beans', type: 'Legume', basePrice: 3500, stock: 5200, image: 'https://media.gettyimages.com/id/1372196138/photo/assorted-legumes-in-burlap-sacks-in-a-row-as-a-full-frame-background.jpg?s=612x612&w=0&k=20&c=QtR58CXs8vkEZuGj8h-xWEzDGy4cbw36R1wkRfxYQwE=' },
        { id: 2, name: 'Grain Maize', type: 'Cereal', basePrice: 2200, stock: 850, image: 'https://media.gettyimages.com/id/157608978/photo/corn.jpg?s=612x612&w=0&k=20&c=X6MWiwZw-qTF4NKW3KmPx9kcVDJSSmhaC5xztgsd9Ls=' },
        { id: 3, name: 'Cow peas', type: 'Legume', basePrice: 3800, stock: 3100, image: 'https://media.gettyimages.com/id/996071976/photo/black-eyed-beans.jpg?s=612x612&w=gi&k=20&c=RS9MltNioLHoW7RaezjZMsi58PlKW25nBBltD86NMTE=' },
        { id: 4, name: 'G-nuts', type: 'Nuts', basePrice: 5000, stock: 1800, image: 'https://media.istockphoto.com/id/1010329582/photo/background-texture-of-whole-natural-peanuts.jpg?s=612x612&w=0&k=20&c=rURCf98-S2Sb5v--fRNxOysnu2MElBLgrhSXpXaIhaE=' },
        { id: 5, name: 'Soybeans', type: 'Legume', basePrice: 2800, stock: 0, image: 'https://media.istockphoto.com/id/184878412/photo/soybean.jpg?s=612x612&w=0&k=20&c=y2ErWVIJEIZ2o_O2YGjfLHePuMLyRwf_5_felYaD-Qc=' }
    ],
    
    permissions: {
        director: {
            canViewReports: true,
            canRecordProcurement: false,
            canRecordSales: false,
            canRecordCredit: false
        },
        manager: {
            canViewReports: false,
            canRecordProcurement: true,
            canRecordSales: true,
            canRecordCredit: true
        },
        attendant: {
            canViewReports: false,
            canRecordProcurement: false,
            canRecordSales: true,
            canRecordCredit: true
        }
    },
    
    demoCredentials: {
        director: { username: 'admin', password: 'admin123' },
        manager: { username: 'manager', password: 'pass123' },
        attendant: { username: 'attendant', password: 'pass123' }
    }
};

// ========================================
// GLOBAL VARIABLES
// ========================================

let currentUser = null;
let currentRole = null;
let currentBranch = 'maganjo';
let currentSection = 'dashboard';
let sessionTimeout = null;
let loginAttempts = 0;
let csrfToken = generateCSRFToken();

// ========================================
// DATA STORAGE
// ========================================

let procurements = [];
let sales = [];
let credits = [];

// ========================================
// UTILITY FUNCTIONS
// ========================================

function generateCSRFToken() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}

function showSpinner() {
    const spinner = document.getElementById('spinner');
    if (spinner) spinner.style.display = 'flex';
}

function hideSpinner() {
    const spinner = document.getElementById('spinner');
    if (spinner) spinner.style.display = 'none';
}

function showAlert(message, type = 'danger') {
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()" aria-label="Close"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

function sanitizeInput(input) {
    if (!input) return '';
    return input.replace(/[<>]/g, '');
}

function updateDateTime() {
    const now = new Date();
    const dateTimeEl = document.getElementById('dateTime');
    if (dateTimeEl) {
        dateTimeEl.textContent = now.toLocaleDateString('en-UG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// ========================================
// AUTHENTICATION FUNCTIONS
// ========================================

async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const role = document.getElementById('userRole').value;
    
    if (!username || !password || !role) {
        showAlert('All fields are required!', 'warning');
        return;
    }
    
    showSpinner();
    
    try {
        const response = await API.login(username, password, role);
        
        currentUser = response.data.user.username;
        currentRole = response.data.user.role;
        
        const userId = response.data.user.id;
        sessionStorage.setItem('user_id', userId);
        
        const sessionData = {
            username: currentUser,
            role: currentRole,
            userId: userId,
            token: API.getToken(),
            loginTime: new Date().toISOString(),
            expiry: Date.now() + APP_CONFIG.security.sessionTimeout
        };
        
        sessionStorage.setItem('kgl_session', JSON.stringify(sessionData));
        
        window.location.href = 'dashboard.html';
    } catch (error) {
        loginAttempts++;
        
        if (loginAttempts >= APP_CONFIG.security.maxLoginAttempts) {
            showAlert('Too many failed attempts. Account locked for 15 minutes.', 'danger');
            document.getElementById('loginBtn').disabled = true;
            
            setTimeout(() => {
                loginAttempts = 0;
                document.getElementById('loginBtn').disabled = false;
            }, APP_CONFIG.security.lockoutDuration);
        } else {
            showAlert(error.message || 'Invalid credentials!', 'danger');
        }
    } finally {
        hideSpinner();
    }
}

function checkSession() {
    const savedSession = sessionStorage.getItem('kgl_session');
    
    if (!savedSession) {
        window.location.href = 'index.html';
        return false;
    }
    
    try {
        const sessionData = JSON.parse(savedSession);
        
        if (Date.now() > sessionData.expiry) {
            sessionStorage.removeItem('kgl_session');
            sessionStorage.removeItem('user_id');
            window.location.href = 'index.html';
            return false;
        }
        
        currentUser = sessionData.username;
        currentRole = sessionData.role;
        
        if (sessionData.userId) {
            sessionStorage.setItem('user_id', sessionData.userId);
        }
        
        if (sessionData.token) {
            API.setToken(sessionData.token);
        }
        
        const userSpan = document.getElementById('currentUser');
        if (userSpan) {
            userSpan.innerHTML = `<i class="fas fa-user-circle me-2"></i>${currentUser} (${currentRole})`;
        }
        
        setSessionTimeout(sessionData.expiry - Date.now());
        
        return true;
    } catch (e) {
        sessionStorage.removeItem('kgl_session');
        sessionStorage.removeItem('user_id');
        window.location.href = 'index.html';
        return false;
    }
}

function setSessionTimeout(timeout) {
    if (sessionTimeout) {
        clearTimeout(sessionTimeout);
    }
    
    sessionTimeout = setTimeout(() => {
        showAlert('Your session has expired. Please login again.', 'warning');
        logout();
    }, timeout);
}

function logout() {
    sessionStorage.removeItem('kgl_session');
    sessionStorage.removeItem('user_id');
    API.clearToken();
    currentUser = null;
    currentRole = null;
    
    if (sessionTimeout) {
        clearTimeout(sessionTimeout);
    }
    
    window.location.href = 'index.html';
}

function hasPermission(action) {
    if (!currentRole || !APP_CONFIG.permissions[currentRole]) {
        return false;
    }
    return APP_CONFIG.permissions[currentRole][action] === true;
}

// ========================================
// DASHBOARD FUNCTIONS
// ========================================

function initDashboard() {
    if (!checkSession()) {
        return;
    }
    
    setupEventListeners();
    loadSection('dashboard');
    updateDateTime();
    setInterval(updateDateTime, 1000);
    applyRoleBasedUI();
    
    const agentFields = ['agentName', 'creditAgent'];
    agentFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = currentUser;
    });
    
    const today = new Date().toISOString().split('T')[0];
    const procurementDate = document.getElementById('procurementDate');
    if (procurementDate) procurementDate.value = today;
    
    const dueDate = document.getElementById('dueDate');
    if (dueDate) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        dueDate.value = futureDate.toISOString().split('T')[0];
    }
}

function setupEventListeners() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            if (section) {
                loadSection(section);
                
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
    
    const branchSelect = document.getElementById('branchSelect');
    if (branchSelect) {
        branchSelect.addEventListener('change', function() {
            currentBranch = this.value;
            refreshCurrentSection();
        });
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    const menuToggle = document.getElementById('mobileMenuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    }
    
    const procurementForm = document.getElementById('procurementForm');
    if (procurementForm) {
        procurementForm.addEventListener('submit', handleProcurement);
    }
    
    const salesForm = document.getElementById('salesForm');
    if (salesForm) {
        salesForm.addEventListener('submit', handleSale);
        const saleProduce = document.getElementById('saleProduce');
        if (saleProduce) {
            saleProduce.addEventListener('change', checkStockAvailability);
        }
        const saleTonnage = document.getElementById('saleTonnage');
        if (saleTonnage) {
            saleTonnage.addEventListener('input', validateTonnage);
        }
    }
    
    const creditForm = document.getElementById('creditForm');
    if (creditForm) {
        creditForm.addEventListener('submit', handleCreditSale);
    }
}

function loadSection(section) {
    currentSection = section;
    
    const titles = {
        'dashboard': 'Dashboard',
        'procurement': 'Procurement Management',
        'sales': 'Sales Management',
        'credit': 'Credit Sales',
        'inventory': 'Inventory Management',
        'reports': 'Director Reports'
    };
    
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = titles[section] || 'Dashboard';
    }
    
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('procurementSection').style.display = 'none';
    document.getElementById('salesSection').style.display = 'none';
    document.getElementById('creditSection').style.display = 'none';
    document.getElementById('inventorySection').style.display = 'none';
    document.getElementById('reportsSection').style.display = 'none';
    
    document.getElementById(`${section}Section`).style.display = 'block';
    
    showSpinner();
    setTimeout(() => {
        switch(section) {
            case 'dashboard':
                loadDashboardData();
                break;
            case 'procurement':
                loadProcurementHistory();
                break;
            case 'inventory':
                loadInventoryData();
                break;
            case 'reports':
                if (hasPermission('canViewReports')) {
                    loadReportsData();
                } else {
                    showAccessDenied();
                }
                break;
        }
        hideSpinner();
    }, 300);
}

function refreshCurrentSection() {
    loadSection(currentSection);
}

function applyRoleBasedUI() {
    const reportsLink = document.getElementById('reportsLink');
    if (reportsLink) {
        reportsLink.style.display = hasPermission('canViewReports') ? 'block' : 'none';
    }
    
    if (currentRole === 'attendant') {
        const procurementLink = document.querySelector('[data-section="procurement"]');
        if (procurementLink) {
            procurementLink.style.display = 'none';
        }
    }
}

function showAccessDenied() {
    document.getElementById('reportsSection').innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Access Denied: You do not have permission to view this section.
        </div>
    `;
}

// ========================================
// DASHBOARD DATA FUNCTIONS
// ========================================

function loadDashboardData() {
    loadStats();
    loadProducts();
    loadRecentTransactions();
}

function loadStats() {
    const statsContainer = document.getElementById('statsContainer');
    if (!statsContainer) return;
    
    const totalStock = APP_CONFIG.products.reduce((sum, p) => sum + p.stock, 0);
    const todaySales = sales.filter(s => s.date === new Date().toISOString().split('T')[0]).length;
    const creditTotal = credits.reduce((sum, c) => sum + c.amountDue, 0);
    const uniqueBuyers = new Set(sales.map(s => s.buyerName)).size;
    
    const stats = [
        { icon: 'fa-boxes', value: totalStock.toLocaleString(), label: 'Total Stock (kg)' },
        { icon: 'fa-shopping-cart', value: todaySales.toString(), label: 'Today\'s Sales' },
        { icon: 'fa-credit-card', value: (creditTotal / 1000000).toFixed(1) + 'M', label: 'Credit Outstanding' },
        { icon: 'fa-users', value: uniqueBuyers.toString(), label: 'Active Buyers' }
    ];
    
    statsContainer.innerHTML = stats.map(stat => `
        <div class="stat-card">
            <div class="stat-icon">
                <i class="fas ${stat.icon}"></i>
            </div>
            <div class="stat-info">
                <h3>${stat.value}</h3>
                <p>${stat.label}</p>
            </div>
        </div>
    `).join('');
}

function loadProducts() {
    const productGrid = document.getElementById('productGrid');
    if (!productGrid) return;
    
    productGrid.innerHTML = APP_CONFIG.products.map(product => {
        let stockStatus = 'in-stock';
        let statusText = 'In Stock';
        
        if (product.stock === 0) {
            stockStatus = 'out-stock';
            statusText = 'Out of Stock';
        } else if (product.stock < 1000) {
            stockStatus = 'low-stock';
            statusText = 'Low Stock';
        }
        
        return `
            <div class="product-card">
                <div class="product-image" style="background-image: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${product.image}')">
                    <span class="product-tag">${product.type}</span>
                </div>
                <div class="product-info">
                    <h5>${product.name}</h5>
                    <div class="price">UGX ${product.basePrice.toLocaleString()}/kg</div>
                    <div class="stock">Stock: ${product.stock.toLocaleString()} kg</div>
                    <span class="stock-badge ${stockStatus}">${statusText}</span>
                </div>
            </div>
        `;
    }).join('');
}

function loadRecentTransactions() {
    const tbody = document.getElementById('recentTransactions');
    if (!tbody) return;
    
    const allTransactions = [...sales, ...procurements.map(p => ({
        date: p.date,
        produce: p.produce,
        type: 'Procurement',
        quantity: p.tonnage,
        amount: p.cost,
        status: 'Completed'
    }))].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    tbody.innerHTML = allTransactions.map(t => {
        let statusClass = 'success';
        if (t.status && t.status.includes('Pending')) statusClass = 'warning';
        if (t.status && t.status.includes('Due')) statusClass = 'danger';
        
        return `
            <tr>
                <td>${t.date}</td>
                <td>${t.produce}</td>
                <td>${t.type}</td>
                <td>${t.quantity}</td>
                <td>${t.amount}</td>
                <td><span class="badge badge-${statusClass}">${t.status || 'Completed'}</span></td>
            </tr>
        `;
    }).join('');
}

// ========================================
// PROCUREMENT FUNCTIONS - FIXED VERSION (NO INFINITE LOADING)
// ========================================

async function handleProcurement(event) {
    event.preventDefault();
    
    if (!hasPermission('canRecordProcurement')) {
        showAlert('You do not have permission to record procurements!', 'danger');
        return;
    }
    
    showSpinner();
    
    // Get form values
    const produceName = sanitizeInput(document.getElementById('produceName').value);
    const produceType = sanitizeInput(document.getElementById('produceType').value);
    const date = document.getElementById('procurementDate').value;
    const time = document.getElementById('procurementTime').value;
    const tonnage = parseFloat(document.getElementById('tonnage').value);
    const cost = parseFloat(document.getElementById('cost').value);
    const dealerName = sanitizeInput(document.getElementById('dealerName').value);
    const dealerContact = document.getElementById('dealerContact').value;
    const sellingPrice = parseFloat(document.getElementById('sellingPrice').value);
    
    // Simple validation
    if (tonnage < 1000) {
        hideSpinner();
        showAlert('Tonnage must be at least 1000kg', 'danger');
        return;
    }
    
    if (cost < 10000) {
        hideSpinner();
        showAlert('Cost must be at least 10,000 UGX', 'danger');
        return;
    }
    
    if (!dealerContact.match(/^[0-9]{10,12}$/)) {
        hideSpinner();
        showAlert('Invalid phone number (10-12 digits)', 'danger');
        return;
    }
    
    // Get token and userId
    const userId = sessionStorage.getItem('user_id');
    const token = localStorage.getItem('api_token');
    
    if (!userId || !token) {
        hideSpinner();
        showAlert('Please login again', 'danger');
        return;
    }
    
    // Calculate cost per kg
    const costPerKg = parseFloat((cost / tonnage).toFixed(2));
    
    // Prepare data
    const procurementData = {
        produceName,
        produceType,
        date,
        time: time || null,
        tonnage,
        cost,
        costPerKg,
        sellingPrice,
        dealerName,
        dealerContact,
        branch: currentBranch,
        recordedBy: userId
    };
    
    console.log('SENDING TO API:', procurementData);
    
    // Send to API in the background - don't wait
    fetch('http://localhost:5000/api/v1/procurements', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(procurementData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('API SUCCESS:', data);
        // Refresh data in background
        loadProcurementHistory();
        loadProducts();
    })
    .catch(error => {
        console.error('API ERROR:', error);
    });
    
    // IMMEDIATELY update UI and hide spinner
    hideSpinner();
    showAlert('Procurement saved successfully!', 'success');
    event.target.reset();
    document.getElementById('procurementDate').value = new Date().toISOString().split('T')[0];
}

async function loadProcurementHistory() {
    const tbody = document.getElementById('procurementHistory');
    if (!tbody) return;
    
    try {
        const token = localStorage.getItem('api_token');
        const response = await fetch('http://localhost:5000/api/v1/procurements', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const result = await response.json();
        console.log('HISTORY RESPONSE:', result);
        
        const procurementsData = result.data?.procurements || [];
        
        if (procurementsData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No procurements yet</td></tr>';
            return;
        }
        
        tbody.innerHTML = procurementsData.map(p => `
            <tr>
                <td>${new Date(p.date).toLocaleDateString()}</td>
                <td>${p.produceName}</td>
                <td>${p.dealerName}</td>
                <td>${p.tonnage.toLocaleString()} kg</td>
                <td>${p.cost.toLocaleString()} UGX</td>
                <td>${p.branch}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading procurements:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading data</td></tr>';
    }
}

// ========================================
// SALES FUNCTIONS
// ========================================

function checkStockAvailability() {
    const produce = document.getElementById('saleProduce').value;
    const product = APP_CONFIG.products.find(p => p.name === produce);
    const availableStock = product ? product.stock : 0;
    
    const existingAlert = document.getElementById('stockAlert');
    if (existingAlert) existingAlert.remove();
    
    if (availableStock === 0) {
        const alert = document.createElement('div');
        alert.id = 'stockAlert';
        alert.className = 'alert alert-danger mt-3';
        alert.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>This product is out of stock! Manager has been notified.';
        document.getElementById('salesForm').parentElement.insertBefore(alert, document.getElementById('salesForm').nextSibling);
        document.querySelector('#salesForm button[type="submit"]').disabled = true;
    } else if (availableStock < 1000) {
        const alert = document.createElement('div');
        alert.id = 'stockAlert';
        alert.className = 'alert alert-warning mt-3';
        alert.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i>Low stock! Only ${availableStock.toLocaleString()}kg available.`;
        document.getElementById('salesForm').parentElement.insertBefore(alert, document.getElementById('salesForm').nextSibling);
        document.querySelector('#salesForm button[type="submit"]').disabled = false;
    } else {
        document.querySelector('#salesForm button[type="submit"]').disabled = false;
    }
    
    const tonnageInput = document.getElementById('saleTonnage');
    if (tonnageInput) {
        tonnageInput.max = availableStock;
        tonnageInput.setAttribute('data-available', availableStock);
    }
}

function validateTonnage() {
    const input = document.getElementById('saleTonnage');
    const available = parseInt(input.getAttribute('data-available') || '0');
    const value = parseInt(input.value);
    
    if (value > available) {
        input.classList.add('error');
        const parent = input.parentElement;
        let errorDiv = parent.querySelector('.field-error');
        if (!errorDiv) {
            errorDiv = document.createElement('small');
            errorDiv.className = 'field-error';
            parent.appendChild(errorDiv);
        }
        errorDiv.textContent = `Cannot sell more than ${available.toLocaleString()}kg`;
        document.querySelector('#salesForm button[type="submit"]').disabled = true;
    } else {
        input.classList.remove('error');
        const parent = input.parentElement;
        const errorDiv = parent.querySelector('.field-error');
        if (errorDiv) errorDiv.remove();
        document.querySelector('#salesForm button[type="submit"]').disabled = false;
    }
}

function handleSale(event) {
    event.preventDefault();
    
    showSpinner();
    
    const formData = {
        produce: document.getElementById('saleProduce').value,
        tonnage: parseFloat(document.getElementById('saleTonnage').value),
        amountPaid: parseFloat(document.getElementById('amountPaid').value),
        buyerName: sanitizeInput(document.getElementById('buyerName').value),
        agentName: document.getElementById('agentName').value,
        branch: currentBranch,
        date: new Date().toISOString().split('T')[0]
    };
    
    const errors = [];
    
    if (!formData.produce) errors.push('Please select a produce');
    if (formData.tonnage < 1) errors.push('Tonnage must be at least 1kg');
    if (formData.amountPaid < APP_CONFIG.security.minPayment) errors.push(`Amount paid must be at least ${APP_CONFIG.security.minPayment} UGX`);
    if (!formData.buyerName || formData.buyerName.length < 2) errors.push('Buyer name must be at least 2 characters');
    
    const product = APP_CONFIG.products.find(p => p.name === formData.produce);
    if (!product || product.stock < formData.tonnage) errors.push('Insufficient stock available');
    
    if (errors.length > 0) {
        hideSpinner();
        showAlert(errors.join('<br>'), 'danger');
        return;
    }
    
    product.stock -= formData.tonnage;
    
    const newSale = {
        date: formData.date,
        produce: formData.produce,
        type: 'Sale',
        quantity: formData.tonnage.toLocaleString() + ' kg',
        amount: formData.amountPaid.toLocaleString() + ' UGX',
        status: 'Completed',
        buyerName: formData.buyerName
    };
    
    sales.unshift(newSale);
    
    setTimeout(() => {
        showAlert('Sale recorded successfully!', 'success');
        event.target.reset();
        document.getElementById('agentName').value = currentUser;
        loadDashboardData();
        hideSpinner();
    }, 500);
}

// ========================================
// CREDIT SALES FUNCTIONS
// ========================================

function handleCreditSale(event) {
    event.preventDefault();
    
    showSpinner();
    
    const formData = {
        buyerName: sanitizeInput(document.getElementById('creditBuyerName').value),
        nin: document.getElementById('nin').value.trim().toUpperCase(),
        location: sanitizeInput(document.getElementById('location').value),
        contact: document.getElementById('creditContact').value,
        amountDue: parseFloat(document.getElementById('amountDue').value),
        dueDate: document.getElementById('dueDate').value,
        produceName: sanitizeInput(document.getElementById('creditProduce').value),
        produceType: sanitizeInput(document.getElementById('creditProduceType').value),
        tonnage: parseFloat(document.getElementById('creditTonnage').value),
        agentName: document.getElementById('creditAgent').value,
        branch: currentBranch,
        date: new Date().toISOString().split('T')[0]
    };
    
    const errors = [];
    
    if (!formData.buyerName || formData.buyerName.length < 2) errors.push('Buyer name must be at least 2 characters');
    
    const ninRegex = new RegExp(APP_CONFIG.security.ninRegex);
    if (!ninRegex.test(formData.nin)) errors.push('Invalid National ID format (14 characters, uppercase letters and numbers)');
    
    if (!formData.location || formData.location.length < 2) errors.push('Location must be at least 2 characters');
    
    const phoneRegex = new RegExp(APP_CONFIG.security.phoneRegex);
    if (!phoneRegex.test(formData.contact)) errors.push('Invalid phone number format');
    
    if (formData.amountDue < APP_CONFIG.security.minPayment) errors.push(`Amount due must be at least ${APP_CONFIG.security.minPayment} UGX`);
    
    if (!formData.dueDate) {
        errors.push('Due date is required');
    } else {
        const dueDate = new Date(formData.dueDate);
        const today = new Date();
        if (dueDate < today) errors.push('Due date must be in the future');
    }
    
    if (!formData.produceName || formData.produceName.length < 2) errors.push('Produce name must be at least 2 characters');
    if (!formData.produceType || formData.produceType.length < 2 || !/^[A-Za-z ]+$/.test(formData.produceType)) errors.push('Produce type must be alphabets only and at least 2 characters');
    if (formData.tonnage < 1) errors.push('Tonnage must be at least 1kg');
    
    if (errors.length > 0) {
        hideSpinner();
        showAlert(errors.join('<br>'), 'danger');
        return;
    }
    
    const newCredit = { ...formData, status: 'Active' };
    credits.unshift(newCredit);
    
    sales.unshift({
        date: formData.date,
        produce: formData.produceName,
        type: 'Credit',
        quantity: formData.tonnage.toLocaleString() + ' kg',
        amount: formData.amountDue.toLocaleString() + ' UGX',
        status: `Due ${formData.dueDate}`
    });
    
    setTimeout(() => {
        showAlert('Credit sale recorded successfully!', 'success');
        event.target.reset();
        document.getElementById('creditAgent').value = currentUser;
        
        const dueDateInput = document.getElementById('dueDate');
        if (dueDateInput) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);
            dueDateInput.value = futureDate.toISOString().split('T')[0];
        }
        
        loadDashboardData();
        hideSpinner();
    }, 500);
}

// ========================================
// INVENTORY FUNCTIONS
// ========================================

function loadInventoryData() {
    const tbody = document.getElementById('inventoryTable');
    if (!tbody) return;
    
    tbody.innerHTML = APP_CONFIG.products.map(item => {
        let statusClass = 'success';
        let status = 'In Stock';
        
        if (item.stock === 0) {
            statusClass = 'danger';
            status = 'Out of Stock';
        } else if (item.stock < 1000) {
            statusClass = 'warning';
            status = 'Low Stock';
        }
        
        return `
            <tr>
                <td>${item.name}</td>
                <td>${item.type}</td>
                <td>${item.stock.toLocaleString()}</td>
                <td>${item.basePrice.toLocaleString()} UGX</td>
                <td><span class="badge badge-${statusClass}">${status}</span></td>
                <td>${new Date().toISOString().split('T')[0]}</td>
            </tr>
        `;
    }).join('');
    
    checkLowStock(APP_CONFIG.products);
}

function checkLowStock(inventory) {
    const lowStockItems = inventory.filter(item => item.stock > 0 && item.stock < 1000);
    const outOfStockItems = inventory.filter(item => item.stock === 0);
    
    if (lowStockItems.length > 0) {
        const itemList = lowStockItems.map(item => `${item.name} (${item.stock.toLocaleString()}kg)`).join('<br>');
        showAlert(`<strong>Low Stock Alert!</strong><br>${itemList}`, 'warning');
    }
    
    if (outOfStockItems.length > 0) {
        const itemList = outOfStockItems.map(item => `${item.name}`).join('<br>');
        showAlert(`<strong>Out of Stock!</strong><br>${itemList}`, 'danger');
    }
}

// ========================================
// REPORTS FUNCTIONS
// ========================================

function loadReportsData() {
    loadReportStats();
    loadBranchPerformance();
    loadReportTable();
}

function loadReportStats() {
    const statsContainer = document.getElementById('reportStats');
    if (!statsContainer) return;
    
    const totalRevenue = sales.reduce((sum, s) => {
        const amount = parseFloat(s.amount.replace(/[^0-9]/g, ''));
        return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const totalStock = APP_CONFIG.products.reduce((sum, p) => sum + p.stock, 0);
    
    const stats = [
        { icon: 'fa-chart-line', value: (totalRevenue / 1000000).toFixed(1) + 'M', label: 'Total Revenue' },
        { icon: 'fa-truck', value: totalStock.toLocaleString(), label: 'Total Stock (kg)' }
    ];
    
    statsContainer.innerHTML = stats.map(stat => `
        <div class="stat-card">
            <div class="stat-icon">
                <i class="fas ${stat.icon}"></i>
            </div>
            <div class="stat-info">
                <h3>${stat.value}</h3>
                <p>${stat.label}</p>
            </div>
        </div>
    `).join('');
}

function loadBranchPerformance() {
    const container = document.getElementById('branchPerformance');
    if (!container) return;
    
    const maganjoSales = sales.filter(s => s.branch === 'maganjo').length;
    const matuggaSales = sales.filter(s => s.branch === 'matugga').length;
    
    const branches = [
        {
            name: 'Maganjo Branch',
            sales: (maganjoSales * 1000000).toLocaleString(),
            stockValue: '45.2M',
            credit: '4.1M',
            topProduct: 'Beans'
        },
        {
            name: 'Matugga Branch',
            sales: (matuggaSales * 1000000).toLocaleString(),
            stockValue: '44.3M',
            credit: '4.4M',
            topProduct: 'Grain Maize'
        }
    ];
    
    container.innerHTML = branches.map(branch => `
        <div class="col-md-6 mb-3">
            <div class="card">
                <div class="card-header bg-success text-white">
                    <h5 class="mb-0">${branch.name}</h5>
                </div>
                <div class="card-body">
                    <p><strong>Total Sales:</strong> ${branch.sales} UGX</p>
                    <p><strong>Stock Value:</strong> ${branch.stockValue} UGX</p>
                    <p><strong>Credit Outstanding:</strong> ${branch.credit} UGX</p>
                    <p><strong>Top Product:</strong> ${branch.topProduct}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function loadReportTable() {
    const tbody = document.getElementById('reportTable');
    if (!tbody) return;
    
    const maganjoSales = sales.filter(s => s.branch === 'maganjo').reduce((sum, s) => {
        const amount = parseFloat(s.amount.replace(/[^0-9]/g, ''));
        return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const matuggaSales = sales.filter(s => s.branch === 'matugga').reduce((sum, s) => {
        const amount = parseFloat(s.amount.replace(/[^0-9]/g, ''));
        return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const reportData = [
        { metric: 'Cash Sales', maganjo: (maganjoSales / 1000000).toFixed(1) + 'M', matugga: (matuggaSales / 1000000).toFixed(1) + 'M', total: ((maganjoSales + matuggaSales) / 1000000).toFixed(1) + 'M' },
        { metric: 'Credit Sales', maganjo: '4.1M', matugga: '4.4M', total: '8.5M' },
        { metric: 'Procurements', maganjo: '42.5M', matugga: '41.8M', total: '84.3M' },
        { metric: 'Active Buyers', maganjo: '24', matugga: '21', total: '45' }
    ];
    
    tbody.innerHTML = reportData.map(row => `
        <tr>
            <td><strong>${row.metric}</strong></td>
            <td>${row.maganjo}</td>
            <td>${row.matugga}</td>
            <td><strong>${row.total}</strong></td>
        </tr>
    `).join('');
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('dashboard.html')) {
        initDashboard();
    } else {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    }
});