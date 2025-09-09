// Admin JavaScript
let adminUser = null;
let currentSection = 'dashboard';

// API Base URL
const API_BASE = window.location.origin + '/api';

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    setupAdminEventListeners();
});

// Setup event listeners
function setupAdminEventListeners() {
    // Admin login
    document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
    
    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.section) {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                switchSection(item.dataset.section);
            });
        }
    });
    
    // Manual booking form
    document.getElementById('manualBookingForm').addEventListener('submit', handleManualBooking);
    
    // Manual booking ground change
    document.getElementById('manualGroundNumber').addEventListener('change', updateManualPlayerOptions);
    
    // Modal close handlers
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });
    
    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Check admin authentication
function checkAdminAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        verifyAdminToken(token);
    } else {
        showAdminLogin();
    }
}

// Verify admin token
async function verifyAdminToken(token) {
    try {
        const response = await fetch(`${API_BASE}/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.user.role === 'admin') {
                adminUser = data.user;
                showAdminDashboard();
                loadDashboardData();
            } else {
                localStorage.removeItem('token');
                showAdminLogin();
            }
        } else {
            localStorage.removeItem('token');
            showAdminLogin();
        }
    } catch (error) {
        console.error('Token verification error:', error);
        localStorage.removeItem('token');
        showAdminLogin();
    }
}

// Handle admin login
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.user.role === 'admin') {
            localStorage.setItem('token', data.token);
            adminUser = data.user;
            showAdminDashboard();
            loadDashboardData();
            showAdminMessage('Login successful!', 'success');
        } else {
            showAdminMessage('Invalid admin credentials', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAdminMessage('Login failed. Please try again.', 'error');
    }
}

// Show admin login
function showAdminLogin() {
    document.getElementById('adminLoginScreen').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
}

// Show admin dashboard
function showAdminDashboard() {
    document.getElementById('adminLoginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
    document.getElementById('adminUserName').textContent = adminUser.name;
}

// Switch sections
function switchSection(sectionName) {
    // Update sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    
    // Update content
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionName}Section`).classList.add('active');
    
    currentSection = sectionName;
    
    // Load section-specific data
    switch (sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'bookings':
            loadBookings();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'payments':
            loadPayments();
            break;
        case 'updates':
            loadUpdatesManagement();
            break;
        case 'analytics':
            loadAnalytics();
            break;
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showAdminMessage('Please login first', 'error');
            return;
        }
        
        const response = await fetch(`${API_BASE}/admin/dashboard`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateDashboardStats(data);
            if (data.monthlyRevenue) {
                loadRevenueChart(data.monthlyRevenue);
            }
        } else {
            const errorData = await response.json();
            console.error('Dashboard error:', errorData);
            showAdminMessage('Failed to load dashboard data', 'error');
        }
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showAdminMessage('Failed to load dashboard data', 'error');
    }
}

// Update dashboard stats
function updateDashboardStats(data) {
    document.getElementById('todayBookings').textContent = data.today?.bookings || 0;
    document.getElementById('todayRevenue').textContent = `৳${data.today?.revenue || 0}`;
    document.getElementById('pendingApprovals').textContent = data.pendingApprovals || 0;
    document.getElementById('weeklyBookings').textContent = data.weekly?.bookings || 0;
}

// Load revenue chart
function loadRevenueChart(monthlyData) {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }
    
    const ctx = document.getElementById('revenueChart');
    if (ctx && ctx.chart) {
        ctx.chart.destroy();
    }
    
    const chartData = monthlyData && monthlyData.length > 0 ? monthlyData : [
        { month: '2024-12', revenue: 22000 },
        { month: '2025-01', revenue: 25000 }
    ];
    
    if (ctx) {
        ctx.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.map(item => item.month),
                datasets: [{
                    label: 'Revenue (৳)',
                    data: chartData.map(item => item.revenue),
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                    fill: true
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
}

// Load bookings
async function loadBookings() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showAdminLogin();
            return;
        }
        
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const dateFilter = document.getElementById('dateFilter')?.value || '';
        const groundFilter = document.getElementById('groundFilter')?.value || '';
        
        const params = new URLSearchParams();
        if (statusFilter) params.append('status', statusFilter);
        if (dateFilter) params.append('date', dateFilter);
        if (groundFilter) params.append('ground', groundFilter);
        
        console.log('Loading bookings with filters:', { statusFilter, dateFilter, groundFilter });
        
        const response = await fetch(`${API_BASE}/admin/bookings?${params.toString()}`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const bookings = await response.json();
            console.log('Bookings loaded:', bookings.length);
            displayBookingsTable(bookings);
        } else if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            showAdminLogin();
        } else {
            const errorData = await response.json();
            console.error('Bookings error:', errorData);
            showAdminMessage('Failed to load bookings', 'error');
        }
    } catch (error) {
        console.error('Failed to load bookings:', error);
        showAdminMessage('Failed to load bookings', 'error');
    }
}

