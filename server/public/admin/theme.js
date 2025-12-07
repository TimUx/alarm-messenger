// Theme management for admin interface
const ThemeManager = {
    THEME_KEY: 'alarm-messenger-theme',
    LIGHT_THEME: 'light',
    DARK_THEME: 'dark',
    
    // Initialize theme on page load
    init() {
        const savedTheme = this.getTheme();
        this.applyTheme(savedTheme);
        this.setupToggle();
    },
    
    // Get current theme (default to light)
    getTheme() {
        return localStorage.getItem(this.THEME_KEY) || this.LIGHT_THEME;
    },
    
    // Set and apply theme
    setTheme(theme) {
        localStorage.setItem(this.THEME_KEY, theme);
        this.applyTheme(theme);
    },
    
    // Apply theme to body
    applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        this.updateToggle(theme);
    },
    
    // Toggle between themes
    toggleTheme() {
        const currentTheme = this.getTheme();
        const newTheme = currentTheme === this.LIGHT_THEME ? this.DARK_THEME : this.LIGHT_THEME;
        this.setTheme(newTheme);
    },
    
    // Setup theme toggle button
    setupToggle() {
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => this.toggleTheme());
            this.updateToggle(this.getTheme());
        }
    },
    
    // Update toggle button appearance
    updateToggle(theme) {
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.textContent = theme === this.LIGHT_THEME ? '🌙' : '☀️';
            toggle.title = theme === this.LIGHT_THEME ? 'Dark Mode aktivieren' : 'Light Mode aktivieren';
        }
    }
};

// Initialize theme when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
    ThemeManager.init();
}
