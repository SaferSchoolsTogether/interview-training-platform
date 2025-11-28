/**
 * Admin Dashboard JavaScript
 * Includes comprehensive rapport tracking visualization
 * Based on Motivational Interviewing (MI) principles
 */

// Global variables
let isLoggedIn = false;
let autoRefreshInterval = null;
let currentSessionId = null; // Track the currently viewed session for delete operations

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

    // Download report button
    document.getElementById('downloadReportButton').addEventListener('click', downloadReport);

    // Clear all sessions button
    document.getElementById('clearAllButton').addEventListener('click', handleClearAllSessions);

    // Delete session button (in modal)
    document.getElementById('deleteSessionButton').addEventListener('click', handleDeleteSession);

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

// ==============================================================================
// AUTHENTICATION
// ==============================================================================

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    try {
        const response = await fetch(window.API_CONFIG.ENDPOINTS.ADMIN_LOGIN, {
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
            // Auto-refresh disabled - use manual refresh button instead
            // startAutoRefresh();
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
    // Auto-refresh disabled - no need to stop it
    // stopAutoRefresh();
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

// ==============================================================================
// SESSION MANAGEMENT
// ==============================================================================

// Fetch all sessions
async function fetchSessions() {
    if (!isLoggedIn) return;

    try {
        const response = await fetch(window.API_CONFIG.ENDPOINTS.ADMIN_SESSIONS);
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

// Create session card with rapport color coding
function createSessionCard(session) {
    const card = document.createElement('div');
    card.className = 'session-card';

    // Add rapport-based color coding to the entire card
    const rapportClass = getRapportClass(session.rapportLevel);
    card.classList.add(rapportClass);

    const formattedStartTime = formatDateTime(session.startTime);
    const timeAgo = getTimeAgo(session.lastActivity); // Show "X minutes ago" format
    const sessionDuration = getSessionDuration(session.startTime, session.lastActivity);

    // Display both rapport score and level
    const rapportScore = session.rapportScore || 0;

    card.innerHTML = `
        <div class="session-card-header">
            <h3>${session.characterName}</h3>
            <div class="rapport-score-badge ${session.rapportLevel}">
                ${rapportScore} / 100
            </div>
        </div>
        <div class="session-card-body">
            <div class="session-info">
                <span class="info-label">Role:</span>
                <span class="info-value">${session.characterRole}</span>
            </div>
            <div class="session-info">
                <span class="info-label">Rapport Level:</span>
                <span class="info-value">${session.rapportLevel.toUpperCase()}</span>
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
                <span class="info-label">Last Active:</span>
                <span class="info-value">${timeAgo}</span>
            </div>
            <div class="session-info">
                <span class="info-label">Duration:</span>
                <span class="info-value">${sessionDuration}</span>
            </div>
            <div class="session-info">
                <span class="info-label">Session ID:</span>
                <span class="info-value session-id">${session.sessionId}</span>
            </div>
        </div>
        <div class="session-card-footer">
            <button class="view-conversation-button" onclick="viewConversation('${session.sessionId}')">
                View Full Details
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

// ==============================================================================
// CONVERSATION MODAL WITH RAPPORT VISUALIZATION
// ==============================================================================

// View conversation details
async function viewConversation(sessionId) {
    try {
        const response = await fetch(window.API_CONFIG.ENDPOINTS.ADMIN_SESSION(sessionId));
        const data = await response.json();

        if (data.success) {
            displayConversationModal(data.session);
        }
    } catch (error) {
        console.error('Error fetching conversation:', error);
        alert('Failed to load conversation details.');
    }
}

// Display conversation modal with comprehensive rapport visualization
function displayConversationModal(session) {
    // Store current session ID for delete operations
    currentSessionId = session.sessionId;

    // ========================================================================
    // 1. Set Header Info
    // ========================================================================
    document.getElementById('modalCharacterName').textContent = session.characterName;
    document.getElementById('modalSessionId').textContent = `Session: ${session.sessionId}`;

    // ========================================================================
    // 2. Display Large Rapport Indicator
    // ========================================================================
    const currentScore = session.rapportScore || 0;
    const currentLevel = session.rapportLevel || 'low';

    // Update rapport level text
    const rapportLevelText = document.getElementById('largeRapportLevel');
    rapportLevelText.textContent = `${currentLevel.toUpperCase()} RAPPORT`;
    rapportLevelText.style.color = getRapportColor(currentLevel);

    // Update rapport score display
    const rapportScoreDisplay = document.getElementById('largeRapportScore');
    rapportScoreDisplay.textContent = currentScore;
    rapportScoreDisplay.className = `rapport-score-display ${currentLevel}`;

    // Update progress bar
    const progressFill = document.getElementById('rapportProgressFill');
    progressFill.style.width = `${currentScore}%`;
    progressFill.textContent = `${currentScore}%`;
    progressFill.className = `rapport-progress-fill ${currentLevel}`;

    // Update description
    const descriptions = {
        low: 'Character is guarded, defensive, and reluctant to share. Trust has not been established. (0-40 points)',
        medium: 'Character is beginning to open up and share surface-level concerns. Some trust is developing. (41-75 points)',
        high: 'Character fully trusts the interviewer and will share critical information. (76-100 points)'
    };
    document.getElementById('rapportDescription').textContent = descriptions[currentLevel] || '';

    // ========================================================================
    // 3. Draw Rapport History Graph
    // ========================================================================
    drawRapportGraph(session.rapportHistory || []);

    // ========================================================================
    // 4. Set Session Details
    // ========================================================================
    document.getElementById('modalCharacterRole').textContent = session.characterRole;
    document.getElementById('modalMessageCount').textContent = session.messageCount;
    document.getElementById('modalStartTime').textContent = formatDateTime(session.startTime);

    // ========================================================================
    // 5. Display Conversation Transcript with Rapport Changes
    // ========================================================================
    displayTranscriptWithRapport(session.messages || []);

    // Show modal
    document.getElementById('conversationModal').style.display = 'flex';
}

// Draw rapport history graph
function drawRapportGraph(rapportHistory) {
    const svg = document.getElementById('rapportGraphSVG');
    const graphContainer = document.getElementById('rapportGraph');

    // Clear existing content
    svg.innerHTML = '';

    if (!rapportHistory || rapportHistory.length === 0) {
        svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#9ca3af">No rapport history available</text>';
        return;
    }

    const width = graphContainer.clientWidth - 32; // Account for padding
    const height = graphContainer.clientHeight - 32;

    // Calculate positions
    const pointSpacing = width / Math.max(rapportHistory.length - 1, 1);

    // Draw zone backgrounds
    const zoneHeight = height;

    // Low zone (0-33%)
    const lowZone = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    lowZone.setAttribute('x', '16');
    lowZone.setAttribute('y', height - (height * 0.33) + 16);
    lowZone.setAttribute('width', width);
    lowZone.setAttribute('height', height * 0.33);
    lowZone.setAttribute('fill', '#fee2e2');
    lowZone.setAttribute('opacity', '0.3');
    svg.appendChild(lowZone);

    // Medium zone (34-66%)
    const medZone = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    medZone.setAttribute('x', '16');
    medZone.setAttribute('y', height - (height * 0.66) + 16);
    medZone.setAttribute('width', width);
    medZone.setAttribute('height', height * 0.33);
    medZone.setAttribute('fill', '#fef3c7');
    medZone.setAttribute('opacity', '0.3');
    svg.appendChild(medZone);

    // High zone (67-100%)
    const highZone = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    highZone.setAttribute('x', '16');
    highZone.setAttribute('y', '16');
    highZone.setAttribute('width', width);
    highZone.setAttribute('height', height * 0.34);
    highZone.setAttribute('fill', '#d1fae5');
    highZone.setAttribute('opacity', '0.3');
    svg.appendChild(highZone);

    // Draw connecting line
    if (rapportHistory.length > 1) {
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        let points = '';

        rapportHistory.forEach((entry, index) => {
            const x = 16 + (index * pointSpacing);
            const y = 16 + height - (entry.score / 100 * height);
            points += `${x},${y} `;
        });

        polyline.setAttribute('points', points.trim());
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', '#6b7280');
        polyline.setAttribute('stroke-width', '2');
        svg.appendChild(polyline);
    }

    // Draw points
    rapportHistory.forEach((entry, index) => {
        const x = 16 + (index * pointSpacing);
        const y = 16 + height - (entry.score / 100 * height);

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '5');
        circle.setAttribute('fill', getRapportColor(entry.level));
        circle.setAttribute('stroke', 'white');
        circle.setAttribute('stroke-width', '2');

        // Add hover title
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `Score: ${entry.score} (${entry.level})${entry.reasoning ? '\n' + entry.reasoning : ''}`;
        circle.appendChild(title);

        svg.appendChild(circle);
    });
}

// Display transcript with rapport change indicators
function displayTranscriptWithRapport(messages) {
    const transcript = document.getElementById('conversationTranscript');
    transcript.innerHTML = '';

    if (messages.length === 0) {
        transcript.innerHTML = '<p class="no-messages">No messages yet</p>';
        return;
    }

    messages.forEach((msg, index) => {
        const messageDiv = document.createElement('div');
        const isUser = msg.speaker === 'User';

        // Check if this is a significant rapport change (±8 or more)
        const isSignificant = msg.rapportChange && Math.abs(msg.rapportChange) >= 8;

        messageDiv.className = `transcript-message ${isUser ? 'user-message' : 'character-message'}`;
        if (isUser && isSignificant) {
            messageDiv.classList.add('significant-change');
        }

        let messageHTML = `
            <div class="message-header">
                <strong>${msg.speaker}</strong>
                <span class="message-time">${formatDateTime(msg.timestamp)}</span>
            </div>
            <div class="message-content">${escapeHtml(msg.content)}</div>
        `;

        // Add rapport change indicator for user messages
        if (isUser && msg.rapportChange !== undefined) {
            const changeClass = msg.rapportChange > 0 ? 'positive' : (msg.rapportChange < 0 ? 'negative' : 'neutral');
            const changeSymbol = msg.rapportChange > 0 ? '+' : '';

            messageHTML += `
                <div class="message-rapport-change">
                    <div>
                        <span class="rapport-change-value ${changeClass}">
                            ${changeSymbol}${msg.rapportChange} points
                        </span>
                        <span style="color: #9ca3af;">→ Score: ${msg.rapportScoreAfter} (${msg.rapportLevelAfter})</span>
                    </div>
                    ${msg.rapportReasoning ? `
                        <div class="rapport-change-reason">${escapeHtml(msg.rapportReasoning)}</div>
                    ` : ''}
                    ${msg.rapportChanges && msg.rapportChanges.length > 0 ? `
                        <div class="rapport-change-techniques">
                            ${msg.rapportChanges.map(change => {
                                const techniqueClass = change.type === 'positive' ? 'positive' :
                                                      change.type === 'negative' ? 'negative' : 'system';
                                return `<span class="technique-tag ${techniqueClass}">${change.technique}: ${change.points > 0 ? '+' : ''}${change.points}</span>`;
                            }).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }

        messageDiv.innerHTML = messageHTML;
        transcript.appendChild(messageDiv);
    });

    // Scroll to top of transcript
    transcript.scrollTop = 0;
}

// Get rapport color
function getRapportColor(level) {
    switch (level) {
        case 'low': return '#dc2626';
        case 'medium': return '#f59e0b';
        case 'high': return '#10b981';
        default: return '#6b7280';
    }
}

// Close modal
function closeModal() {
    document.getElementById('conversationModal').style.display = 'none';
}

// ==============================================================================
// UTILITY FUNCTIONS
// ==============================================================================

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

// ==============================================================================
// SESSION MANAGEMENT - DELETE OPERATIONS
// ==============================================================================

// Handle clear all sessions
async function handleClearAllSessions() {
    const confirmed = confirm('⚠️ WARNING: This will delete ALL active sessions.\n\nAre you absolutely sure you want to continue?');

    if (!confirmed) return;

    try {
        const response = await fetch(window.API_CONFIG.ENDPOINTS.ADMIN_SESSIONS, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (data.success) {
            alert(`✓ Successfully deleted ${data.deletedCount} session(s)`);
            fetchSessions(); // Refresh the session list
        } else {
            alert('✗ Failed to clear sessions: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error clearing sessions:', error);
        alert('✗ Error: Could not connect to server');
    }
}

// Handle delete single session
async function handleDeleteSession() {
    if (!currentSessionId) {
        alert('✗ Error: No session selected');
        return;
    }

    const confirmed = confirm('Are you sure you want to delete this session?\n\nThis action cannot be undone.');

    if (!confirmed) return;

    try {
        const response = await fetch(window.API_CONFIG.ENDPOINTS.ADMIN_SESSION(currentSessionId), {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (data.success) {
            alert(`✓ Session deleted successfully`);
            closeModal(); // Close the modal
            fetchSessions(); // Refresh the session list
            currentSessionId = null; // Clear the current session ID
        } else {
            alert('✗ Failed to delete session: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting session:', error);
        alert('✗ Error: Could not connect to server');
    }
}

// ==============================================================================
// TIME FORMATTING HELPERS
// ==============================================================================

// Get time ago string (e.g., "5 minutes ago", "2 hours ago")
function getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) {
        return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
}

// Get session duration (e.g., "5m 23s", "1h 15m")
function getSessionDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffInSeconds = Math.floor((end - start) / 1000);

    if (diffInSeconds < 60) {
        return `${diffInSeconds}s`;
    }

    const minutes = Math.floor(diffInSeconds / 60);
    const seconds = diffInSeconds % 60;

    if (minutes < 60) {
        return `${minutes}m ${seconds}s`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
}

// ==============================================================================
// REPORT DOWNLOAD
// ==============================================================================

// Download session report
async function downloadReport() {
    if (!isLoggedIn) return;

    try {
        const response = await fetch(window.API_CONFIG.ENDPOINTS.ADMIN_REPORT);
        const data = await response.json();

        if (data.success) {
            // Format the report as a readable text file
            const reportText = formatReportAsText(data);

            // Create blob and download
            const blob = new Blob([reportText], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            a.download = `interview-sessions-report-${timestamp}.txt`;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            console.log('Report downloaded successfully');
        }
    } catch (error) {
        console.error('Error downloading report:', error);
        alert('Failed to download report. Please try again.');
    }
}

// Format report data as readable text
function formatReportAsText(data) {
    const lines = [];

    // Header
    lines.push('================================================================================');
    lines.push('               INTERVIEW TRAINING PLATFORM - SESSION REPORT');
    lines.push('================================================================================');
    lines.push('');
    lines.push(`Report Generated: ${new Date(data.generatedAt).toLocaleString()}`);
    lines.push(`Total Sessions: ${data.totalSessions}`);
    lines.push('');
    lines.push('================================================================================');
    lines.push('');

    // If no sessions
    if (data.sessions.length === 0) {
        lines.push('No active sessions found.');
        return lines.join('\n');
    }

    // Each session
    data.sessions.forEach((session, index) => {
        lines.push(`SESSION ${index + 1} OF ${data.totalSessions}`);
        lines.push('================================================================================');
        lines.push('');

        // Session Info
        lines.push('SESSION INFORMATION:');
        lines.push(`  Session ID: ${session.sessionId}`);
        lines.push(`  Character: ${session.character.name}`);
        lines.push(`  Role: ${session.character.role}`);
        lines.push('');

        // Timing
        lines.push('TIMING:');
        lines.push(`  Started: ${new Date(session.timing.startTime).toLocaleString()}`);
        lines.push(`  Last Active: ${new Date(session.timing.lastActivity).toLocaleString()}`);
        lines.push(`  Duration: ${session.timing.duration}`);
        lines.push('');

        // Rapport Summary
        lines.push('RAPPORT SUMMARY:');
        lines.push(`  Final Score: ${session.rapport.finalScore} / 100`);
        lines.push(`  Final Level: ${session.rapport.finalLevel.toUpperCase()}`);
        lines.push(`  Total Messages: ${session.messageCount}`);
        lines.push('');

        // Rapport History
        if (session.rapport.history && session.rapport.history.length > 0) {
            lines.push('RAPPORT PROGRESSION:');
            session.rapport.history.forEach((entry, idx) => {
                const timestamp = new Date(entry.timestamp).toLocaleTimeString();
                const change = entry.scoreChange !== undefined ? ` (${entry.scoreChange >= 0 ? '+' : ''}${entry.scoreChange})` : '';
                lines.push(`  [${timestamp}] Score: ${entry.score}${change} - ${entry.level.toUpperCase()}`);
                if (entry.reasoning) {
                    lines.push(`    Reason: ${entry.reasoning}`);
                }
            });
            lines.push('');
        }

        // Conversation Transcript
        lines.push('CONVERSATION TRANSCRIPT:');
        lines.push('--------------------------------------------------------------------------------');

        if (session.messages && session.messages.length > 0) {
            session.messages.forEach((msg, msgIdx) => {
                const timestamp = new Date(msg.timestamp).toLocaleTimeString();
                lines.push('');
                lines.push(`[${timestamp}] ${msg.speaker}:`);
                lines.push(`  ${msg.content}`);

                // Show rapport change for user messages
                if (msg.speaker === 'User' && msg.rapportChange !== undefined) {
                    const changeSymbol = msg.rapportChange > 0 ? '+' : '';
                    lines.push(`  → Rapport Change: ${changeSymbol}${msg.rapportChange} (Score: ${msg.rapportScoreAfter}, Level: ${msg.rapportLevelAfter})`);

                    if (msg.rapportReasoning) {
                        lines.push(`  → Analysis: ${msg.rapportReasoning}`);
                    }
                }
            });
        } else {
            lines.push('  No messages in this session.');
        }

        lines.push('');
        lines.push('================================================================================');
        lines.push('');
        lines.push('');
    });

    // Footer
    lines.push('');
    lines.push('END OF REPORT');
    lines.push('================================================================================');

    return lines.join('\n');
}
