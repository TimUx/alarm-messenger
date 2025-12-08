const API_BASE = window.location.origin + '/api';
let currentDevices = [];
let currentGroups = [];
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
    
    // Setup event listeners
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('generate-qr-btn').addEventListener('click', generateQRCode);
    document.getElementById('copy-token-btn').addEventListener('click', copyToken);
    document.getElementById('download-qr-btn').addEventListener('click', downloadQRCode);
    document.getElementById('refresh-devices-btn').addEventListener('click', refreshDevices);
    document.getElementById('close-modal-btn').addEventListener('click', closeEditModal);
    document.getElementById('cancel-modal-btn').addEventListener('click', closeEditModal);
    document.getElementById('edit-modal').addEventListener('click', (e) => {
        if (e.target.id === 'edit-modal') {
            closeEditModal();
        }
    });
    
    // Group management listeners
    document.getElementById('add-group-btn').addEventListener('click', () => openGroupModal());
    document.getElementById('close-group-modal-btn').addEventListener('click', closeGroupModal);
    document.getElementById('cancel-group-modal-btn').addEventListener('click', closeGroupModal);
    document.getElementById('group-modal').addEventListener('click', (e) => {
        if (e.target.id === 'group-modal') {
            closeGroupModal();
        }
    });
    
    // Import groups listeners
    document.getElementById('import-groups-btn').addEventListener('click', openImportModal);
    document.getElementById('close-import-modal-btn').addEventListener('click', closeImportModal);
    document.getElementById('cancel-import-btn').addEventListener('click', closeImportModal);
    document.getElementById('confirm-import-btn').addEventListener('click', importGroups);
    document.getElementById('import-groups-modal').addEventListener('click', (e) => {
        if (e.target.id === 'import-groups-modal') {
            closeImportModal();
        }
    });
    
    // Load data
    refreshDevices();
    refreshGroups();
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