// Display bookings table
function displayBookingsTable(bookings) {
    const tbody = document.getElementById('bookingsTableBody');
    
    if (bookings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>No Bookings Found</h3>
                    <p>No bookings match the current filters.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = bookings.map(booking => `
        <tr>
            <td>#${booking.id}</td>
            <td>
                <div>
                    <strong>${booking.user_name || 'Manual Booking'}</strong>
                    <br>
                    <small>${booking.user_email || booking.user_phone || ''}</small>
                </div>
            </td>
            <td>Ground ${booking.ground_number}</td>
            <td>${new Date(booking.booking_date).toLocaleDateString()}</td>
            <td>
                ${booking.start_time} - ${booking.end_time}
                <br>
                <small>(${booking.duration || 60} min)</small>
            </td>
            <td>${booking.duration || 60} min</td>
            <td>${booking.player_count}</td>
            <td>৳${booking.total_amount}</td>
            <td>
                <span class="status-badge payment-${booking.payment_status}">
                    ${booking.payment_status}
                </span>
                <br>
                <small>${booking.payment_method}</small>
                ${booking.payment_screenshot ? `
                    <br><img src="/uploads/payments/${booking.payment_screenshot}" 
                             class="payment-screenshot" 
                             style="max-width: 50px; margin-top: 4px; cursor: pointer;">
                ` : ''}
            </td>
            <td>
                <span class="status-badge status-${booking.booking_status}">
                    ${booking.booking_status}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    ${booking.booking_status === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="updateBookingStatus(${booking.id}, 'confirmed', 'paid')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="updateBookingStatus(${booking.id}, 'cancelled')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-secondary" onclick="viewBookingDetails(${booking.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Add click handlers for payment screenshots in table
    document.querySelectorAll('.payment-screenshot').forEach(img => {
        img.addEventListener('click', function() {
            const filename = this.src.split('/').pop();
            viewPaymentScreenshot(filename);
        });
    });
}

// Update booking status
async function updateBookingStatus(bookingId, status, paymentStatus = null) {
    const action = status === 'confirmed' ? 'approve' : status === 'cancelled' ? 'reject' : status;
    if (!confirm(`Are you sure you want to ${action} this booking?`)) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showAdminLogin();
            return;
        }
        
        console.log('Updating booking status:', { bookingId, status, paymentStatus });
        
        const response = await fetch(`${API_BASE}/admin/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status, paymentStatus })
        });
        
        if (response.ok) {
            showAdminMessage(`Booking ${action}d successfully`, 'success');
            loadBookings(); // Refresh bookings
            loadDashboardData(); // Refresh stats
        } else if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            showAdminLogin();
        } else {
            const errorData = await response.json();
            console.error('Update booking error:', errorData);
            showAdminMessage(errorData.error || 'Failed to update booking', 'error');
        }
    } catch (error) {
        console.error('Update booking error:', error);
        showAdminMessage('Failed to update booking', 'error');
    }
}

// Show manual booking modal
function showManualBookingModal() {
    document.getElementById('manualBookingModal').style.display = 'block';
    
    // Set min date to today and max to 7 days from now
    const today = new Date();
    const maxDate = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    const dateInput = document.getElementById('manualBookingDate');
    dateInput.min = today.toISOString().split('T')[0];
    dateInput.max = maxDate.toISOString().split('T')[0];
}

