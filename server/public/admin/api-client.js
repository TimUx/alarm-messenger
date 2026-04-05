const API_BASE = window.location.origin + '/api';

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

    if (response.status === 401 || response.status === 403) {
        // Session expired or CSRF token invalid
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
        } else {
            // Fallback to username from sessionStorage
            document.getElementById('username-display').textContent = sessionStorage.getItem('username');
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        document.getElementById('username-display').textContent = sessionStorage.getItem('username');
    }
}
