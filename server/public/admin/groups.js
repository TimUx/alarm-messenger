const API_BASE = window.location.origin + '/api';
let currentGroups = [];

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
    
    // Load groups
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
    
    // Create table
    let tableHtml = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Kürzel</th>
                    <th>Name</th>
                    <th>Beschreibung</th>
                    <th>Aktionen</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    groups.forEach(group => {
        const escapedCode = escapeHtml(group.code);
        const escapedName = escapeHtml(group.name);
        const escapedDescription = escapeHtml(group.description || '-');
        
        tableHtml += `
            <tr>
                <td><strong>${escapedCode}</strong></td>
                <td>${escapedName}</td>
                <td>${escapedDescription}</td>
                <td class="actions-cell">
                    <button class="btn-icon" title="Bearbeiten" data-action="edit-group" data-group-code="${escapedCode}">✏️</button>
                    <button class="btn-icon" title="Löschen" data-action="delete-group" data-group-code="${escapedCode}">🗑️</button>
                </td>
            </tr>
        `;
    });
    
    tableHtml += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHtml;
    
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

// ===== CSV Import Functions =====

function openImportModal() {
    document.getElementById('import-csv-data').value = '';
    document.getElementById('import-result').style.display = 'none';
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
        
        // Display result
        displayImportResult(result);
        refreshGroups();
    } catch (error) {
        alert('Fehler beim Importieren: ' + error.message);
    }
}

function displayImportResult(result) {
    const resultDiv = document.getElementById('import-result');
    const contentDiv = document.getElementById('import-result-content');
    
    let html = `
        <div class="import-summary">
            <div class="summary-item summary-item-success">
                <span class="summary-label">Erstellt:</span>
                <span class="summary-value">${result.created}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Aktualisiert:</span>
                <span class="summary-value">${result.updated}</span>
            </div>
    `;
    
    if (result.errors.length > 0) {
        html += `
            <div class="summary-item summary-item-danger">
                <span class="summary-label">Fehler:</span>
                <span class="summary-value">${result.errors.length}</span>
            </div>
        `;
    }
    
    html += '</div>';
    
    if (result.errors.length > 0) {
        html += '<div class="import-errors"><h4>Fehler:</h4><ul>';
        result.errors.slice(0, 10).forEach(error => {
            html += `<li>${escapeHtml(error)}</li>`;
        });
        if (result.errors.length > 10) {
            html += `<li>... und ${result.errors.length - 10} weitere Fehler</li>`;
        }
        html += '</ul></div>';
    }
    
    contentDiv.innerHTML = html;
    resultDiv.style.display = 'block';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
