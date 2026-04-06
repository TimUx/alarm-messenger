let currentPage = 1;
let totalPages = 1;
let allEmergencies = []; // Store all emergencies for client-side filtering/sorting
let filteredEmergencies = []; // Store filtered emergencies
let currentEmergencyId = null;
let currentEmergencyActive = false;

// Filter and sort state
let filters = {
    keyword: '',
    number: '',
    location: '',
    groups: ''
};
let sortBy = 'date-desc';

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
    document.getElementById('refresh-btn').addEventListener('click', () => {
        loadEmergencies();
    });
    document.getElementById('prev-page-btn').addEventListener('click', () => displayPage(currentPage - 1));
    document.getElementById('next-page-btn').addEventListener('click', () => displayPage(currentPage + 1));
    document.getElementById('close-details-modal-btn').addEventListener('click', closeDetailsModal);
    document.getElementById('end-emergency-btn').addEventListener('click', () => {
        if (currentEmergencyId && currentEmergencyActive) {
            endEmergency(currentEmergencyId);
        }
    });
    document.getElementById('details-modal').addEventListener('click', (e) => {
        if (e.target.id === 'details-modal') {
            closeDetailsModal();
        }
    });
    
    // Filter controls
    document.getElementById('filter-keyword').addEventListener('input', (e) => {
        filters.keyword = e.target.value.toLowerCase();
        applyFiltersAndSort();
    });
    document.getElementById('filter-number').addEventListener('input', (e) => {
        filters.number = e.target.value.toLowerCase();
        applyFiltersAndSort();
    });
    document.getElementById('filter-location').addEventListener('input', (e) => {
        filters.location = e.target.value.toLowerCase();
        applyFiltersAndSort();
    });
    document.getElementById('filter-groups').addEventListener('input', (e) => {
        filters.groups = e.target.value.toLowerCase();
        applyFiltersAndSort();
    });
    document.getElementById('clear-filters-btn').addEventListener('click', clearFilters);
    
    // Sort control
    document.getElementById('sort-by').addEventListener('change', (e) => {
        sortBy = e.target.value;
        applyFiltersAndSort();
    });
    
    // Load data
    loadEmergencies();
    
    // Subscribe to real-time response events
    subscribeToEvents();
});

async function loadEmergencies() {
    try {
        // Load all emergencies at once (no pagination from server)
        // Note: Using a limit of 1000 for simplicity. In production with large datasets,
        // consider implementing server-side filtering to handle more than 1000 emergencies.
        const response = await apiRequest(`${API_BASE}/admin/emergencies?page=1&limit=1000`);
        
        if (!response.ok) {
            throw new Error('Fehler beim Laden der Einsätze');
        }
        
        const data = await response.json();
        allEmergencies = data.emergencies;
        
        // Apply filters and sort
        applyFiltersAndSort();
    } catch (error) {
        const p = document.createElement('p');
        p.className = 'loading';
        p.style.color = '#dc3545';
        p.textContent = `Fehler beim Laden: ${error.message}`;
        const list = document.getElementById('emergencies-list');
        list.textContent = '';
        list.appendChild(p);
    }
}

function clearFilters() {
    filters = {
        keyword: '',
        number: '',
        location: '',
        groups: ''
    };
    document.getElementById('filter-keyword').value = '';
    document.getElementById('filter-number').value = '';
    document.getElementById('filter-location').value = '';
    document.getElementById('filter-groups').value = '';
    applyFiltersAndSort();
}

function applyFiltersAndSort() {
    // Filter emergencies
    filteredEmergencies = allEmergencies.filter(emergency => {
        const keyword = emergency.emergencyKeyword.toLowerCase();
        const number = emergency.emergencyNumber.toLowerCase();
        const location = emergency.emergencyLocation.toLowerCase();
        const groups = (emergency.groups || '').toLowerCase();
        
        return (
            keyword.includes(filters.keyword) &&
            number.includes(filters.number) &&
            location.includes(filters.location) &&
            groups.includes(filters.groups)
        );
    });
    
    // Sort emergencies
    filteredEmergencies.sort((a, b) => {
        switch(sortBy) {
            case 'date-desc':
                return new Date(b.emergencyDate) - new Date(a.emergencyDate);
            case 'date-asc':
                return new Date(a.emergencyDate) - new Date(b.emergencyDate);
            case 'keyword-asc':
                return a.emergencyKeyword.localeCompare(b.emergencyKeyword);
            case 'keyword-desc':
                return b.emergencyKeyword.localeCompare(a.emergencyKeyword);
            case 'number-asc':
                return a.emergencyNumber.localeCompare(b.emergencyNumber);
            case 'number-desc':
                return b.emergencyNumber.localeCompare(a.emergencyNumber);
            default:
                return 0;
        }
    });
    
    // Reset to page 1 and display
    currentPage = 1;
    displayPage(1);
}

