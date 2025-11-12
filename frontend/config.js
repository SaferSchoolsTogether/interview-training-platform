/**
 * API Configuration
 * Automatically detects the environment and sets the correct API URL
 */

// Detect if we're running on localhost or deployed
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Set API base URL
// When deployed (Railway), use the same domain
// When local, use localhost:3001
const API_BASE_URL = isLocalhost
  ? 'http://localhost:3001'
  : window.location.origin; // Uses the current domain (e.g., https://your-app.railway.app)

// Export for use in other scripts
window.API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    START_SESSION: `${API_BASE_URL}/api/start-session`,
    SEND_MESSAGE: `${API_BASE_URL}/api/send-message`,
    ADMIN_LOGIN: `${API_BASE_URL}/api/admin/login`,
    ADMIN_SESSIONS: `${API_BASE_URL}/api/admin/sessions`,
    ADMIN_SESSION: (sessionId) => `${API_BASE_URL}/api/admin/session/${sessionId}`
  }
};

console.log('API Configuration loaded:', window.API_CONFIG.BASE_URL);
