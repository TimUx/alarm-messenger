const API_BASE = window.location.origin + '/api';
let currentQRData = null;

// Check authentication on page load
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');
    
    if (!token || !username) {
        window.location.href = 'login.html';
        return;
    }
    
    // Load and display user info
    loadUserInfo();
    
    // Set current year
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Setup event listeners
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('generate-qr-btn').addEventListener('click', generateQRCode);
    document.getElementById('copy-token-btn').addEventListener('click', copyToken);
    document.getElementById('download-qr-btn').addEventListener('click', downloadQRCode);
    document.getElementById('refresh-stats-btn').addEventListener('click', loadStatistics);
    
    // Load statistics
    loadStatistics();
});

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    window.location.href = 'login.html';
}

async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('authToken');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        // Token expired or invalid
        logout();
        return;
    }
    
    return response;
}

async function loadUserInfo() {
    try {
        const response = await apiRequest(`${API_BASE}/admin/profile`);
        
        if (response && response.ok) {
            const user = await response.json();
            const roleText = user.role === 'admin' ? 'Administrator' : 'Operator';
            const displayName = user.fullName || user.username;
            document.getElementById('username-display').textContent = `${displayName} (${roleText})`;
        } else {
            // Fallback to username from localStorage
            document.getElementById('username-display').textContent = localStorage.getItem('username');
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        document.getElementById('username-display').textContent = localStorage.getItem('username');
    }
}

async function generateQRCode() {
    try {
        const response = await apiRequest(`${API_BASE}/devices/registration-token`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('QR-Code Generierung fehlgeschlagen');
        }
        
        const data = await response.json();
        currentQRData = data;
        
        // Display QR code
        document.getElementById('qr-code-image').src = data.qrCode;
        document.getElementById('device-token').textContent = data.deviceToken;
        document.getElementById('qr-code-display').style.display = 'block';
        
        // Scroll to QR code
        document.getElementById('qr-code-display').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        alert('Fehler beim Generieren des QR-Codes: ' + error.message);
    }
}

function copyToken() {
    const token = document.getElementById('device-token').textContent;
    navigator.clipboard.writeText(token).then(() => {
        alert('Token in die Zwischenablage kopiert!');
    });
}

function downloadQRCode() {
    if (!currentQRData) return;
    
    const link = document.createElement('a');
    link.href = currentQRData.qrCode;
    link.download = `qr-code-${currentQRData.deviceToken.substring(0, 8)}.png`;
    link.click();
}

async function loadStatistics() {
    try {
        // Load devices count
        const devicesResponse = await apiRequest(`${API_BASE}/devices`);
        if (devicesResponse.ok) {
            const devices = await devicesResponse.json();
            document.getElementById('stat-devices').textContent = devices.length;
            const activeDevices = devices.filter(d => d.active).length;
            document.getElementById('stat-devices-active').textContent = activeDevices;
        }
        
        // Load groups count
        const groupsResponse = await apiRequest(`${API_BASE}/groups`);
        if (groupsResponse.ok) {
            const groups = await groupsResponse.json();
            document.getElementById('stat-groups').textContent = groups.length;
        }
        
        // Load emergencies statistics
        const emergenciesResponse = await apiRequest(`${API_BASE}/emergencies`);
        if (emergenciesResponse.ok) {
            const emergencies = await emergenciesResponse.json();
            document.getElementById('stat-emergencies-total').textContent = emergencies.length;
            
            // Calculate emergencies this year
            const currentYear = new Date().getFullYear();
            const emergenciesThisYear = emergencies.filter(e => {
                try {
                    const year = new Date(e.emergencyDate).getFullYear();
                    return year === currentYear;
                } catch {
                    return false;
                }
            }).length;
            document.getElementById('stat-emergencies-year').textContent = emergenciesThisYear;
            
            // Calculate emergencies this month
            const now = new Date();
            const currentMonth = now.getMonth();
            const emergenciesThisMonth = emergencies.filter(e => {
                try {
                    const date = new Date(e.emergencyDate);
                    return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
                } catch {
                    return false;
                }
            }).length;
            document.getElementById('stat-emergencies-month').textContent = emergenciesThisMonth;
        }
    } catch (error) {
        console.error('Fehler beim Laden der Statistiken:', error);
    }
}
