const API_BASE = window.location.origin + '/api';
let availableGroups = [];

// Check authentication on page load
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');
    
    if (!token || !username) {
        window.location.href = 'login.html';
        return;
    }
    
    document.getElementById('username-display').textContent = username;
    
    // Load and display user info
    loadUserInfo();
    
    // Setup event listeners
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('createAlarmForm').addEventListener('submit', handleCreateAlarm);
    
    // Set default date/time to now
    const now = new Date();
    const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    document.getElementById('emergency-date').value = localDatetime;
    
    // Load groups
    loadGroups();
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
    
    return fetch(url, {
        ...options,
        headers
    });
}

async function loadUserInfo() {
    try {
        const response = await apiRequest(`${API_BASE}/admin/profile`);
        
        if (response.status === 401) {
            logout();
            return;
        }
        
        if (!response.ok) {
            console.error('Failed to load user info');
            return;
        }
        
        const userInfo = await response.json();
        const usernameDisplay = document.getElementById('username-display');
        
        if (userInfo.fullName) {
            usernameDisplay.textContent = `${userInfo.fullName} (${userInfo.username})`;
        } else {
            usernameDisplay.textContent = userInfo.username;
        }
        
        usernameDisplay.title = `Rolle: ${userInfo.role === 'admin' ? 'Administrator' : 'Operator'}`;
        
        // Check if user has admin role
        if (userInfo.role !== 'admin') {
            // Operators should not be able to trigger alarms
            document.getElementById('createAlarmForm').innerHTML = 
                '<p class="error-message">Nur Administratoren können Alarme auslösen.</p>';
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

async function loadGroups() {
    try {
        const response = await apiRequest(`${API_BASE}/groups`);
        
        if (!response.ok) {
            throw new Error('Fehler beim Laden der Gruppen');
        }
        
        availableGroups = await response.json();
        displayGroups();
    } catch (error) {
        console.error('Error loading groups:', error);
        document.getElementById('alarm-groups-list').innerHTML = 
            '<p class="error-message">Fehler beim Laden der Gruppen</p>';
    }
}

function displayGroups() {
    const container = document.getElementById('alarm-groups-list');
    
    if (availableGroups.length === 0) {
        container.innerHTML = '<p>Keine Gruppen verfügbar</p>';
        return;
    }
    
    container.innerHTML = availableGroups.map(group => `
        <label>
            <input type="checkbox" name="group" value="${escapeHtml(group.code)}">
            ${escapeHtml(group.code)} - ${escapeHtml(group.name)}
        </label>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function handleCreateAlarm(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird ausgelöst...';
    
    try {
        // Get form data
        const formData = new FormData(e.target);
        
        // Validate and parse emergency date
        const emergencyDateValue = formData.get('emergencyDate');
        if (!emergencyDateValue) {
            throw new Error('Einsatzdatum ist erforderlich');
        }
        
        const emergencyDate = new Date(emergencyDateValue);
        if (isNaN(emergencyDate.getTime())) {
            throw new Error('Ungültiges Einsatzdatum');
        }
        
        // Get selected groups
        const selectedGroups = Array.from(document.querySelectorAll('input[name="group"]:checked'))
            .map(checkbox => checkbox.value);
        
        const alarmData = {
            emergencyNumber: formData.get('emergencyNumber'),
            emergencyDate: emergencyDate.toISOString(),
            emergencyKeyword: formData.get('emergencyKeyword'),
            emergencyDescription: formData.get('emergencyDescription'),
            emergencyLocation: formData.get('emergencyLocation'),
            groups: selectedGroups.length > 0 ? selectedGroups.join(',') : null
        };
        
        // Create alarm via API - using JWT token which already has admin access
        // The API requires API_SECRET_KEY, so we need to prompt for it
        // In production, consider storing this securely or using a different authentication method
        const apiKey = await getApiKey();
        
        const response = await apiRequest(`${API_BASE}/emergencies`, {
            method: 'POST',
            body: JSON.stringify(alarmData),
            headers: {
                'X-API-Key': apiKey
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Fehler beim Auslösen des Alarms');
        }
        
        const result = await response.json();
        
        // Show success message
        const resultMessage = selectedGroups.length > 0
            ? `Alarm wurde an ${selectedGroups.length} Gruppe(n) gesendet: ${selectedGroups.join(', ')}`
            : 'Alarm wurde an alle Geräte gesendet';
        
        document.getElementById('alarm-result-message').textContent = resultMessage;
        document.getElementById('alarm-result').style.display = 'block';
        
        // Reset form
        e.target.reset();
        
        // Reset datetime to now
        const now = new Date();
        const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        document.getElementById('emergency-date').value = localDatetime;
        
        // Uncheck all group checkboxes
        document.querySelectorAll('input[name="group"]').forEach(cb => cb.checked = false);
        
        // Scroll to result
        document.getElementById('alarm-result').scrollIntoView({ behavior: 'smooth' });
        
        // Hide success message after 5 seconds
        setTimeout(() => {
            document.getElementById('alarm-result').style.display = 'none';
        }, 5000);
        
    } catch (error) {
        alert('Fehler beim Auslösen des Alarms: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚨 Alarm auslösen';
    }
}

// Get API key from session storage or prompt user
// Note: This is a temporary solution. In production, the API key should be
// stored server-side and accessed through a secure admin endpoint
async function getApiKey() {
    // Try to get from session storage first
    let apiKey = sessionStorage.getItem('apiKey');
    
    if (!apiKey) {
        // Prompt user to enter it
        apiKey = prompt('Bitte geben Sie den API-Schlüssel ein (X-API-Key):\n\nHinweis: Dieser Schlüssel wird für diese Sitzung gespeichert.');
        
        if (!apiKey) {
            throw new Error('API-Schlüssel erforderlich');
        }
        
        // Store for this session
        sessionStorage.setItem('apiKey', apiKey);
    }
    
    return apiKey;
}
