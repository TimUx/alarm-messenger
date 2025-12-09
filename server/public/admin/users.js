const API_BASE = window.location.origin + '/api';
let currentUser = null;
let allUsers = [];
let isEditMode = false;

// Check authentication on page load
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');
    
    if (!token || !username) {
        window.location.href = 'login.html';
        return;
    }
    
    // Load current user profile
    loadCurrentUser();
    
    // Setup event listeners
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('add-user-btn').addEventListener('click', showAddUserModal);
    document.getElementById('close-modal-btn').addEventListener('click', closeUserModal);
    document.getElementById('cancel-modal-btn').addEventListener('click', closeUserModal);
    document.getElementById('close-password-modal-btn').addEventListener('click', closePasswordModal);
    document.getElementById('cancel-password-modal-btn').addEventListener('click', closePasswordModal);
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordSubmit);
    
    // Load users
    loadUsers();
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

async function loadCurrentUser() {
    try {
        const response = await apiRequest(`${API_BASE}/admin/profile`);
        
        if (!response.ok) {
            throw new Error('Fehler beim Laden des Benutzerprofils');
        }
        
        currentUser = await response.json();
        
        // Display username and role
        const roleText = currentUser.role === 'admin' ? 'Administrator' : 'Operator';
        const displayName = currentUser.fullName || currentUser.username;
        document.getElementById('username-display').textContent = `${displayName} (${roleText})`;
        
        // Hide add button for operators
        if (currentUser.role !== 'admin') {
            document.getElementById('add-user-btn').style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

async function loadUsers() {
    try {
        const response = await apiRequest(`${API_BASE}/admin/users`);
        
        if (!response.ok) {
            if (response.status === 403) {
                document.getElementById('users-list').innerHTML = '<p class="error">Sie haben keine Berechtigung, Benutzer anzuzeigen.</p>';
                return;
            }
            throw new Error('Fehler beim Laden der Benutzer');
        }
        
        const data = await response.json();
        allUsers = data.users;
        displayUsers(allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('users-list').innerHTML = '<p class="error">Fehler beim Laden der Benutzerdaten.</p>';
    }
}

function displayUsers(users) {
    const container = document.getElementById('users-list');
    
    if (users.length === 0) {
        container.innerHTML = '<p>Keine Benutzer vorhanden.</p>';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'data-table';
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Benutzername</th>
            <th>Vollständiger Name</th>
            <th>Rolle</th>
            <th>Erstellt am</th>
            <th>Aktionen</th>
        </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    users.forEach(user => {
        const row = document.createElement('tr');
        
        const roleText = user.role === 'admin' ? 'Administrator' : 'Operator';
        const roleClass = user.role === 'admin' ? 'role-admin' : 'role-operator';
        const createdDate = new Date(user.createdAt).toLocaleString('de-DE');
        const isCurrentUser = currentUser && user.id === currentUser.id;
        
        row.innerHTML = `
            <td>${escapeHtml(user.username)}</td>
            <td>${user.fullName ? escapeHtml(user.fullName) : '-'}</td>
            <td><span class="badge ${roleClass}">${roleText}</span></td>
            <td>${createdDate}</td>
            <td class="actions">
                <button class="btn-icon" onclick="changePassword('${user.id}', ${isCurrentUser})" title="Passwort ändern">🔑</button>
                ${currentUser && currentUser.role === 'admin' && !isCurrentUser ? `
                    <button class="btn-icon" onclick="editUser('${user.id}')" title="Bearbeiten">✏️</button>
                    <button class="btn-icon" onclick="deleteUser('${user.id}', '${escapeHtml(user.username)}')" title="Löschen">🗑️</button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    container.innerHTML = '';
    container.appendChild(table);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showAddUserModal() {
    isEditMode = false;
    document.getElementById('modal-title').textContent = 'Benutzer hinzufügen';
    document.getElementById('user-id').value = '';
    document.getElementById('user-username').value = '';
    document.getElementById('user-password').value = '';
    document.getElementById('user-fullname').value = '';
    document.getElementById('role-operator').checked = true;
    document.getElementById('password-group').style.display = 'block';
    document.getElementById('user-password').required = true;
    document.getElementById('user-modal').style.display = 'flex';
}

window.editUser = async function(userId) {
    isEditMode = true;
    const user = allUsers.find(u => u.id === userId);
    
    if (!user) {
        alert('Benutzer nicht gefunden');
        return;
    }
    
    document.getElementById('modal-title').textContent = 'Benutzer bearbeiten';
    document.getElementById('user-id').value = user.id;
    document.getElementById('user-username').value = user.username;
    document.getElementById('user-password').value = '';
    document.getElementById('user-fullname').value = user.fullName || '';
    
    if (user.role === 'admin') {
        document.getElementById('role-admin').checked = true;
    } else {
        document.getElementById('role-operator').checked = true;
    }
    
    // Hide password field when editing
    document.getElementById('password-group').style.display = 'none';
    document.getElementById('user-password').required = false;
    
    document.getElementById('user-modal').style.display = 'flex';
};

window.deleteUser = async function(userId, username) {
    if (!confirm(`Möchten Sie den Benutzer "${username}" wirklich löschen?`)) {
        return;
    }
    
    try {
        const response = await apiRequest(`${API_BASE}/admin/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Fehler beim Löschen des Benutzers');
        }
        
        alert('Benutzer erfolgreich gelöscht');
        loadUsers();
    } catch (error) {
        alert('Fehler: ' + error.message);
    }
};

window.changePassword = function(userId, isCurrentUser) {
    document.getElementById('password-user-id').value = userId;
    
    // Show current password field only for current user
    if (isCurrentUser) {
        document.getElementById('current-password-group').style.display = 'block';
        document.getElementById('current-password').required = true;
    } else {
        document.getElementById('current-password-group').style.display = 'none';
        document.getElementById('current-password').required = false;
    }
    
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    document.getElementById('password-modal').style.display = 'flex';
};

function closeUserModal() {
    document.getElementById('user-modal').style.display = 'none';
}

function closePasswordModal() {
    document.getElementById('password-modal').style.display = 'none';
}

async function handleUserSubmit(e) {
    e.preventDefault();
    
    const userId = document.getElementById('user-id').value;
    const username = document.getElementById('user-username').value;
    const password = document.getElementById('user-password').value;
    const fullName = document.getElementById('user-fullname').value;
    const role = document.querySelector('input[name="role"]:checked').value;
    
    try {
        let response;
        
        if (isEditMode) {
            // Update existing user
            response = await apiRequest(`${API_BASE}/admin/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify({ username, fullName, role })
            });
        } else {
            // Create new user
            response = await apiRequest(`${API_BASE}/admin/users`, {
                method: 'POST',
                body: JSON.stringify({ username, password, fullName, role })
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Fehler beim Speichern des Benutzers');
        }
        
        alert(isEditMode ? 'Benutzer erfolgreich aktualisiert' : 'Benutzer erfolgreich erstellt');
        closeUserModal();
        loadUsers();
    } catch (error) {
        alert('Fehler: ' + error.message);
    }
}

async function handlePasswordSubmit(e) {
    e.preventDefault();
    
    const userId = document.getElementById('password-user-id').value;
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
        alert('Die neuen Passwörter stimmen nicht überein');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('Das Passwort muss mindestens 6 Zeichen lang sein');
        return;
    }
    
    try {
        const body = { newPassword };
        if (currentPassword) {
            body.currentPassword = currentPassword;
        }
        
        const response = await apiRequest(`${API_BASE}/admin/users/${userId}/password`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Fehler beim Ändern des Passworts');
        }
        
        alert('Passwort erfolgreich geändert');
        closePasswordModal();
    } catch (error) {
        alert('Fehler: ' + error.message);
    }
}
