// Global variables
let isLoggedIn = false;
let autoRefreshInterval = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Logout button
    document.getElementById('logoutButton').addEventListener('click', handleLogout);

    // Refresh button
    document.getElementById('refreshButton').addEventListener('click', fetchSessions);

    // Close modal
    document.getElementById('closeModal').addEventListener('click', closeModal);

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('conversationModal');
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    try {
        const response = await fetch('http://localhost:3001/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (data.success) {
            isLoggedIn = true;
            showDashboard();
            fetchSessions();
            startAutoRefresh();
        } else {
            errorDiv.textContent = 'Incorrect password';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'Connection error. Please make sure the server is running.';
        errorDiv.style.display = 'block';
    }
}

// Handle logout
function handleLogout() {
    isLoggedIn = false;
    stopAutoRefresh();
    showLogin();
    document.getElementById('password').value = '';
    document.getElementById('loginError').style.display = 'none';
}

// Show dashboard
function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboardScreen').style.display = 'block';
}

// Show login
function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboardScreen').style.display = 'none';
}

// Fetch all sessions
async function fetchSessions() {
    if (!isLoggedIn) return;

    try {
        const response = await fetch('http://localhost:3001/api/admin/sessions');
        const data = await response.json();

        if (data.success) {
            displaySessions(data.sessions);
            updateStats(data.totalSessions);
        }
    } catch (error) {
        console.error('Error fetching sessions:', error);
    }
}

// Display sessions in grid
function displaySessions(sessions) {
    const grid = document.getElementById('sessionsGrid');
    const emptyState = document.getElementById('emptyState');

    if (sessions.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    grid.innerHTML = '';

    sessions.forEach(session => {
        const card = createSessionCard(session);
        grid.appendChild(card);
    });
}

// Create session card
function createSessionCard(session) {
    const card = document.createElement('div');
    card.className = 'session-card';

    const rapportClass = getRapportClass(session.rapportLevel);
    const formattedStartTime = formatDateTime(session.startTime);
    const formattedLastActivity = formatDateTime(session.lastActivity);

    card.innerHTML = `
        <div class="session-card-header">
            <h3>${session.characterName}</h3>
            <span class="rapport-badge ${rapportClass}">${session.rapportLevel.toUpperCase()}</span>
        </div>
        <div class="session-card-body">
            <div class="session-info">
                <span class="info-label">Role:</span>
                <span class="info-value">${session.characterRole}</span>
            </div>
            <div class="session-info">
                <span class="info-label">Messages:</span>
                <span class="info-value">${session.messageCount}</span>
            </div>
            <div class="session-info">
                <span class="info-label">Started:</span>
                <span class="info-value">${formattedStartTime}</span>
            </div>
            <div class="session-info">
                <span class="info-label">Last Activity:</span>
                <span class="info-value">${formattedLastActivity}</span>
            </div>
            <div class="session-info">
                <span class="info-label">Session ID:</span>
                <span class="info-value session-id">${session.sessionId}</span>
            </div>
        </div>
        <div class="session-card-footer">
            <button class="view-conversation-button" onclick="viewConversation('${session.sessionId}')">
                View Conversation
            </button>
        </div>
    `;

    return card;
}

// Get rapport CSS class
function getRapportClass(rapportLevel) {
    switch (rapportLevel) {
        case 'low':
            return 'rapport-low';
        case 'medium':
            return 'rapport-medium';
        case 'high':
            return 'rapport-high';
        default:
            return '';
    }
}

// Format date and time
function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// View conversation details
async function viewConversation(sessionId) {
    try {
        const response = await fetch(`http://localhost:3001/api/admin/session/${sessionId}`);
        const data = await response.json();

        if (data.success) {
            displayConversationModal(data.session);
        }
    } catch (error) {
        console.error('Error fetching conversation:', error);
        alert('Failed to load conversation details.');
    }
}

// Display conversation modal
function displayConversationModal(session) {
    // Set header info
    document.getElementById('modalCharacterName').textContent = session.characterName;
    document.getElementById('modalSessionId').textContent = `Session: ${session.sessionId}`;

    // Set details
    document.getElementById('modalCharacterRole').textContent = session.characterRole;
    document.getElementById('modalMessageCount').textContent = session.messageCount;

    const rapportBadge = document.getElementById('modalRapportLevel');
    rapportBadge.textContent = session.rapportLevel.toUpperCase();
    rapportBadge.className = `rapport-badge ${getRapportClass(session.rapportLevel)}`;

    document.getElementById('modalStartTime').textContent = formatDateTime(session.startTime);

    // Display conversation transcript
    const transcript = document.getElementById('conversationTranscript');
    transcript.innerHTML = '';

    if (session.messages.length === 0) {
        transcript.innerHTML = '<p class="no-messages">No messages yet</p>';
    } else {
        session.messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `transcript-message ${msg.speaker === 'User' ? 'user-message' : 'character-message'}`;

            messageDiv.innerHTML = `
                <div class="message-header">
                    <strong>${msg.speaker}</strong>
                    <span class="message-time">${formatDateTime(msg.timestamp)}</span>
                </div>
                <div class="message-content">${escapeHtml(msg.content)}</div>
            `;

            transcript.appendChild(messageDiv);
        });
    }

    // Show modal
    document.getElementById('conversationModal').style.display = 'flex';
}

// Close modal
function closeModal() {
    document.getElementById('conversationModal').style.display = 'none';
}

// Update stats
function updateStats(totalSessions) {
    document.getElementById('totalSessions').textContent = totalSessions;
    document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
}

// Start auto-refresh
function startAutoRefresh() {
    // Refresh every 5 seconds
    autoRefreshInterval = setInterval(() => {
        fetchSessions();
    }, 5000);
}

// Stop auto-refresh
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
