const API_BASE = window.location.origin + '/api';
let currentPage = 1;
let totalPages = 1;

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
    document.getElementById('refresh-btn').addEventListener('click', () => loadEmergencies(currentPage));
    document.getElementById('prev-page-btn').addEventListener('click', () => loadEmergencies(currentPage - 1));
    document.getElementById('next-page-btn').addEventListener('click', () => loadEmergencies(currentPage + 1));
    document.getElementById('close-details-modal-btn').addEventListener('click', closeDetailsModal);
    document.getElementById('details-modal').addEventListener('click', (e) => {
        if (e.target.id === 'details-modal') {
            closeDetailsModal();
        }
    });
    
    // Load data
    loadEmergencies(1);
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

async function loadEmergencies(page = 1) {
    try {
        const response = await apiRequest(`${API_BASE}/admin/emergencies?page=${page}&limit=20`);
        
        if (!response.ok) {
            throw new Error('Fehler beim Laden der Einsätze');
        }
        
        const data = await response.json();
        currentPage = data.pagination.page;
        totalPages = data.pagination.totalPages;
        
        displayEmergencies(data.emergencies);
        updatePagination(data.pagination);
    } catch (error) {
        document.getElementById('emergencies-list').innerHTML = 
            `<p class="loading" style="color: #dc3545;">Fehler beim Laden: ${error.message}</p>`;
    }
}

function displayEmergencies(emergencies) {
    const container = document.getElementById('emergencies-list');
    
    if (emergencies.length === 0) {
        container.innerHTML = '<p class="loading">Keine Einsätze gefunden.</p>';
        return;
    }
    
    const emergenciesHtml = emergencies.map(emergency => {
        let emergencyDateTime;
        try {
            emergencyDateTime = new Date(emergency.emergencyDate).toLocaleString('de-DE');
        } catch (e) {
            emergencyDateTime = emergency.emergencyDate;
        }
        
        let createdDate;
        try {
            createdDate = new Date(emergency.createdAt).toLocaleString('de-DE');
        } catch (e) {
            createdDate = emergency.createdAt;
        }
        
        const escapedKeyword = escapeHtml(emergency.emergencyKeyword);
        const escapedLocation = escapeHtml(emergency.emergencyLocation);
        const escapedDescription = escapeHtml(emergency.emergencyDescription);
        const escapedNumber = escapeHtml(emergency.emergencyNumber);
        const escapedId = escapeHtml(emergency.id);
        
        return `
            <div class="emergency-card">
                <div class="emergency-header">
                    <div class="emergency-keyword">${escapedKeyword}</div>
                    <div class="emergency-date">${emergencyDateTime}</div>
                </div>
                <div class="emergency-info">
                    <div class="emergency-info-row">
                        <span class="emergency-info-label">Ort:</span>
                        <span class="emergency-info-value">${escapedLocation}</span>
                    </div>
                    <div class="emergency-info-row">
                        <span class="emergency-info-label">Einsatznummer:</span>
                        <span class="emergency-info-value">${escapedNumber}</span>
                    </div>
                    <div class="emergency-info-row">
                        <span class="emergency-info-label">Beschreibung:</span>
                        <span class="emergency-info-value">${escapedDescription}</span>
                    </div>
                    <div class="emergency-info-row">
                        <span class="emergency-info-label">Erstellt:</span>
                        <span class="emergency-info-value">${createdDate}</span>
                    </div>
                    ${emergency.groups ? `
                        <div class="emergency-info-row">
                            <span class="emergency-info-label">Gruppen:</span>
                            <span class="emergency-info-value">${escapeHtml(emergency.groups)}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="emergency-actions">
                    <button class="btn btn-primary" data-action="view-details" data-emergency-id="${escapedId}">Details anzeigen</button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = emergenciesHtml;
    
    // Add event listeners
    container.querySelectorAll('[data-action="view-details"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const emergencyId = e.target.getAttribute('data-emergency-id');
            showEmergencyDetails(emergencyId);
        });
    });
}

function updatePagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const pageInfo = document.getElementById('page-info');
    
    pageInfo.textContent = `Seite ${pagination.page} von ${pagination.totalPages} (${pagination.total} Einsätze)`;
    
    prevBtn.disabled = pagination.page <= 1;
    nextBtn.disabled = pagination.page >= pagination.totalPages;
    
    paginationDiv.style.display = pagination.totalPages > 1 ? 'flex' : 'none';
}

async function showEmergencyDetails(emergencyId) {
    try {
        document.getElementById('details-modal').style.display = 'flex';
        document.getElementById('emergency-details-content').innerHTML = '<p class="loading">Lade Details...</p>';
        
        const response = await apiRequest(`${API_BASE}/admin/emergencies/${emergencyId}`);
        
        if (!response.ok) {
            throw new Error('Fehler beim Laden der Details');
        }
        
        const data = await response.json();
        displayEmergencyDetails(data);
    } catch (error) {
        document.getElementById('emergency-details-content').innerHTML = 
            `<p class="loading" style="color: #dc3545;">Fehler: ${error.message}</p>`;
    }
}