function createDeviceCard(device) {
    let registeredDate;
    try {
        registeredDate = new Date(device.registeredAt).toLocaleString('de-DE');
    } catch (e) {
        registeredDate = 'Ungültiges Datum';
    }
    
    const deviceName = device.responderName || 'Nicht zugewiesen';
    const qualifications = device.qualifications || {};
    
    const qualBadges = [];
    if (qualifications.machinist) qualBadges.push('Maschinist');
    if (qualifications.agt) qualBadges.push('AGT');
    if (qualifications.paramedic) qualBadges.push('Sanitäter');
    
    // Leadership role badge
    let leaderBadge = '';
    if (device.leadershipRole === 'groupLeader') {
        leaderBadge = '<div class="leader-badge">⭐ Gruppenführer</div>';
    } else if (device.leadershipRole === 'platoonLeader') {
        leaderBadge = '<div class="leader-badge">⭐⭐ Zugführer</div>';
    }
    
    // Assigned groups
    const assignedGroups = device.assignedGroups || [];
    const groupBadges = assignedGroups.map(code => {
        const group = currentGroups.find(g => g.code === code);
        const groupName = group ? group.name : code;
        return `<span class="group-badge" title="${escapeHtml(groupName)}">${escapeHtml(code)}</span>`;
    }).join('');
    
    // Escape all user-provided or dynamic content
    const escapedDeviceName = escapeHtml(deviceName);
    const escapedPlatform = escapeHtml(device.platform);
    const escapedDeviceId = escapeHtml(device.id);
    const escapedDeviceIdShort = escapeHtml(device.id.substring(0, 8));
    
    const cardHtml = `
        <div class="device-card">
            <div class="device-header">
                <div class="device-name">${escapedDeviceName}</div>
                <div class="device-platform">${escapedPlatform}</div>
            </div>
            <div class="device-info">
                <div class="device-info-row">
                    <span class="device-info-label">Registriert:</span>
                    <span class="device-info-value">${registeredDate}</span>
                </div>
                <div class="device-info-row">
                    <span class="device-info-label">Device ID:</span>
                    <span class="device-info-value">${escapedDeviceIdShort}...</span>
                </div>
            </div>
            ${qualBadges.length > 0 ? `
                <div class="qualifications">
                    <h4>Ausbildungen:</h4>
                    <div class="qual-badges">
                        ${qualBadges.map(q => `<span class="qual-badge">${escapeHtml(q)}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            ${leaderBadge}
            ${assignedGroups.length > 0 ? `
                <div class="qualifications">
                    <h4>Zugeordnete Gruppen:</h4>
                    <div class="qual-badges">
                        ${groupBadges}
                    </div>
                </div>
            ` : ''}
            <div class="device-actions">
                <button class="btn btn-secondary" data-action="edit" data-device-id="${escapedDeviceId}">Bearbeiten</button>
                <button class="btn btn-secondary" data-action="deactivate" data-device-id="${escapedDeviceId}">Deaktivieren</button>
            </div>
        </div>
    `;
    
    return cardHtml;
}

function displayDevices(devices) {
    const container = document.getElementById('devices-list');
    
    if (devices.length === 0) {
        container.innerHTML = '<p class="loading">Keine registrierten Geräte gefunden.</p>';
        return;
    }
    
    container.innerHTML = devices.map(device => createDeviceCard(device)).join('');
    
    // Add event listeners to device action buttons
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

function editDevice(deviceId) {
    const device = currentDevices.find(d => d.id === deviceId);
    if (!device) return;
    
    document.getElementById('edit-device-id').value = device.id;
    document.getElementById('edit-responder-name').value = device.responderName || '';
    
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
    const responderName = document.getElementById('edit-responder-name').value;
    
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
                responderName,
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

// ===== Group Management Functions =====

async function refreshGroups() {
    try {
        const response = await apiRequest(`${API_BASE}/groups`);
        
        if (!response.ok) {
            throw new Error('Fehler beim Laden der Gruppen');
        }
        
        const groups = await response.json();
        currentGroups = groups;
        displayGroups(groups);
    } catch (error) {
        document.getElementById('groups-list').innerHTML = 
            `<p class="loading" style="color: #dc3545;">Fehler beim Laden: ${error.message}</p>`;
    }
}

function displayGroups(groups) {
    const container = document.getElementById('groups-list');
    
    if (groups.length === 0) {
        container.innerHTML = '<p class="loading">Keine Gruppen gefunden. Erstellen Sie eine neue Gruppe oder importieren Sie Gruppen aus einer CSV-Datei.</p>';
        return;
    }
    
    const groupsHtml = groups.map(group => {
        const escapedCode = escapeHtml(group.code);
        const escapedName = escapeHtml(group.name);
        const escapedDescription = escapeHtml(group.description || '');
        
        return `
            <div class="device-card">
                <div class="device-header">
                    <div class="device-name">${escapedCode}</div>
                </div>
                <div class="device-info">
                    <div class="device-info-row">
                        <span class="device-info-label">Name:</span>
                        <span class="device-info-value">${escapedName}</span>
                    </div>
                    ${escapedDescription ? `
                        <div class="device-info-row">
                            <span class="device-info-label">Beschreibung:</span>
                            <span class="device-info-value">${escapedDescription}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="device-actions">
                    <button class="btn btn-secondary" data-action="edit-group" data-group-code="${escapedCode}">Bearbeiten</button>
                    <button class="btn btn-secondary" data-action="delete-group" data-group-code="${escapedCode}">Löschen</button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = groupsHtml;
    
    // Add event listeners
    container.querySelectorAll('[data-action="edit-group"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const code = e.target.getAttribute('data-group-code');
            editGroup(code);
        });
    });
    
    container.querySelectorAll('[data-action="delete-group"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const code = e.target.getAttribute('data-group-code');
            deleteGroup(code);
        });
    });
}

