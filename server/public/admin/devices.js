let currentDevices = [];
let currentGroups = []; // Needed for device group assignment
let ntfyStatusByDeviceId = {};
const ntfyTestClientCooldownMs = 5000;
const ntfyTestCooldownUntilByDeviceId = {};

// Check authentication on page load
window.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('csrfToken');
    const username = sessionStorage.getItem('username');
    
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
    document.getElementById('close-ntfy-modal-btn').addEventListener('click', closeNtfyModal);
    document.getElementById('ntfy-modal').addEventListener('click', (e) => {
        if (e.target.id === 'ntfy-modal') {
            closeNtfyModal();
        }
    });
    document.getElementById('copy-ntfy-topic-btn').addEventListener('click', copyNtfyTopic);
    document.getElementById('copy-ntfy-link-btn').addEventListener('click', copyNtfyLink);
    document.getElementById('download-ntfy-modal-btn').addEventListener('click', downloadNtfyQRCode);
    
    // Load data
    refreshDevices();
    refreshGroups(); // Load groups for device assignment
});

async function refreshDevices() {
    try {
        const response = await apiRequest(`${API_BASE}/devices`);
        
        if (!response.ok) {
            throw new Error('Fehler beim Laden der Geräte');
        }
        
        const payload = await response.json();
        const devices = Array.isArray(payload) ? payload : (payload.data || []);
        ntfyStatusByDeviceId = await loadNtfyProvisioningStatuses(devices);
        currentDevices = devices;
        displayDevices(devices);
    } catch (error) {
        const p = document.createElement('p');
        p.className = 'loading';
        p.style.color = '#dc3545';
        p.textContent = `Fehler beim Laden: ${error.message}`;
        const list = document.getElementById('devices-list');
        list.textContent = '';
        list.appendChild(p);
    }
}

async function loadNtfyProvisioningStatuses(devices) {
    const statuses = {};
    await Promise.all(devices.map(async (device) => {
        try {
            const response = await apiRequest(`${API_BASE}/admin/devices/${device.id}/ntfy-config`);
            if (response && response.ok) {
                statuses[device.id] = { kind: 'ready', label: 'ntfy bereit' };
                return;
            }
            const errorBody = response ? await response.json().catch(() => ({})) : {};
            if (response && response.status === 400 && String(errorBody.error || '').includes('NTFY_BASE_URL')) {
                statuses[device.id] = { kind: 'disabled', label: 'ntfy aus' };
            } else {
                statuses[device.id] = { kind: 'error', label: 'ntfy Fehler' };
            }
        } catch (error) {
            statuses[device.id] = { kind: 'error', label: 'ntfy Fehler' };
        }
    }));
    return statuses;
}