function displayEmergencyDetails(data) {
    const { emergency, responses, summary } = data;
    
    let emergencyDateTime;
    try {
        emergencyDateTime = new Date(emergency.emergencyDate).toLocaleString('de-DE');
    } catch (e) {
        emergencyDateTime = emergency.emergencyDate;
    }
    
    const escapedKeyword = escapeHtml(emergency.emergencyKeyword);
    const escapedLocation = escapeHtml(emergency.emergencyLocation);
    const escapedDescription = escapeHtml(emergency.emergencyDescription);
    const escapedNumber = escapeHtml(emergency.emergencyNumber);
    
    // Build responses list
    const participantsList = responses
        .filter(r => r.participating)
        .map(r => {
            const name = [r.responder.firstName, r.responder.lastName].filter(Boolean).join(' ') || 'Unbekannt';
            const quals = [];
            if (r.responder.qualifications.machinist) quals.push('Maschinist');
            if (r.responder.qualifications.agt) quals.push('AGT');
            if (r.responder.qualifications.paramedic) quals.push('Sanitäter');
            
            let leaderBadge = '';
            if (r.responder.leadershipRole === 'groupLeader') {
                leaderBadge = ' <span class="leader-badge-small">⭐ Gruppenführer</span>';
            } else if (r.responder.leadershipRole === 'platoonLeader') {
                leaderBadge = ' <span class="leader-badge-small">⭐⭐ Zugführer</span>';
            }
            
            const qualBadges = quals.length > 0 ? quals.map(q => `<span class="qual-badge-small">${escapeHtml(q)}</span>`).join('') : '';
            
            let respondedTime;
            try {
                respondedTime = new Date(r.respondedAt).toLocaleString('de-DE');
            } catch (e) {
                respondedTime = r.respondedAt;
            }
            
            return `
                <div class="responder-item">
                    <div class="responder-name">${escapeHtml(name)}${leaderBadge}</div>
                    ${qualBadges ? `<div class="responder-quals">${qualBadges}</div>` : ''}
                    <div class="responder-time">Rückmeldung: ${respondedTime}</div>
                </div>
            `;
        }).join('') || '<p style="color: #999;">Keine Teilnehmer</p>';
    
    const nonParticipantsList = responses
        .filter(r => !r.participating)
        .map(r => {
            const name = [r.responder.firstName, r.responder.lastName].filter(Boolean).join(' ') || 'Unbekannt';
            
            let respondedTime;
            try {
                respondedTime = new Date(r.respondedAt).toLocaleString('de-DE');
            } catch (e) {
                respondedTime = r.respondedAt;
            }
            
            return `
                <div class="responder-item">
                    <div class="responder-name">${escapeHtml(name)}</div>
                    <div class="responder-time">Abgesagt: ${respondedTime}</div>
                </div>
            `;
        }).join('') || '<p style="color: #999;">Keine Absagen</p>';
    
    const detailsHtml = `
        <div class="emergency-details">
            <div class="emergency-details-header">
                <h3>${escapedKeyword}</h3>
                <p class="emergency-details-date">${emergencyDateTime}</p>
            </div>
            
            <div class="emergency-details-section">
                <h4>Einsatzinformationen</h4>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Einsatznummer:</span>
                        <span class="detail-value">${escapedNumber}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Ort:</span>
                        <span class="detail-value">${escapedLocation}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Beschreibung:</span>
                        <span class="detail-value">${escapedDescription}</span>
                    </div>
                    ${emergency.groups ? `
                        <div class="detail-item">
                            <span class="detail-label">Alarmierte Gruppen:</span>
                            <span class="detail-value">${escapeHtml(emergency.groups)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="emergency-details-section">
                <h4>Rückmeldungen</h4>
                <div class="response-summary">
                    <div class="summary-item">
                        <span class="summary-label">Gesamt:</span>
                        <span class="summary-value">${summary.totalResponses}</span>
                    </div>
                    <div class="summary-item summary-item-success">
                        <span class="summary-label">Teilnehmer:</span>
                        <span class="summary-value">${summary.participants}</span>
                    </div>
                    <div class="summary-item summary-item-danger">
                        <span class="summary-label">Absagen:</span>
                        <span class="summary-value">${summary.nonParticipants}</span>
                    </div>
                </div>
            </div>
            
            <div class="emergency-details-section">
                <h4>Teilnehmende Einsatzkräfte (${summary.participants})</h4>
                <div class="responders-list">
                    ${participantsList}
                </div>
            </div>
            
            ${summary.nonParticipants > 0 ? `
                <div class="emergency-details-section">
                    <h4>Abgesagte Einsatzkräfte (${summary.nonParticipants})</h4>
                    <div class="responders-list">
                        ${nonParticipantsList}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('emergency-details-content').innerHTML = detailsHtml;
}

function closeDetailsModal() {
    document.getElementById('details-modal').style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
