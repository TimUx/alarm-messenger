const API_BASE = window.location.origin + '/api';

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
    document.getElementById('import-btn').addEventListener('click', importGroups);
    document.getElementById('clear-btn').addEventListener('click', clearForm);
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
    
    // Scroll to result
    resultDiv.scrollIntoView({ behavior: 'smooth' });
}

function clearForm() {
    document.getElementById('import-csv-data').value = '';
    document.getElementById('import-result').style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
