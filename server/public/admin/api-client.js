const API_BASE = window.location.origin + '/api';

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'status');
    document.body.appendChild(container);
    return container;
}

function showToast(message, type = 'error') {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function logout() {
    const csrfToken = sessionStorage.getItem('csrfToken');
    sessionStorage.removeItem('csrfToken');
    sessionStorage.removeItem('username');
    fetch(`${API_BASE}/admin/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrfToken || '' }
    }).finally(() => {
        window.location.href = 'login.html';
    });
}

async function apiRequest(url, options = {}) {
    const csrfToken = sessionStorage.getItem('csrfToken');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers
    });

    if (response.status === 401) {
        sessionStorage.removeItem('csrfToken');
        sessionStorage.removeItem('username');
        window.location.href = 'login.html?reason=session_expired';
        return;
    }

    if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        if (data.error === 'Invalid CSRF token') {
            sessionStorage.removeItem('csrfToken');
            sessionStorage.removeItem('username');
            window.location.href = 'login.html?reason=session_expired';
            return;
        }
        // Return response for other 403 cases (e.g. access denied)
        return new Response(JSON.stringify(data), { status: 403, headers: { 'Content-Type': 'application/json' } });
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
        } else {
            // Fallback to username from sessionStorage
            document.getElementById('username-display').textContent = sessionStorage.getItem('username');
        }
    } catch (error) {
        showToast('Fehler beim Laden der Benutzerinformationen', 'error');
        document.getElementById('username-display').textContent = sessionStorage.getItem('username');
    }
}
