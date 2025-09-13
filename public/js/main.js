// Global variables
let currentUser = null;
let selectedGround = null;
let selectedDate = null;
let selectedStartTime = null;
let selectedDuration = null;
let selectedAmount = 0;

// API Base URL
const API_BASE = window.location.origin + '/api';

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadUpdates();
    checkAuthStatus();
    setDateLimits();
});

// Initialize app
function initializeApp() {
    const token = localStorage.getItem('token');
    if (token) {
        verifyToken(token);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.getElementById('loginBtn').addEventListener('click', () => showAuthModal('login'));
    document.getElementById('registerBtn').addEventListener('click', () => showAuthModal('register'));
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('myBookingsBtn').addEventListener('click', showMyBookings);
    
    // Auth forms
    document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement').addEventListener('submit', handleRegister);
    
    // Booking system
    document.getElementById('bookingDate').addEventListener('change', handleDateChange);
    document.getElementById('startTime').addEventListener('change', handleTimeChange);
    document.getElementById('paymentMethod').addEventListener('change', handlePaymentMethodChange);
    document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
    document.getElementById('checkAvailabilityBtn').addEventListener('click', checkAvailability);
    
    // Ground selection
    document.querySelectorAll('.ground-card').forEach(card => {
        card.addEventListener('click', () => selectGround(card.dataset.ground));
    });
    
    // Duration selection
    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.addEventListener('click', () => selectDuration(btn.dataset.duration));
    });
    
    // Contact form
    document.getElementById('contactForm').addEventListener('submit', handleContactSubmit);
    
    // Modal close buttons
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
    
    // Hamburger menu
    document.getElementById('hamburger').addEventListener('click', toggleMobileMenu);
}

// Set date input limits (7 days advance)
function setDateLimits() {
    const today = new Date();
    const maxDate = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    const dateInput = document.getElementById('bookingDate');
    dateInput.min = today.toISOString().split('T')[0];
    dateInput.max = maxDate.toISOString().split('T')[0];
}