function openGroupModal(groupCode = null) {
    if (groupCode) {
        const group = currentGroups.find(g => g.code === groupCode);
        if (group) {
            document.getElementById('group-modal-title').textContent = 'Gruppe bearbeiten';
            document.getElementById('edit-group-original-code').value = group.code;
            document.getElementById('edit-group-code').value = group.code;
            document.getElementById('edit-group-code').disabled = true; // Don't allow changing code
            document.getElementById('edit-group-name').value = group.name;
            document.getElementById('edit-group-description').value = group.description || '';
        }
    } else {
        document.getElementById('group-modal-title').textContent = 'Neue Gruppe';
        document.getElementById('edit-group-original-code').value = '';
        document.getElementById('edit-group-code').value = '';
        document.getElementById('edit-group-code').disabled = false;
        document.getElementById('edit-group-name').value = '';
        document.getElementById('edit-group-description').value = '';
    }
    
    document.getElementById('group-modal').style.display = 'flex';
}

function closeGroupModal() {
    document.getElementById('group-modal').style.display = 'none';
}

function editGroup(code) {
    openGroupModal(code);
}

async function deleteGroup(code) {
    if (!confirm(`Möchten Sie die Gruppe "${code}" wirklich löschen?`)) {
        return;
    }
    
    try {
        const response = await apiRequest(`${API_BASE}/groups/${code}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Fehler beim Löschen');
        }
        
        refreshGroups();
        alert('Gruppe erfolgreich gelöscht!');
    } catch (error) {
        alert('Fehler: ' + error.message);
    }
}

document.getElementById('groupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const originalCode = document.getElementById('edit-group-original-code').value;
    const code = document.getElementById('edit-group-code').value.toUpperCase();
    const name = document.getElementById('edit-group-name').value;
    const description = document.getElementById('edit-group-description').value;
    
    try {
        if (originalCode) {
            // Update existing group
            const response = await apiRequest(`${API_BASE}/groups/${originalCode}`, {
                method: 'PUT',
                body: JSON.stringify({ name, description })
            });
            
            if (!response.ok) {
                throw new Error('Fehler beim Aktualisieren');
            }
            
            alert('Gruppe erfolgreich aktualisiert!');
        } else {
            // Create new group
            const response = await apiRequest(`${API_BASE}/groups`, {
                method: 'POST',
                body: JSON.stringify({ code, name, description })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Fehler beim Erstellen');
            }
            
            alert('Gruppe erfolgreich erstellt!');
        }
        
        closeGroupModal();
        refreshGroups();
    } catch (error) {
        alert('Fehler: ' + error.message);
    }
});

function openImportModal() {
    document.getElementById('import-csv-data').value = '';
    document.getElementById('import-groups-modal').style.display = 'flex';
}

function closeImportModal() {
    document.getElementById('import-groups-modal').style.display = 'none';
}

async function importGroups() {
    const csvData = document.getElementById('import-csv-data').value.trim();
    
    if (!csvData) {
        alert('Bitte CSV-Daten eingeben');
        return;
    }
    
    try {
        // Parse CSV
        const lines = csvData.split('\n').filter(line => line.trim());
        const groups = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip header if it looks like one
            if (i === 0 && (line.toLowerCase().includes('code') || line.toLowerCase().includes('name'))) {
                continue;
            }
            
            // Parse CSV line (simple comma split, doesn't handle quoted values)
            const parts = line.split(',').map(p => p.trim());
            
            if (parts.length >= 2) {
                groups.push({
                    code: parts[0],
                    name: parts[1],
                    description: parts[2] || ''
                });
            }
        }
        
        if (groups.length === 0) {
            alert('Keine gültigen Gruppen gefunden');
            return;
        }
        
        // Import groups
        const response = await apiRequest(`${API_BASE}/groups/import`, {
            method: 'POST',
            body: JSON.stringify({ groups })
        });
        
        if (!response.ok) {
            throw new Error('Fehler beim Importieren');
        }
        
        const result = await response.json();
        
        let message = `Import abgeschlossen!\n`;
        message += `Erstellt: ${result.created}\n`;
        message += `Aktualisiert: ${result.updated}\n`;
        if (result.errors.length > 0) {
            message += `Fehler: ${result.errors.length}\n\n`;
            message += result.errors.slice(0, 5).join('\n');
        }
        
        alert(message);
        closeImportModal();
        refreshGroups();
    } catch (error) {
        alert('Fehler beim Importieren: ' + error.message);
    }
}