function displayDevices(devices) {
    const container = document.getElementById('devices-list');
    container.textContent = '';

    if (devices.length === 0) {
        const p = document.createElement('p');
        p.className = 'loading';
        p.textContent = 'Keine registrierten Geräte gefunden.';
        container.appendChild(p);
        return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Name</th>
            <th>Plattform</th>
            <th>Registriert</th>
            <th>Ausbildungen</th>
            <th>Führungsrolle</th>
            <th>Gruppen</th>
            <th>Aktionen</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

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

        const row = document.createElement('tr');

        // Name cell
        const nameCell = document.createElement('td');
        const nameStrong = document.createElement('strong');
        nameStrong.textContent = deviceName;
        nameCell.appendChild(nameStrong);
        const ntfyStatus = ntfyStatusByDeviceId[device.id] || { kind: 'disabled', label: 'ntfy aus' };
        const statusBadge = document.createElement('span');
        statusBadge.className = `badge ntfy-status-badge ntfy-status-${ntfyStatus.kind}`;
        statusBadge.textContent = ntfyStatus.label;
        nameCell.appendChild(document.createTextNode(' '));
        nameCell.appendChild(statusBadge);
        row.appendChild(nameCell);

        // Platform cell
        const platformCell = document.createElement('td');
        const platformSpan = document.createElement('span');
        platformSpan.className = 'platform-badge';
        platformSpan.textContent = device.platform;
        platformCell.appendChild(platformSpan);
        row.appendChild(platformCell);

        // Date cell
        const dateCell = document.createElement('td');
        dateCell.textContent = registeredDate;
        row.appendChild(dateCell);

        // Qualifications cell
        const qualCell = document.createElement('td');
        const qualBadges = [];
        if (qualifications.machinist) qualBadges.push('Maschinist');
        if (qualifications.agt) qualBadges.push('AGT');
        if (qualifications.paramedic) qualBadges.push('Sanitäter');
        if (qualBadges.length > 0) {
            qualBadges.forEach(q => {
                const span = document.createElement('span');
                span.className = 'qual-badge';
                span.textContent = q;
                qualCell.appendChild(span);
                qualCell.appendChild(document.createTextNode(' '));
            });
        } else {
            qualCell.textContent = '-';
        }
        row.appendChild(qualCell);

        // Leadership role cell
        const leaderCell = document.createElement('td');
        if (device.leadershipRole === 'groupLeader') {
            const span = document.createElement('span');
            span.className = 'leader-badge-small';
            span.textContent = '⭐ Gruppenführer';
            leaderCell.appendChild(span);
        } else if (device.leadershipRole === 'platoonLeader') {
            const span = document.createElement('span');
            span.className = 'leader-badge-small';
            span.textContent = '⭐⭐ Zugführer';
            leaderCell.appendChild(span);
        } else {
            leaderCell.textContent = '-';
        }
        row.appendChild(leaderCell);

        // Groups cell
        const groupCell = document.createElement('td');
        const assignedGroups = device.assignedGroups || [];
        if (assignedGroups.length > 0) {
            assignedGroups.forEach(code => {
                const group = currentGroups.find(g => g.code === code);
                const groupName = group ? group.name : code;
                const span = document.createElement('span');
                span.className = 'group-badge';
                span.title = groupName;
                span.textContent = code;
                groupCell.appendChild(span);
                groupCell.appendChild(document.createTextNode(' '));
            });
        } else {
            groupCell.textContent = '-';
        }
        row.appendChild(groupCell);

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn-icon';
        editBtn.title = 'Bearbeiten';
        editBtn.textContent = '✏️';
        editBtn.addEventListener('click', () => editDevice(device.id));
        actionsCell.appendChild(editBtn);

        const qrBtn = document.createElement('button');
        qrBtn.className = 'btn-icon';
        qrBtn.title = 'QR-Code';
        qrBtn.textContent = '📱';
        qrBtn.addEventListener('click', () => showDeviceQRCode(device.id));
        actionsCell.appendChild(qrBtn);

        const deactivateBtn = document.createElement('button');
        deactivateBtn.className = 'btn-icon';
        deactivateBtn.title = 'Deaktivieren';
        deactivateBtn.textContent = '🗑️';
        deactivateBtn.addEventListener('click', () => deactivateDevice(device.id));
        actionsCell.appendChild(deactivateBtn);

        const ntfyBtn = document.createElement('button');
        ntfyBtn.className = 'btn-icon';
        ntfyBtn.title = 'ntfy Subscription';
        ntfyBtn.textContent = '🔔';
        ntfyBtn.addEventListener('click', () => showDeviceNtfyConfig(device.id));
        actionsCell.appendChild(ntfyBtn);

        const ntfyTestBtn = document.createElement('button');
        ntfyTestBtn.className = 'btn-icon';
        ntfyTestBtn.title = 'ntfy Test senden';
        ntfyTestBtn.textContent = '🧪';
        ntfyTestBtn.addEventListener('click', () => sendNtfyTest(device.id));
        actionsCell.appendChild(ntfyTestBtn);

        row.appendChild(actionsCell);
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
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

function closeNtfyModal() {
    document.getElementById('ntfy-modal').style.display = 'none';
    window.currentNtfyData = null;
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

async function showDeviceNtfyConfig(deviceId) {
    try {
        const response = await apiRequest(`${API_BASE}/admin/devices/${deviceId}/ntfy-config`);

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || 'Fehler beim Laden der ntfy-Konfiguration');
        }

        const data = await response.json();
        document.getElementById('ntfy-modal-image').src = data.qrCode;
        document.getElementById('ntfy-modal-topic').textContent = data.topic;
        document.getElementById('ntfy-modal-link').textContent = data.subscribeUrl;
        document.getElementById('ntfy-modal').style.display = 'flex';
        window.currentNtfyData = data;
    } catch (error) {
        alert('Fehler beim Laden der ntfy-Konfiguration: ' + error.message);
    }
}

function copyNtfyTopic() {
    if (!window.currentNtfyData) {
        alert('Keine ntfy-Daten geladen');
        return;
    }
    navigator.clipboard.writeText(window.currentNtfyData.topic).then(() => {
        alert('Topic in Zwischenablage kopiert!');
    }).catch((err) => {
        alert('Fehler beim Kopieren: ' + err.message);
    });
}

function copyNtfyLink() {
    if (!window.currentNtfyData) {
        alert('Keine ntfy-Daten geladen');
        return;
    }
    navigator.clipboard.writeText(window.currentNtfyData.subscribeUrl).then(() => {
        alert('Link in Zwischenablage kopiert!');
    }).catch((err) => {
        alert('Fehler beim Kopieren: ' + err.message);
    });
}

function downloadNtfyQRCode() {
    if (!window.currentNtfyData) {
        alert('Kein ntfy QR-Code geladen');
        return;
    }

    const link = document.createElement('a');
    link.href = window.currentNtfyData.qrCode;
    link.download = `ntfy-${window.currentNtfyData.deviceId.substring(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function sendNtfyTest(deviceId) {
    const now = Date.now();
    const localCooldownUntil = ntfyTestCooldownUntilByDeviceId[deviceId] || 0;
    if (localCooldownUntil > now) {
        const sec = Math.ceil((localCooldownUntil - now) / 1000);
        showToast(`Bitte ${sec}s warten, bevor erneut ein Test gesendet wird`, 'warning');
        return;
    }

    if (!confirm('Testnachricht an dieses Gerät via ntfy senden?')) {
        return;
    }
    try {
        ntfyTestCooldownUntilByDeviceId[deviceId] = Date.now() + ntfyTestClientCooldownMs;
        const response = await apiRequest(`${API_BASE}/admin/devices/${deviceId}/ntfy-test`, {
            method: 'POST',
            body: JSON.stringify({}),
        });
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            if (response.status === 429) {
                const retryAfterHeader = response.headers.get('Retry-After');
                const retryAfterSec = Number.parseInt(retryAfterHeader || '0', 10);
                if (Number.isFinite(retryAfterSec) && retryAfterSec > 0) {
                    ntfyTestCooldownUntilByDeviceId[deviceId] = Date.now() + retryAfterSec * 1000;
                }
            } else {
                ntfyTestCooldownUntilByDeviceId[deviceId] = 0;
            }
            throw new Error(errorBody.error || 'Testnachricht fehlgeschlagen');
        }
        showToast('ntfy Testnachricht erfolgreich gesendet', 'success');
    } catch (error) {
        showToast(`ntfy Test fehlgeschlagen: ${error.message}`, 'error');
    }
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
    container.textContent = '';

    if (currentGroups.length === 0) {
        const p = document.createElement('p');
        p.style.color = '#999';
        p.textContent = 'Keine Gruppen verfügbar. Bitte zuerst Gruppen anlegen.';
        container.appendChild(p);
        return;
    }

    currentGroups.forEach(group => {
        const label = document.createElement('label');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = `group_${group.code}`;
        checkbox.value = group.code;
        checkbox.checked = assignedGroups.includes(group.code);
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` ${group.code} - ${group.name}`));

        container.appendChild(label);
    });
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
