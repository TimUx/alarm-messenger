const API_BASE = window.location.origin + '/api';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    
    errorMessage.style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login fehlgeschlagen');
        }
        
        const data = await response.json();
        
        // Store token and user info
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('username', data.user.username);
        
        // Redirect to dashboard
        window.location.href = 'index.html';
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    }
});
