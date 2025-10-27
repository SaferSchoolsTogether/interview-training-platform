// Generate a unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Start an interview with the selected character
async function startInterview(characterName, characterRole) {
    try {
        // Generate a unique session ID
        const sessionId = generateSessionId();

        // Store character information in sessionStorage
        sessionStorage.setItem('characterName', characterName);
        sessionStorage.setItem('characterRole', characterRole);
        sessionStorage.setItem('sessionId', sessionId);

        // Call the backend API to start the session
        const response = await fetch('http://localhost:3001/api/start-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                characterName: characterName,
                characterRole: characterRole,
                sessionId: sessionId
            })
        });

        const data = await response.json();

        if (data.success) {
            console.log('Session started successfully:', data);

            // Store the character's greeting if available
            if (data.greeting) {
                sessionStorage.setItem('characterGreeting', data.greeting);
            }

            // Redirect to chat page
            window.location.href = 'chat.html';
        } else {
            console.error('Failed to start session:', data);
            alert('Failed to start the interview session. Please try again.');
        }

    } catch (error) {
        console.error('Error starting interview:', error);
        alert('Error connecting to server. Please make sure the backend is running.');
    }
}

// Check if a session already exists when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const existingSession = sessionStorage.getItem('sessionId');

    if (existingSession && window.location.pathname.includes('index.html')) {
        // Optional: Show a warning that a session already exists
        console.log('Existing session found:', existingSession);
    }
});