// Authentication functions
async function verifyToken(token) {
    try {
        const response = await fetch(`${API_BASE}/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateUIForLoggedInUser();
        } else {
            localStorage.removeItem('token');
            currentUser = null;
            updateUIForLoggedOutUser();
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('token');
        updateUIForLoggedOutUser();
    }
}

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        verifyToken(token);
    } else {
        updateUIForLoggedOutUser();
    }
}

function updateUIForLoggedInUser() {
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('registerBtn').style.display = 'none';
    document.getElementById('userMenu').style.display = 'flex';
    document.getElementById('userName').textContent = currentUser.name;
}

function updateUIForLoggedOutUser() {
    document.getElementById('loginBtn').style.display = 'inline-flex';
    document.getElementById('registerBtn').style.display = 'inline-flex';
    document.getElementById('userMenu').style.display = 'none';
}

// Auth modal functions
function showAuthModal(type) {
    document.getElementById('authModal').style.display = 'block';
    if (type === 'login') {
        showLoginForm();
    } else {
        showRegisterForm();
    }
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateUIForLoggedInUser();
            document.getElementById('authModal').style.display = 'none';
            showMessage('Login successful!', 'success');
        } else {
            showMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showMessage('Login failed. Please try again.', 'error');
    }
}

// Handle register
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateUIForLoggedInUser();
            document.getElementById('authModal').style.display = 'none';
            showMessage('Registration successful!', 'success');
        } else {
            showMessage(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showMessage('Registration failed. Please try again.', 'error');
    }
}

// Logout
function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    updateUIForLoggedOutUser();
    showMessage('Logged out successfully', 'success');
}

// Booking functions
function selectGround(groundNumber) {
    // Remove previous selection
    document.querySelectorAll('.ground-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selection to clicked card
    document.querySelector(`[data-ground="${groundNumber}"]`).classList.add('selected');
    
    selectedGround = parseInt(groundNumber);
    updatePlayerOptions();
    updatePricing();
    updateBookingSummary();
    
    // Show time selection section
    document.getElementById('timeSelectionSection').style.display = 'block';
}

function updatePlayerOptions() {
    const playerSelect = document.getElementById('playerCount');
    playerSelect.innerHTML = '<option value="">Select players</option>';
    
    if (selectedGround === 1) {
        // Ground 1: 7vs7 (up to 14 players)
        for (let i = 2; i <= 14; i++) {
            playerSelect.innerHTML += `<option value="${i}">${i} players</option>`;
        }
    } else if (selectedGround === 2) {
        // Ground 2: 6vs6 (up to 12 players)
        for (let i = 2; i <= 12; i++) {
            playerSelect.innerHTML += `<option value="${i}">${i} players</option>`;
        }
    }
}

function updatePricing() {
    if (!selectedGround) return;
    
    // Get the selected time for pricing calculation
    const hour = selectedStartTime ? parseInt(selectedStartTime.split(':')[0]) : new Date().getHours();
    
    // Peak hours: 5PM to 5AM (17:00 to 05:00)
    const isPeakTime = hour >= 17 || hour < 5;
    
    let prices;
    if (selectedGround === 1) {
        prices = {
            60: isPeakTime ? 1500 : 1000,
            90: isPeakTime ? 2200 : 1500
        };
    } else {
        prices = {
            60: isPeakTime ? 1400 : 1000,
            90: isPeakTime ? 2000 : 1400
        };
    }
    
    document.getElementById('price60').textContent = `৳${prices[60]}`;
    document.getElementById('price90').textContent = `৳${prices[90]}`;
}

function selectDuration(duration) {
    // Remove previous selection
    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Add selection to clicked button
    document.querySelector(`[data-duration="${duration}"]`).classList.add('selected');
    
    selectedDuration = parseInt(duration);
    calculateAmount();
    updateBookingSummary();
}

function handleDateChange() {
    selectedDate = document.getElementById('bookingDate').value;
    updateBookingSummary();
}

function handleTimeChange() {
    selectedStartTime = document.getElementById('startTime').value;
    updatePricing(); // Update pricing when time changes
    calculateAmount();
    updateBookingSummary();
}

function calculateAmount() {
    if (!selectedGround || !selectedStartTime || !selectedDuration) {
        selectedAmount = 0;
        updateBookingSummary();
        return;
    }
    
    const hour = parseInt(selectedStartTime.split(':')[0]);
    const isPeakTime = hour >= 17 || hour < 5;
    
    let amount;
    if (selectedGround === 1) {
        if (selectedDuration === 60) {
            amount = isPeakTime ? 1500 : 1000;
        } else {
            amount = isPeakTime ? 2200 : 1500;
        }
    } else {
        if (selectedDuration === 60) {
            amount = isPeakTime ? 1400 : 1000;
        } else {
            amount = isPeakTime ? 2000 : 1400;
        }
    }
    
    selectedAmount = amount;
    updateBookingSummary();
}

function calculateEndTime(startTime, duration) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + (duration * 60 * 1000));
    
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
}

async function checkAvailability() {
    if (!selectedGround || !selectedDate || !selectedStartTime || !selectedDuration) {
        showMessage('Please select ground, date, time and duration first', 'warning');
        return;
    }
    
    const endTime = calculateEndTime(selectedStartTime, selectedDuration);
    const resultDiv = document.getElementById('availabilityResult');
    
    resultDiv.style.display = 'block';
    resultDiv.className = 'availability-result checking';
    resultDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking availability...';
    
    try {
        const response = await fetch(`${API_BASE}/bookings/check-availability`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                groundNumber: selectedGround,
                bookingDate: selectedDate,
                startTime: selectedStartTime,
                endTime: endTime
            })
        });
        
        const data = await response.json();
        
        if (data.available) {
            resultDiv.className = 'availability-result available';
            resultDiv.innerHTML = '<i class="fas fa-check-circle"></i> ' + data.message;
            document.getElementById('bookingFormSection').style.display = 'block';
        } else {
            resultDiv.className = 'availability-result unavailable';
            resultDiv.innerHTML = '<i class="fas fa-times-circle"></i> ' + data.message;
            document.getElementById('bookingFormSection').style.display = 'none';
        }
    } catch (error) {
        resultDiv.className = 'availability-result unavailable';
        resultDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error checking availability';
        console.error('Availability check failed:', error);
    }
}

function handlePaymentMethodChange() {
    const paymentMethod = document.getElementById('paymentMethod').value;
    const paymentDetails = document.getElementById('paymentDetails');
    const paymentInstructions = document.getElementById('paymentInstructions');
    
    if (paymentMethod && paymentMethod !== 'venue') {
        let instructions = '';
        
        switch (paymentMethod) {
            case 'bkash':
                instructions = `
                    <div class="payment-instructions">
                        <h4><i class="fas fa-mobile-alt"></i> Bkash Payment</h4>
                        <p><strong>Send Money to:</strong> 01700-000000</p>
                        <p><strong>Amount:</strong> ৳${selectedAmount}</p>
                        <p><strong>Reference:</strong> Your Name + Ground${selectedGround}</p>
                        <small>After payment, upload the transaction screenshot below</small>
                    </div>
                `;
                break;
            case 'nagad':
                instructions = `
                    <div class="payment-instructions">
                        <h4><i class="fas fa-mobile-alt"></i> Nagad Payment</h4>
                        <p><strong>Send Money to:</strong> 01700-000000</p>
                        <p><strong>Amount:</strong> ৳${selectedAmount}</p>
                        <p><strong>Reference:</strong> Your Name + Ground${selectedGround}</p>
                        <small>After payment, upload the transaction screenshot below</small>
                    </div>
                `;
                break;
            case 'bank':
                instructions = `
                    <div class="payment-instructions">
                        <h4><i class="fas fa-university"></i> Bank Transfer</h4>
                        <p><strong>Account Name:</strong> The Green Field</p>
                        <p><strong>Account Number:</strong> 1234567890</p>
                        <p><strong>Bank:</strong> Dutch Bangla Bank</p>
                        <p><strong>Amount:</strong> ৳${selectedAmount}</p>
                        <small>After transfer, upload the bank receipt below</small>
                    </div>
                `;
                break;
        }
        
        paymentInstructions.innerHTML = instructions;
        paymentDetails.style.display = 'block';
    } else {
        paymentDetails.style.display = 'none';
    }
}

function updateBookingSummary() {
    document.getElementById('summaryGround').textContent = 
        selectedGround ? `Ground ${selectedGround}` : 'Not selected';
    
    document.getElementById('summaryDate').textContent = 
        selectedDate ? new Date(selectedDate).toLocaleDateString() : 'Not selected';
    
    document.getElementById('summaryTime').textContent = 
        selectedStartTime && selectedDuration ? `${selectedStartTime} - ${calculateEndTime(selectedStartTime, selectedDuration)}` : 'Not selected';
    
    document.getElementById('summaryDuration').textContent = 
        selectedDuration ? `${selectedDuration} minutes` : 'Not selected';
    
    document.getElementById('summaryAmount').textContent = `৳${selectedAmount}`;
}

// Handle booking submission
async function handleBookingSubmit(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showMessage('Please login to make a booking', 'warning');
        showAuthModal('login');
        return;
    }
    
    if (!selectedGround || !selectedDate || !selectedStartTime || !selectedDuration) {
        showMessage('Please complete all booking steps', 'warning');
        return;
    }
    
    const playerCount = document.getElementById('playerCount').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    if (!playerCount || !paymentMethod) {
        showMessage('Please fill in all required fields', 'warning');
        return;
    }
    
    const endTime = calculateEndTime(selectedStartTime, selectedDuration);
    
    const formData = new FormData();
    formData.append('groundNumber', selectedGround);
    formData.append('bookingDate', selectedDate);
    formData.append('startTime', selectedStartTime);
    formData.append('endTime', endTime);
    formData.append('duration', selectedDuration);
    formData.append('playerCount', playerCount);
    formData.append('paymentMethod', paymentMethod);
    formData.append('totalAmount', selectedAmount);
    formData.append('notes', document.getElementById('bookingNotes').value);
    
    const paymentScreenshot = document.getElementById('paymentScreenshot').files[0];
    if (paymentScreenshot) {
        formData.append('paymentScreenshot', paymentScreenshot);
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Booking...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE}/bookings/create`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Booking created successfully! You will receive confirmation soon.', 'success');
            resetBookingForm();
            scrollToTop();
        } else {
            showMessage(data.error || 'Booking failed', 'error');
        }
    } catch (error) {
        console.error('Booking error:', error);
        showMessage('Booking failed. Please try again.', 'error');
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Reset booking form
function resetBookingForm() {
    selectedGround = null;
    selectedDate = null;
    selectedStartTime = null;
    selectedDuration = null;
    selectedAmount = 0;
    
    document.querySelectorAll('.ground-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    document.getElementById('bookingForm').reset();
    document.getElementById('bookingDate').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('timeSelectionSection').style.display = 'none';
    document.getElementById('bookingFormSection').style.display = 'none';
    document.getElementById('paymentDetails').style.display = 'none';
    document.getElementById('availabilityResult').style.display = 'none';
    
    updateBookingSummary();
}

// Load and display updates
async function loadUpdates() {
    try {
        const response = await fetch(`${API_BASE}/customer/updates`);
        const updates = await response.json();
        
        if (response.ok) {
            displayUpdates(updates);
        }
    } catch (error) {
        console.error('Failed to load updates:', error);
    }
}

function displayUpdates(updates) {
    const container = document.getElementById('updatesContainer');
    
    if (updates.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bullhorn"></i>
                <h3>No Updates Available</h3>
                <p>Check back later for news and offers!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = updates.map(update => `
        <div class="update-card ${update.is_featured ? 'featured' : ''}">
            ${update.image_url ? `<img src="${update.image_url}" alt="${update.title}">` : ''}
            <div class="update-content">
                <h3>${update.title}</h3>
                <p>${update.content}</p>
                <div class="update-meta">
                    <span>${new Date(update.created_at).toLocaleDateString()}</span>
                    ${update.is_featured ? '<span class="featured-badge">Featured</span>' : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// My bookings
async function showMyBookings() {
    if (!currentUser) {
        showMessage('Please login first', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/bookings/my-bookings`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        const bookings = await response.json();
        
        if (response.ok) {
            displayMyBookings(bookings);
            document.getElementById('bookingsModal').style.display = 'block';
        } else {
            showMessage('Failed to load bookings', 'error');
        }
    } catch (error) {
        showMessage('Failed to load bookings', 'error');
    }
}

function displayMyBookings(bookings) {
    const container = document.getElementById('bookingsContainer');
    
    if (bookings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>No Bookings Found</h3>
                <p>You haven't made any bookings yet.</p>
                <button class="btn btn-primary" onclick="closeModal('bookingsModal'); scrollToSection('booking');">
                    Make Your First Booking
                </button>
            </div>
        `;
        return;
    }
    
    console.log('Displaying bookings:', bookings);
    
    container.innerHTML = bookings.map(booking => `
        <div class="booking-card">
            <div class="booking-header">
                <span class="booking-id">Booking #${booking.id}</span>
                <div>
                    <span class="booking-status status-${booking.booking_status}">${booking.booking_status}</span>
                    <span class="booking-status payment-${booking.payment_status}">${booking.payment_status}</span>
                </div>
            </div>
            <div class="booking-details">
                <div class="booking-detail">
                    <span class="booking-detail-label">Ground</span>
                    <span class="booking-detail-value">Ground ${booking.ground_number}</span>
                </div>
                <div class="booking-detail">
                    <span class="booking-detail-label">Date</span>
                    <span class="booking-detail-value">${new Date(booking.booking_date).toLocaleDateString()}</span>
                </div>
                <div class="booking-detail">
                    <span class="booking-detail-label">Time</span>
                    <span class="booking-detail-value">${booking.start_time} - ${booking.end_time}</span>
                </div>
                <div class="booking-detail">
                    <span class="booking-detail-label">Players</span>
                    <span class="booking-detail-value">${booking.player_count}</span>
                </div>
                <div class="booking-detail">
                    <span class="booking-detail-label">Amount</span>
                    <span class="booking-detail-value">৳${booking.total_amount}</span>
                </div>
                <div class="booking-detail">
                    <span class="booking-detail-label">Payment Method</span>
                    <span class="booking-detail-value">${booking.payment_method}</span>
                </div>
            </div>
            ${booking.notes ? `<p class="booking-notes"><strong>Notes:</strong> ${booking.notes}</p>` : ''}
            ${booking.booking_status === 'confirmed' ? `
                <div class="booking-confirmed-message">
                    <i class="fas fa-check-circle"></i>
                    <span>Booking Confirmed! See you at the ground on ${new Date(booking.booking_date).toLocaleDateString()} at ${booking.start_time}.</span>
                </div>
            ` : ''}
            ${booking.booking_status === 'pending' ? `
                <div class="booking-actions">
                    <button class="btn btn-sm btn-outline" onclick="cancelBooking(${booking.id})">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Cancel booking
async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/bookings/cancel/${bookingId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            showMessage('Booking cancelled successfully', 'success');
            showMyBookings(); // Refresh bookings
        } else {
            showMessage('Failed to cancel booking', 'error');
        }
    } catch (error) {
        showMessage('Failed to cancel booking', 'error');
    }
}

// Contact form
async function handleContactSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const message = document.getElementById('contactMessage').value;
    
    try {
        const response = await fetch(`${API_BASE}/customer/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, message })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(data.message, 'success');
            document.getElementById('contactForm').reset();
        } else {
            showMessage('Failed to send message', 'error');
        }
    } catch (error) {
        showMessage('Failed to send message', 'error');
    }
}

// Utility functions
function showMessage(text, type = 'success') {
    const container = document.getElementById('messageContainer');
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

function scrollToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({
        behavior: 'smooth'
    });
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function showAvailability() {
    scrollToSection('booking');
    showMessage('Select a date to check real-time availability', 'warning');
}

function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    navMenu.classList.toggle('mobile-open');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}