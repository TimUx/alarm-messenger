const API_BASE = window.location.origin + '/api';
let currentDevices = [];
let currentGroups = []; // Needed for device group assignment

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
    document.getElementById('refresh-devices-btn').addEventListener('click', refreshDevices);
    document.getElementById('close-modal-btn').addEventListener('click', closeEditModal);
    document.getElementById('cancel-modal-btn').addEventListener('click', closeEditModal);
    document.getElementById('edit-modal').addEventListener('click', (e) => {
        if (e.target.id === 'edit-modal') {
            closeEditModal();
        }
    });
    
    // QR modal event listeners
    document.getElementById('close-qr-modal-btn').addEventListener('click', closeQRModal);
    document.getElementById('qr-modal').addEventListener('click', (e) => {
        if (e.target.id === 'qr-modal') {
            closeQRModal();
        }
    });
    document.getElementById('copy-qr-token-btn').addEventListener('click', copyQRToken);
    document.getElementById('download-qr-modal-btn').addEventListener('click', downloadQRCode);
    
    // Load data
    refreshDevices();
    refreshGroups(); // Load groups for device assignment
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
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
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
    
    // Create table
    let tableHtml = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Plattform</th>
                    <th>Registriert</th>
                    <th>Ausbildungen</th>
                    <th>Führungsrolle</th>
                    <th>Gruppen</th>
                    <th>Aktionen</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    devices.forEach(device => {
        const firstName = device.firstName || '';
        const lastName = device.lastName || '';
        const deviceName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : 'Nicht zugewiesen';
        const qualifications = device.qualifications || {};
        
        let registeredDate;
        try {
            registeredDate = new Date(device.registeredAt).toLocaleString('de-DE');
        } catch (e) {
            registeredDate = 'Ungültiges Datum';
        }
        
        // Qualifications
        const qualBadges = [];
        if (qualifications.machinist) qualBadges.push('Maschinist');
        if (qualifications.agt) qualBadges.push('AGT');
        if (qualifications.paramedic) qualBadges.push('Sanitäter');
        const qualText = qualBadges.length > 0 
            ? qualBadges.map(q => `<span class="qual-badge">${escapeHtml(q)}</span>`).join(' ')
            : '-';
        
        // Leadership role
        let leaderText = '-';
        if (device.leadershipRole === 'groupLeader') {
            leaderText = '<span class="leader-badge-small">⭐ Gruppenführer</span>';
        } else if (device.leadershipRole === 'platoonLeader') {
            leaderText = '<span class="leader-badge-small">⭐⭐ Zugführer</span>';
        }
        
        // Assigned groups
        const assignedGroups = device.assignedGroups || [];
        const groupText = assignedGroups.length > 0
            ? assignedGroups.map(code => {
                const group = currentGroups.find(g => g.code === code);
                const groupName = group ? group.name : code;
                return `<span class="group-badge" title="${escapeHtml(groupName)}">${escapeHtml(code)}</span>`;
            }).join(' ')
            : '-';
        
        const escapedDeviceName = escapeHtml(deviceName);
        const escapedPlatform = escapeHtml(device.platform);
        const escapedDeviceId = escapeHtml(device.id);
        
        tableHtml += `
            <tr>
                <td><strong>${escapedDeviceName}</strong></td>
                <td><span class="platform-badge">${escapedPlatform}</span></td>
                <td>${registeredDate}</td>
                <td>${qualText}</td>
                <td>${leaderText}</td>
                <td>${groupText}</td>
                <td class="actions-cell">
                    <button class="btn-icon" title="Bearbeiten" data-action="edit" data-device-id="${escapedDeviceId}">✏️</button>
                    <button class="btn-icon" title="QR-Code" data-action="show-qr" data-device-id="${escapedDeviceId}">📱</button>
                    <button class="btn-icon" title="Deaktivieren" data-action="deactivate" data-device-id="${escapedDeviceId}">🗑️</button>
                </td>
            </tr>
        `;
    });
    
    tableHtml += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHtml;
    
    // Add event listeners to device action buttons
    container.querySelectorAll('[data-action="show-qr"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const deviceId = e.target.getAttribute('data-device-id');
            showDeviceQRCode(deviceId);
        });
    });
    
    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const deviceId = e.target.getAttribute('data-device-id');
            editDevice(deviceId);
        });
    });
    
    container.querySelectorAll('[data-action="deactivate"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const deviceId = e.target.getAttribute('data-device-id');
            deactivateDevice(deviceId);
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function showDeviceQRCode(deviceId) {
    try {
        const response = await apiRequest(`${API_BASE}/devices/${deviceId}/qr-code`);
        
        if (!response.ok) {
            throw new Error('Fehler beim Laden des QR-Codes');
        }
        
        const data = await response.json();
        
        // Display QR code in modal
        document.getElementById('qr-modal-image').src = data.qrCode;
        document.getElementById('qr-modal-token').textContent = data.deviceToken;
        document.getElementById('qr-modal').style.display = 'flex';
        
        // Store current QR data for download
        window.currentQRData = data;
    } catch (error) {
        alert('Fehler beim Laden des QR-Codes: ' + error.message);
    }
}

function closeQRModal() {
    document.getElementById('qr-modal').style.display = 'none';
    window.currentQRData = null;
}

function copyQRToken() {
    const token = document.getElementById('qr-modal-token').textContent;
    navigator.clipboard.writeText(token).then(() => {
        alert('Token in Zwischenablage kopiert!');
    }).catch(err => {
        alert('Fehler beim Kopieren: ' + err.message);
    });
}

function downloadQRCode() {
    if (!window.currentQRData) {
        alert('Kein QR-Code geladen');
        return;
    }
    
    const link = document.createElement('a');
    link.href = window.currentQRData.qrCode;
    link.download = `qr-code-${window.currentQRData.deviceToken.substring(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function editDevice(deviceId) {
    const device = currentDevices.find(d => d.id === deviceId);
    if (!device) return;
    
    document.getElementById('edit-device-id').value = device.id;
    document.getElementById('edit-first-name').value = device.firstName || '';
    document.getElementById('edit-last-name').value = device.lastName || '';
    
    const qualifications = device.qualifications || {};
    document.getElementById('edit-qual-machinist').checked = qualifications.machinist || false;
    document.getElementById('edit-qual-agt').checked = qualifications.agt || false;
    document.getElementById('edit-qual-paramedic').checked = qualifications.paramedic || false;
    
    // Set leadership role
    const leadershipRole = device.leadershipRole || 'none';
    document.getElementById('edit-role-none').checked = (leadershipRole === 'none');
    document.getElementById('edit-role-group').checked = (leadershipRole === 'groupLeader');
    document.getElementById('edit-role-platoon').checked = (leadershipRole === 'platoonLeader');
    
    // Load and set assigned groups
    loadGroupCheckboxes(device.assignedGroups || []);
    
    document.getElementById('edit-modal').style.display = 'flex';
}

function loadGroupCheckboxes(assignedGroups) {
    const container = document.getElementById('edit-assigned-groups');
    
    if (currentGroups.length === 0) {
        container.innerHTML = '<p style="color: #999;">Keine Gruppen verfügbar. Bitte zuerst Gruppen anlegen.</p>';
        return;
    }
    
    const checkboxesHtml = currentGroups.map(group => {
        const isChecked = assignedGroups.includes(group.code);
        const escapedCode = escapeHtml(group.code);
        const escapedName = escapeHtml(group.name);
        return `
            <label>
                <input type="checkbox" name="group_${escapedCode}" value="${escapedCode}" ${isChecked ? 'checked' : ''}>
                ${escapedCode} - ${escapedName}
            </label>
        `;
    }).join('');
    
    container.innerHTML = checkboxesHtml;
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

document.getElementById('editDeviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const deviceId = document.getElementById('edit-device-id').value;
    const firstName = document.getElementById('edit-first-name').value;
    const lastName = document.getElementById('edit-last-name').value;
    
    const qualifications = {
        machinist: document.getElementById('edit-qual-machinist').checked,
        agt: document.getElementById('edit-qual-agt').checked,
        paramedic: document.getElementById('edit-qual-paramedic').checked,
    };
    
    // Get selected leadership role
    const leadershipRole = document.querySelector('input[name="leadership_role"]:checked').value;
    
    // Get selected groups
    const groupCheckboxes = document.querySelectorAll('#edit-assigned-groups input[type="checkbox"]:checked');
    const groupCodes = Array.from(groupCheckboxes).map(cb => cb.value);
    
    try {
        // Update device info
        const response = await apiRequest(`${API_BASE}/admin/devices/${deviceId}`, {
            method: 'PUT',
            body: JSON.stringify({
                firstName,
                lastName,
                qualifications,
                leadershipRole
            })
        });
        
        if (!response.ok) {
            throw new Error('Fehler beim Aktualisieren');
        }
        
        // Update device groups
        const groupResponse = await apiRequest(`${API_BASE}/groups/device/${deviceId}`, {
            method: 'PUT',
            body: JSON.stringify({
                groupCodes
            })
        });
        
        if (!groupResponse.ok) {
            throw new Error('Fehler beim Aktualisieren der Gruppen');
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

// Load groups for device assignment
async function refreshGroups() {
    try {
        const response = await apiRequest(`${API_BASE}/groups`);
        
        if (!response.ok) {
            throw new Error('Fehler beim Laden der Gruppen');
        }
        
        const groups = await response.json();
        currentGroups = groups;
    } catch (error) {
        console.error('Fehler beim Laden der Gruppen:', error);
        currentGroups = [];
    }
}