// Update manual booking player options
function updateManualPlayerOptions() {
    const groundNumber = parseInt(document.getElementById('manualGroundNumber').value);
    const playerCountSelect = document.getElementById('manualPlayerCount');
    
    playerCountSelect.innerHTML = '<option value="">Number of Players</option>';
    
    if (groundNumber === 1) {
        // Ground 1: 7vs7 (up to 14 players)
        for (let i = 2; i <= 14; i++) {
            playerCountSelect.innerHTML += `<option value="${i}">${i} players</option>`;
        }
    } else if (groundNumber === 2) {
        // Ground 2: 6vs6 (up to 12 players)
        for (let i = 2; i <= 12; i++) {
            playerCountSelect.innerHTML += `<option value="${i}">${i} players</option>`;
        }
    }
}

// Calculate end time helper
function calculateEndTime(startTime, duration) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + (duration * 60 * 1000));
    
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
}

// Handle manual booking
async function handleManualBooking(e) {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
        showAdminMessage('Please login first', 'error');
        return;
    }
    
    const groundNumber = document.getElementById('manualGroundNumber').value;
    const startTime = document.getElementById('manualStartTime').value;
    const endTime = document.getElementById('manualEndTime').value;
    
    if (!groundNumber || !startTime || !endTime) {
        showAdminMessage('Please fill all required fields', 'error');
        return;
    }
    
    const formData = {
        customerName: document.getElementById('manualCustomerName').value,
        customerPhone: document.getElementById('manualCustomerPhone').value,
        groundNumber: groundNumber,
        bookingDate: document.getElementById('manualBookingDate').value,
        startTime: startTime,
        endTime: endTime,
        playerCount: document.getElementById('manualPlayerCount').value,
        totalAmount: document.getElementById('manualTotalAmount').value,
        notes: document.getElementById('manualNotes').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/admin/bookings/manual`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showAdminMessage('Manual booking created successfully', 'success');
            document.getElementById('manualBookingModal').style.display = 'none';
            document.getElementById('manualBookingForm').reset();
            loadBookings();
            loadDashboardData();
        } else {
            const errorData = await response.json();
            console.error('Manual booking error:', errorData);
            showAdminMessage(errorData.error || 'Failed to create booking', 'error');
        }
    } catch (error) {
        console.error('Manual booking error:', error);
        showAdminMessage('Failed to create booking', 'error');
    }
}

// Load customers
async function loadCustomers() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showAdminMessage('Please login first', 'error');
            return;
        }
        
        const response = await fetch(`${API_BASE}/admin/customers`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const customers = await response.json();
            displayCustomers(customers);
        } else {
            const errorData = await response.json();
            console.error('Customers error:', errorData);
            showAdminMessage('Failed to load customers', 'error');
        }
    } catch (error) {
        console.error('Failed to load customers:', error);
        showAdminMessage('Failed to load customers', 'error');
    }
}

// Display customers
function displayCustomers(customers) {
    const container = document.getElementById('customersContainer');
    
    if (customers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No Customers Found</h3>
                <p>No customers have registered yet.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = customers.map(customer => `
        <div class="customer-card">
            <div class="customer-header">
                <div>
                    <div class="customer-name">${customer.name}</div>
                    <div class="customer-email">${customer.email}</div>
                    ${customer.phone ? `<div class="customer-phone">${customer.phone}</div>` : ''}
                </div>
                <div class="customer-stats">
                    <div class="customer-stat">
                        <div class="customer-stat-value">${customer.total_bookings || 0}</div>
                        <div class="customer-stat-label">Bookings</div>
                    </div>
                    <div class="customer-stat">
                        <div class="customer-stat-value">৳${customer.total_spent || 0}</div>
                        <div class="customer-stat-label">Spent</div>
                    </div>
                    <div class="customer-stat">
                        <div class="customer-stat-value">${customer.loyalty_points || 0}</div>
                        <div class="customer-stat-label">Points</div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Load payments for verification
async function loadPayments() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showAdminMessage('Please login first', 'error');
            return;
        }
        
        const response = await fetch(`${API_BASE}/admin/bookings?status=pending`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const bookings = await response.json();
            const paymentsWithScreenshots = bookings.filter(b => b.payment_screenshot);
            displayPaymentVerifications(paymentsWithScreenshots);
        } else {
            const errorData = await response.json();
            console.error('Payments error:', errorData);
            showAdminMessage('Failed to load payments', 'error');
        }
    } catch (error) {
        console.error('Failed to load payments:', error);
        showAdminMessage('Failed to load payments', 'error');
    }
}

