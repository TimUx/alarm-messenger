const API_BASE = window.location.origin + '/api';
let currentDevices = [];
let currentQRData = null;

// Check authentication on page load
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');
    
    if (!token || !username) {
        window.location.href = 'login.html';
        return;
    }
    
    document.getElementById('username-display').textContent = username;
    
    // Load devices
    refreshDevices();
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

async function refreshDevices() {
    try {
        const response = await apiRequest(`${API_BASE}/devices`);
        
        if (!response.ok) {
            throw new Error('Fehler beim Laden der Geräte');
        }
        
        const devices = await response.json();
        currentDevices = devices;
        displayDevices(devices);
    } catch (error) {
        document.getElementById('devices-list').innerHTML = 
            `<p class="loading" style="color: #dc3545;">Fehler beim Laden: ${error.message}</p>`;
    }
}

function displayDevices(devices) {
    const container = document.getElementById('devices-list');
    
    if (devices.length === 0) {
        container.innerHTML = '<p class="loading">Keine registrierten Geräte gefunden.</p>';
        return;
    }
    
    container.innerHTML = devices.map(device => createDeviceCard(device)).join('');
}

function createDeviceCard(device) {
    const registeredDate = new Date(device.registeredAt).toLocaleString('de-DE');
    const deviceName = device.responderName || 'Nicht zugewiesen';
    const qualifications = device.qualifications || {};
    
    const qualBadges = [];
    if (qualifications.machinist) qualBadges.push('Maschinist');
    if (qualifications.agt) qualBadges.push('AGT');
    if (qualifications.paramedic) qualBadges.push('Sanitäter');
    if (qualifications.thVu) qualBadges.push('TH-VU');
    if (qualifications.thBau) qualBadges.push('TH-BAU');
    
    return `
        <div class="device-card">
            <div class="device-header">
                <div class="device-name">${escapeHtml(deviceName)}</div>
                <div class="device-platform">${device.platform}</div>
            </div>
            <div class="device-info">
                <div class="device-info-row">
                    <span class="device-info-label">Registriert:</span>
                    <span class="device-info-value">${registeredDate}</span>
                </div>
                <div class="device-info-row">
                    <span class="device-info-label">Device ID:</span>
                    <span class="device-info-value">${device.id.substring(0, 8)}...</span>
                </div>
            </div>
            ${qualBadges.length > 0 ? `
                <div class="qualifications">
                    <h4>Ausbildungen:</h4>
                    <div class="qual-badges">
                        ${qualBadges.map(q => `<span class="qual-badge">${q}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            ${device.isSquadLeader ? '<div class="leader-badge">⭐ Gruppenführer</div>' : ''}
            <div class="device-actions">
                <button class="btn btn-secondary" onclick="editDevice('${device.id}')">Bearbeiten</button>
                <button class="btn btn-secondary" onclick="deactivateDevice('${device.id}')">Deaktivieren</button>
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function editDevice(deviceId) {
    const device = currentDevices.find(d => d.id === deviceId);
    if (!device) return;
    
    document.getElementById('edit-device-id').value = device.id;
    document.getElementById('edit-responder-name').value = device.responderName || '';
    
    const qualifications = device.qualifications || {};
    document.getElementById('edit-qual-machinist').checked = qualifications.machinist || false;
    document.getElementById('edit-qual-agt').checked = qualifications.agt || false;
    document.getElementById('edit-qual-paramedic').checked = qualifications.paramedic || false;
    document.getElementById('edit-qual-th-vu').checked = qualifications.thVu || false;
    document.getElementById('edit-qual-th-bau').checked = qualifications.thBau || false;
    document.getElementById('edit-is-squad-leader').checked = device.isSquadLeader || false;
    
    document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

document.getElementById('editDeviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const deviceId = document.getElementById('edit-device-id').value;
    const responderName = document.getElementById('edit-responder-name').value;
    
    const qualifications = {
        machinist: document.getElementById('edit-qual-machinist').checked,
        agt: document.getElementById('edit-qual-agt').checked,
        paramedic: document.getElementById('edit-qual-paramedic').checked,
        thVu: document.getElementById('edit-qual-th-vu').checked,
        thBau: document.getElementById('edit-qual-th-bau').checked,
    };
    
    const isSquadLeader = document.getElementById('edit-is-squad-leader').checked;
    
    try {
        const response = await apiRequest(`${API_BASE}/admin/devices/${deviceId}`, {
            method: 'PUT',
            body: JSON.stringify({
                responderName,
                qualifications,
                isSquadLeader
            })
        });
        
        if (!response.ok) {
            throw new Error('Fehler beim Aktualisieren');
        }
        
        closeEditModal();
        refreshDevices();
        alert('Einsatzkraft erfolgreich aktualisiert!');
    } catch (error) {
        alert('Fehler: ' + error.message);
    }
});

async function deactivateDevice(deviceId) {
    if (!confirm('Möchten Sie dieses Gerät wirklich deaktivieren?')) {
        return;
    }
    
    try {
        const response = await apiRequest(`${API_BASE}/devices/${deviceId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Fehler beim Deaktivieren');
        }
        
        refreshDevices();
        alert('Gerät erfolgreich deaktiviert!');
    } catch (error) {
        alert('Fehler: ' + error.message);
    }
}

// Close modal when clicking outside
document.getElementById('edit-modal').addEventListener('click', (e) => {
    if (e.target.id === 'edit-modal') {
        closeEditModal();
    }
});