function displayPage(page) {
    const itemsPerPage = 20;
    totalPages = Math.max(1, Math.ceil(filteredEmergencies.length / itemsPerPage));
    currentPage = Math.max(1, Math.min(page, totalPages));
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageEmergencies = filteredEmergencies.slice(startIndex, endIndex);
    
    displayEmergencies(pageEmergencies);
    updatePagination({
        page: currentPage,
        totalPages: totalPages,
        total: filteredEmergencies.length
    });
}

function displayEmergencies(emergencies) {
    const container = document.getElementById('emergencies-list');
    container.textContent = '';

    if (emergencies.length === 0) {
        const p = document.createElement('p');
        p.className = 'loading';
        p.textContent = 'Keine Einsätze gefunden.';
        container.appendChild(p);
        return;
    }

    const table = document.createElement('table');
    table.className = 'data-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Stichwort</th>
            <th>Einsatznummer</th>
            <th>Ort</th>
            <th>Datum/Zeit</th>
            <th>Gruppen</th>
            <th>Aktionen</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    emergencies.forEach(emergency => {
        let emergencyDateTime;
        try {
            emergencyDateTime = new Date(emergency.emergencyDate).toLocaleString('de-DE');
        } catch (e) {
            emergencyDateTime = emergency.emergencyDate;
        }

        const row = document.createElement('tr');

        const keywordCell = document.createElement('td');
        const keywordStrong = document.createElement('strong');
        keywordStrong.className = 'emergency-keyword-text';
        keywordStrong.textContent = emergency.emergencyKeyword;
        keywordCell.appendChild(keywordStrong);
        row.appendChild(keywordCell);

        const numberCell = document.createElement('td');
        numberCell.textContent = emergency.emergencyNumber;
        row.appendChild(numberCell);

        const locationCell = document.createElement('td');
        locationCell.textContent = emergency.emergencyLocation;
        row.appendChild(locationCell);

        const dateCell = document.createElement('td');
        dateCell.textContent = emergencyDateTime;
        row.appendChild(dateCell);

        const groupsCell = document.createElement('td');
        groupsCell.textContent = emergency.groups || '-';
        row.appendChild(groupsCell);

        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';
        const detailsBtn = document.createElement('button');
        detailsBtn.className = 'btn-icon';
        detailsBtn.title = 'Details anzeigen';
        detailsBtn.textContent = '📋';
        detailsBtn.addEventListener('click', () => showEmergencyDetails(emergency.id));
        actionsCell.appendChild(detailsBtn);
        row.appendChild(actionsCell);

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
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
    currentEmergencyId = emergencyId;
    try {
        document.getElementById('details-modal').style.display = 'flex';
        const detailsContent = document.getElementById('emergency-details-content');
        detailsContent.textContent = '';
        const loadingP = document.createElement('p');
        loadingP.className = 'loading';
        loadingP.textContent = 'Lade Details...';
        detailsContent.appendChild(loadingP);
        document.getElementById('end-emergency-btn').style.display = 'none';
        
        const response = await apiRequest(`${API_BASE}/admin/emergencies/${emergencyId}`);
        
        if (!response.ok) {
            throw new Error('Fehler beim Laden der Details');
        }
        
        const data = await response.json();
        currentEmergencyActive = data.emergency && data.emergency.active;
        document.getElementById('end-emergency-btn').style.display = currentEmergencyActive ? 'block' : 'none';
        displayEmergencyDetails(data);
    } catch (error) {
        const detailsContent = document.getElementById('emergency-details-content');
        detailsContent.textContent = '';
        const p = document.createElement('p');
        p.className = 'loading';
        p.style.color = '#dc3545';
        p.textContent = `Fehler: ${error.message}`;
        detailsContent.appendChild(p);
    }
}

function displayEmergencyDetails(data) {
    const { emergency, responses, summary } = data;
    const container = document.getElementById('emergency-details-content');
    container.textContent = '';

    let emergencyDateTime;
    try {
        emergencyDateTime = new Date(emergency.emergencyDate).toLocaleString('de-DE');
    } catch (e) {
        emergencyDateTime = emergency.emergencyDate;
    }

    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'emergency-details';

    // Header
    const headerDiv = document.createElement('div');
    headerDiv.className = 'emergency-details-header';
    const headerH3 = document.createElement('h3');
    headerH3.textContent = emergency.emergencyKeyword;
    const headerDate = document.createElement('p');
    headerDate.className = 'emergency-details-date';
    headerDate.textContent = emergencyDateTime;
    headerDiv.appendChild(headerH3);
    headerDiv.appendChild(headerDate);
    detailsDiv.appendChild(headerDiv);

    // Helper: create a detail-item row
    function makeDetailItem(labelText, valueText) {
        const item = document.createElement('div');
        item.className = 'detail-item';
        const labelSpan = document.createElement('span');
        labelSpan.className = 'detail-label';
        labelSpan.textContent = labelText;
        const valueSpan = document.createElement('span');
        valueSpan.className = 'detail-value';
        valueSpan.textContent = valueText;
        item.appendChild(labelSpan);
        item.appendChild(valueSpan);
        return item;
    }

    // Helper: create a summary-item
    function makeSummaryItem(labelText, valueText, extraClass) {
        const item = document.createElement('div');
        item.className = extraClass ? `summary-item ${extraClass}` : 'summary-item';
        const labelSpan = document.createElement('span');
        labelSpan.className = 'summary-label';
        labelSpan.textContent = labelText;
        const valueSpan = document.createElement('span');
        valueSpan.className = 'summary-value';
        valueSpan.textContent = valueText;
        item.appendChild(labelSpan);
        item.appendChild(valueSpan);
        return item;
    }

    // Emergency info section
    const infoSection = document.createElement('div');
    infoSection.className = 'emergency-details-section';
    const infoH4 = document.createElement('h4');
    infoH4.textContent = 'Einsatzinformationen';
    infoSection.appendChild(infoH4);
    const detailsGrid = document.createElement('div');
    detailsGrid.className = 'details-grid';
    detailsGrid.appendChild(makeDetailItem('Einsatznummer:', emergency.emergencyNumber));
    detailsGrid.appendChild(makeDetailItem('Ort:', emergency.emergencyLocation));
    detailsGrid.appendChild(makeDetailItem('Beschreibung:', emergency.emergencyDescription));
    if (emergency.groups) {
        detailsGrid.appendChild(makeDetailItem('Alarmierte Gruppen:', emergency.groups));
    }
    infoSection.appendChild(detailsGrid);
    detailsDiv.appendChild(infoSection);

    // Response summary section
    const summarySection = document.createElement('div');
    summarySection.className = 'emergency-details-section';
    const summaryH4 = document.createElement('h4');
    summaryH4.textContent = 'Rückmeldungen';
    summarySection.appendChild(summaryH4);
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'response-summary';
    summaryDiv.appendChild(makeSummaryItem('Gesamt:', summary.totalResponses, null));
    summaryDiv.appendChild(makeSummaryItem('Teilnehmer:', summary.participants, 'summary-item-success'));
    summaryDiv.appendChild(makeSummaryItem('Absagen:', summary.nonParticipants, 'summary-item-danger'));
    summarySection.appendChild(summaryDiv);
    detailsDiv.appendChild(summarySection);

    // Helper: build a responder item element
    function makeResponderItem(r, showQuals) {
        const name = [r.responder.firstName, r.responder.lastName].filter(Boolean).join(' ') || 'Unbekannt';

        let respondedTime;
        try {
            respondedTime = new Date(r.respondedAt).toLocaleString('de-DE');
        } catch (e) {
            respondedTime = r.respondedAt;
        }

        const item = document.createElement('div');
        item.className = 'responder-item';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'responder-name';
        nameDiv.textContent = name;
        if (r.responder.leadershipRole === 'groupLeader') {
            const badge = document.createElement('span');
            badge.className = 'leader-badge-small';
            badge.textContent = '⭐ Gruppenführer';
            nameDiv.appendChild(document.createTextNode(' '));
            nameDiv.appendChild(badge);
        } else if (r.responder.leadershipRole === 'platoonLeader') {
            const badge = document.createElement('span');
            badge.className = 'leader-badge-small';
            badge.textContent = '⭐⭐ Zugführer';
            nameDiv.appendChild(document.createTextNode(' '));
            nameDiv.appendChild(badge);
        }
        item.appendChild(nameDiv);

        if (showQuals) {
            const quals = [];
            if (r.responder.qualifications.machinist) quals.push('Maschinist');
            if (r.responder.qualifications.agt) quals.push('AGT');
            if (r.responder.qualifications.paramedic) quals.push('Sanitäter');
            if (quals.length > 0) {
                const qualsDiv = document.createElement('div');
                qualsDiv.className = 'responder-quals';
                quals.forEach(q => {
                    const span = document.createElement('span');
                    span.className = 'qual-badge-small';
                    span.textContent = q;
                    qualsDiv.appendChild(span);
                });
                item.appendChild(qualsDiv);
            }
        }

        const timeDiv = document.createElement('div');
        timeDiv.className = 'responder-time';
        timeDiv.textContent = (r.participating ? 'Rückmeldung: ' : 'Abgesagt: ') + respondedTime;
        item.appendChild(timeDiv);

        return item;
    }

    // Participants section
    const participantsSection = document.createElement('div');
    participantsSection.className = 'emergency-details-section';
    const participantsH4 = document.createElement('h4');
    participantsH4.textContent = `Teilnehmende Einsatzkräfte (${summary.participants})`;
    participantsSection.appendChild(participantsH4);
    const participantsList = document.createElement('div');
    participantsList.className = 'responders-list';
    const participants = responses.filter(r => r.participating);
    if (participants.length === 0) {
        const p = document.createElement('p');
        p.style.color = '#999';
        p.textContent = 'Keine Teilnehmer';
        participantsList.appendChild(p);
    } else {
        participants.forEach(r => participantsList.appendChild(makeResponderItem(r, true)));
    }
    participantsSection.appendChild(participantsList);
    detailsDiv.appendChild(participantsSection);

    // Non-participants section
    if (summary.nonParticipants > 0) {
        const nonParticipantsSection = document.createElement('div');
        nonParticipantsSection.className = 'emergency-details-section';
        const nonParticipantsH4 = document.createElement('h4');
        nonParticipantsH4.textContent = `Abgesagte Einsatzkräfte (${summary.nonParticipants})`;
        nonParticipantsSection.appendChild(nonParticipantsH4);
        const nonParticipantsList = document.createElement('div');
        nonParticipantsList.className = 'responders-list';
        const nonParticipants = responses.filter(r => !r.participating);
        if (nonParticipants.length === 0) {
            const p = document.createElement('p');
            p.style.color = '#999';
            p.textContent = 'Keine Absagen';
            nonParticipantsList.appendChild(p);
        } else {
            nonParticipants.forEach(r => nonParticipantsList.appendChild(makeResponderItem(r, false)));
        }
        nonParticipantsSection.appendChild(nonParticipantsList);
        detailsDiv.appendChild(nonParticipantsSection);
    }

    container.appendChild(detailsDiv);
}

function closeDetailsModal() {
    document.getElementById('details-modal').style.display = 'none';
    currentEmergencyId = null;
    currentEmergencyActive = false;
    document.getElementById('end-emergency-btn').style.display = 'none';
}

async function endEmergency(emergencyId) {
    if (!confirm('Einsatz wirklich beenden?')) return;
    
    try {
        const response = await apiRequest(`${API_BASE}/admin/emergencies/${emergencyId}`, {
            method: 'PATCH',
            body: JSON.stringify({ active: false }),
        });
        
        if (response && response.ok) {
            showToast('Einsatz erfolgreich beendet', 'success');
            document.getElementById('end-emergency-btn').style.display = 'none';
            currentEmergencyActive = false;
            // Reload list
            loadEmergencies();
        } else {
            showToast('Fehler beim Beenden des Einsatzes', 'error');
        }
    } catch (error) {
        showToast('Fehler beim Beenden des Einsatzes', 'error');
    }
}

function subscribeToEvents() {
    const evtSource = new EventSource(`${API_BASE}/admin/events`, { withCredentials: true });
    evtSource.addEventListener('response', () => {
        loadEmergencies();
    });
    evtSource.onerror = (e) => {
        console.warn('SSE connection error; reconnecting in 5 s', e);
        evtSource.close();
        setTimeout(subscribeToEvents, 5000);
    };
}
