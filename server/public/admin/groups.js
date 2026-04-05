let currentGroups = [];

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
        const p = document.createElement('p');
        p.className = 'loading';
        p.style.color = '#dc3545';
        p.textContent = `Fehler beim Laden: ${error.message}`;
        const list = document.getElementById('groups-list');
        list.textContent = '';
        list.appendChild(p);
    }
}

function displayGroups(groups) {
    const container = document.getElementById('groups-list');
    container.textContent = '';

    if (groups.length === 0) {
        const p = document.createElement('p');
        p.className = 'loading';
        p.textContent = 'Keine Gruppen gefunden. Erstellen Sie eine neue Gruppe oder importieren Sie Gruppen aus einer CSV-Datei.';
        container.appendChild(p);
        return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Kürzel</th>
            <th>Name</th>
            <th>Beschreibung</th>
            <th>Aktionen</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    groups.forEach(group => {
        const row = document.createElement('tr');

        // Code cell
        const codeCell = document.createElement('td');
        const codeStrong = document.createElement('strong');
        codeStrong.textContent = group.code;
        codeCell.appendChild(codeStrong);
        row.appendChild(codeCell);

        // Name cell
        const nameCell = document.createElement('td');
        nameCell.textContent = group.name;
        row.appendChild(nameCell);

        // Description cell
        const descCell = document.createElement('td');
        descCell.textContent = group.description || '-';
        row.appendChild(descCell);

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn-icon';
        editBtn.title = 'Bearbeiten';
        editBtn.textContent = '✏️';
        editBtn.addEventListener('click', () => editGroup(group.code));
        actionsCell.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-icon';
        deleteBtn.title = 'Löschen';
        deleteBtn.textContent = '🗑️';
        deleteBtn.addEventListener('click', () => deleteGroup(group.code));
        actionsCell.appendChild(deleteBtn);

        row.appendChild(actionsCell);
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
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
    contentDiv.textContent = '';

    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'import-summary';

    function makeSummaryItem(labelText, value, extraClass) {
        const item = document.createElement('div');
        item.className = extraClass ? `summary-item ${extraClass}` : 'summary-item';
        const labelSpan = document.createElement('span');
        labelSpan.className = 'summary-label';
        labelSpan.textContent = labelText;
        const valueSpan = document.createElement('span');
        valueSpan.className = 'summary-value';
        valueSpan.textContent = value;
        item.appendChild(labelSpan);
        item.appendChild(valueSpan);
        return item;
    }

    summaryDiv.appendChild(makeSummaryItem('Erstellt:', result.created, 'summary-item-success'));
    summaryDiv.appendChild(makeSummaryItem('Aktualisiert:', result.updated, null));

    if (result.errors.length > 0) {
        summaryDiv.appendChild(makeSummaryItem('Fehler:', result.errors.length, 'summary-item-danger'));
    }

    contentDiv.appendChild(summaryDiv);

    if (result.errors.length > 0) {
        const errorsDiv = document.createElement('div');
        errorsDiv.className = 'import-errors';

        const h4 = document.createElement('h4');
        h4.textContent = 'Fehler:';
        errorsDiv.appendChild(h4);

        const ul = document.createElement('ul');
        result.errors.slice(0, 10).forEach(error => {
            const li = document.createElement('li');
            li.textContent = error;
            ul.appendChild(li);
        });
        if (result.errors.length > 10) {
            const li = document.createElement('li');
            li.textContent = `... und ${result.errors.length - 10} weitere Fehler`;
            ul.appendChild(li);
        }
        errorsDiv.appendChild(ul);
        contentDiv.appendChild(errorsDiv);
    }

    resultDiv.style.display = 'block';
}