// Display payment verifications
function displayPaymentVerifications(bookings) {
    const container = document.getElementById('paymentsContainer');
    
    if (bookings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-credit-card"></i>
                <h3>No Pending Payments</h3>
                <p>All payments have been verified.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = bookings.map(booking => `
        <div class="booking-card">
            <div class="booking-header">
                <span class="booking-id">Booking #${booking.id}</span>
                <span class="status-badge payment-${booking.payment_status}">${booking.payment_status}</span>
            </div>
            <div class="booking-details">
                <div class="booking-detail">
                    <span class="booking-detail-label">Customer</span>
                    <span class="booking-detail-value">${booking.user_name}</span>
                </div>
                <div class="booking-detail">
                    <span class="booking-detail-label">Amount</span>
                    <span class="booking-detail-value">৳${booking.total_amount}</span>
                </div>
                <div class="booking-detail">
                    <span class="booking-detail-label">Method</span>
                    <span class="booking-detail-value">${booking.payment_method}</span>
                </div>
                <div class="booking-detail">
                    <span class="booking-detail-label">Date & Time</span>
                    <span class="booking-detail-value">${new Date(booking.booking_date).toLocaleDateString()} ${booking.start_time}</span>
                </div>
            </div>
            ${booking.payment_screenshot ? `
                <div style="margin: 16px 0;">
                    <img src="/uploads/payments/${booking.payment_screenshot}" class="payment-screenshot" alt="Payment Screenshot" style="max-width: 300px; border-radius: 8px; margin-top: 8px; cursor: pointer;" data-screenshot="${booking.payment_screenshot}">
                </div>
            ` : ''}
            <div class="booking-actions">
                <button class="btn btn-success" onclick="updateBookingStatus(${booking.id}, 'confirmed', 'paid')">
                    <i class="fas fa-check"></i> Approve Payment
                </button>
                <button class="btn btn-outline" onclick="updateBookingStatus(${booking.id}, 'cancelled')">
                    <i class="fas fa-times"></i> Reject Payment
                </button>
            </div>
        </div>
    `).join('');
}

// View payment screenshot in modal
function viewPaymentScreenshot(filename) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <span class="close">&times;</span>
            <h3>Payment Screenshot</h3>
            <img src="/uploads/payments/${filename}" style="width: 100%; border-radius: 8px;">
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    modal.querySelector('.close').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Load analytics
async function loadAnalytics() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showAdminMessage('Please login first', 'error');
            return;
        }
        
        const response = await fetch(`${API_BASE}/admin/analytics`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayAnalyticsCharts(data);
        } else {
            const errorData = await response.json();
            console.error('Analytics error:', errorData);
            showAdminMessage('Failed to load analytics', 'error');
        }
    } catch (error) {
        console.error('Failed to load analytics:', error);
        showAdminMessage('Failed to load analytics', 'error');
    }
}

// Display analytics charts
function displayAnalyticsCharts(data) {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }
    
    // Popular slots chart
    const popularSlotsCtx = document.getElementById('popularSlotsChart');
    if (popularSlotsCtx && popularSlotsCtx.chart) {
        popularSlotsCtx.chart.destroy();
    }
    
    if (data.popularSlots && data.popularSlots.length > 0) {
        popularSlotsCtx.chart = new Chart(popularSlotsCtx, {
            type: 'bar',
            data: {
                labels: data.popularSlots.map(slot => slot.start_time),
                datasets: [{
                    label: 'Bookings',
                    data: data.popularSlots.map(slot => slot.bookings),
                    backgroundColor: '#22c55e',
                    borderColor: '#16a34a',
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
                }
            }
        });
    }
    
    // Ground utilization chart
    const groundUtilCtx = document.getElementById('groundUtilizationChart');
    if (groundUtilCtx && groundUtilCtx.chart) {
        groundUtilCtx.chart.destroy();
    }
    
    if (data.groundStats && data.groundStats.length > 0) {
        groundUtilCtx.chart = new Chart(groundUtilCtx, {
            type: 'doughnut',
            data: {
                labels: data.groundStats.map(stat => `Ground ${stat.ground_number}`),
                datasets: [{
                    data: data.groundStats.map(stat => stat.bookings),
                    backgroundColor: ['#22c55e', '#16a34a'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}

// Load updates management
async function loadUpdatesManagement() {
    try {
        const response = await fetch(`${API_BASE}/customer/updates`);
        if (response.ok) {
            const updates = await response.json();
            displayUpdatesManagement(updates);
        } else {
            showAdminMessage('Failed to load updates', 'error');
        }
    } catch (error) {
        console.error('Failed to load updates:', error);
        showAdminMessage('Failed to load updates', 'error');
    }
}

// Display updates management
function displayUpdatesManagement(updates) {
    const container = document.getElementById('updatesManagementContainer');
    
    container.innerHTML = `
        <div class="updates-management">
            ${updates.map(update => `
                <div class="update-management-card">
                    <div class="update-header">
                        <h4>${update.title}</h4>
                        <div>
                            ${update.is_featured ? '<span class="featured-badge">Featured</span>' : ''}
                            <button class="btn btn-sm btn-outline" onclick="editUpdate(${update.id})">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        </div>
                    </div>
                    <p>${update.content}</p>
                    <div class="update-meta">
                        <span>${new Date(update.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Show add update modal
function showAddUpdateModal() {
    showAdminMessage('Update management feature coming soon', 'warning');
}

// Edit update
function editUpdate(updateId) {
    showAdminMessage('Edit update feature coming soon', 'warning');
}

// View booking details
async function viewBookingDetails(bookingId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showAdminMessage('Please login first', 'error');
            return;
        }
        
        const response = await fetch(`${API_BASE}/admin/bookings/${bookingId}`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const booking = await response.json();
            displayBookingDetails(booking);
            document.getElementById('bookingDetailsModal').style.display = 'block';
        } else {
            const errorData = await response.json();
            showAdminMessage(errorData.error || 'Failed to load booking details', 'error');
        }
    } catch (error) {
        console.error('Booking details error:', error);
        showAdminMessage('Failed to load booking details', 'error');
    }
}

// Display booking details
function displayBookingDetails(booking) {
    const container = document.getElementById('bookingDetailsContainer');
    
    container.innerHTML = `
        <div class="booking-details-card">
            <div class="booking-details-header">
                <h4>Booking #${booking.id}</h4>
                <div class="booking-status-badges">
                    <span class="status-badge status-${booking.booking_status}">${booking.booking_status}</span>
                    <span class="status-badge payment-${booking.payment_status}">${booking.payment_status}</span>
                </div>
            </div>
            
            <div class="booking-details-grid">
                <div class="detail-section">
                    <h5>Customer Information</h5>
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${booking.user_name || 'Manual Booking'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${booking.user_email || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Phone:</span>
                        <span class="detail-value">${booking.user_phone || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h5>Booking Information</h5>
                    <div class="detail-item">
                        <span class="detail-label">Ground:</span>
                        <span class="detail-value">Ground ${booking.ground_number}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">${new Date(booking.booking_date).toLocaleDateString()}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Time:</span>
                        <span class="detail-value">${booking.start_time} - ${booking.end_time}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Duration:</span>
                        <span class="detail-value">${booking.duration || 60} minutes</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Players:</span>
                        <span class="detail-value">${booking.player_count}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h5>Payment Information</h5>
                    <div class="detail-item">
                        <span class="detail-label">Amount:</span>
                        <span class="detail-value">৳${booking.total_amount}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Method:</span>
                        <span class="detail-value">${booking.payment_method}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value">
                            <span class="status-badge payment-${booking.payment_status}">${booking.payment_status}</span>
                        </span>
                    </div>
                    ${booking.payment_screenshot ? `
                        <div class="detail-item">
                            <span class="detail-label">Screenshot:</span>
                            <span class="detail-value">
                                <img src="/uploads/payments/${booking.payment_screenshot}" 
                                     class="payment-screenshot-detail" 
                                     alt="Payment Screenshot"
                                     style="max-width: 200px; border-radius: 8px; cursor: pointer;"
                                     onclick="viewPaymentScreenshot('${booking.payment_screenshot}')">
                            </span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            ${booking.notes ? `
                <div class="detail-section">
                    <h5>Notes</h5>
                    <p class="booking-notes">${booking.notes}</p>
                </div>
            ` : ''}
            
            <div class="booking-details-actions">
                ${booking.booking_status === 'pending' ? `
                    <button class="btn btn-success" onclick="updateBookingStatus(${booking.id}, 'confirmed', 'paid'); document.getElementById('bookingDetailsModal').style.display = 'none';">
                        <i class="fas fa-check"></i> Approve Booking
                    </button>
                    <button class="btn btn-outline" onclick="updateBookingStatus(${booking.id}, 'cancelled'); document.getElementById('bookingDetailsModal').style.display = 'none';">
                        <i class="fas fa-times"></i> Reject Booking
                    </button>
                ` : ''}
            </div>
            
            <div class="booking-timestamps">
                <small class="text-muted">Created: ${new Date(booking.created_at).toLocaleString()}</small>
            </div>
        </div>
    `;
}

// View customer details
async function viewCustomerDetails(customerId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showAdminMessage('Please login first', 'error');
            return;
        }
        
        const response = await fetch(`${API_BASE}/admin/customers/${customerId}`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayCustomerDetails(data);
            document.getElementById('customerDetailsModal').style.display = 'block';
        } else {
            const errorData = await response.json();
            showAdminMessage(errorData.error || 'Failed to load customer details', 'error');
        }
    } catch (error) {
        console.error('Customer details error:', error);
        showAdminMessage('Failed to load customer details', 'error');
    }
}

// Display customer details
function displayCustomerDetails(data) {
    const { customer, bookings } = data;
    const container = document.getElementById('customerDetailsContainer');
    
    container.innerHTML = `
        <div class="customer-details-card">
            <div class="customer-details-header">
                <div class="customer-info">
                    <h4>${customer.name}</h4>
                    <p class="customer-email">${customer.email}</p>
                    ${customer.phone ? `<p class="customer-phone">${customer.phone}</p>` : ''}
                </div>
                <div class="customer-stats-summary">
                    <div class="stat-item">
                        <span class="stat-value">${customer.total_bookings || 0}</span>
                        <span class="stat-label">Total Bookings</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">৳${customer.total_spent || 0}</span>
                        <span class="stat-label">Total Spent</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${customer.loyalty_points || 0}</span>
                        <span class="stat-label">Loyalty Points</span>
                    </div>
                </div>
            </div>
            
            <div class="customer-details-section">
                <h5>Account Information</h5>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Member Since:</span>
                        <span class="detail-value">${new Date(customer.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Account Type:</span>
                        <span class="detail-value">${customer.role}</span>
                    </div>
                </div>
            </div>
            
            <div class="customer-details-section">
                <h5>Recent Bookings</h5>
                ${bookings.length > 0 ? `
                    <div class="customer-bookings-list">
                        ${bookings.map(booking => `
                            <div class="customer-booking-item">
                                <div class="booking-summary">
                                    <span class="booking-ground">Ground ${booking.ground_number}</span>
                                    <span class="booking-date">${new Date(booking.booking_date).toLocaleDateString()}</span>
                                    <span class="booking-time">${booking.start_time}</span>
                                    <span class="booking-amount">৳${booking.total_amount}</span>
                                </div>
                                <div class="booking-status-small">
                                    <span class="status-badge status-${booking.booking_status}">${booking.booking_status}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p class="no-bookings">No bookings found</p>'}
            </div>
        </div>
    `;
}

// Refresh dashboard
function refreshDashboard() {
    loadDashboardData();
    showAdminMessage('Dashboard refreshed', 'success');
}

// Admin logout
function adminLogout() {
    localStorage.removeItem('token');
    adminUser = null;
    showAdminLogin();
}

// Show admin messages
function showAdminMessage(text, type = 'success') {
    let container = document.getElementById('adminMessageContainer');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'adminMessageContainer';
        container.className = 'message-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
        `;
        document.body.appendChild(container);
    }
    
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
        ${text}
    `;
    
    container.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 5000);
}

// Auto-refresh dashboard every 30 seconds
setInterval(() => {
    if (currentSection === 'dashboard' && adminUser) {
        loadDashboardData();
    }
}, 30000);