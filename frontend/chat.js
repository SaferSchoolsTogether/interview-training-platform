// Global variables
let conversationHistory = [];
let sessionId = '';
let characterName = '';
let characterRole = '';
let isWaitingForResponse = false;

// Initialize chat when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeChat();
    setupEventListeners();
});

// Initialize the chat interface
async function initializeChat() {
    // Get character info from sessionStorage
    characterName = sessionStorage.getItem('characterName');
    characterRole = sessionStorage.getItem('characterRole');
    sessionId = sessionStorage.getItem('sessionId');

    // If no character selected, redirect to index
    if (!characterName || !sessionId) {
        alert('No character selected. Redirecting to character selection...');
        window.location.href = 'index.html';
        return;
    }

    // Display character info in header
    document.getElementById('characterName').textContent = characterName;
    document.getElementById('characterRole').textContent = characterRole;

    // Load saved conversation from sessionStorage (if page was refreshed)
    loadConversationFromStorage();

    // If no saved messages, show the greeting
    if (conversationHistory.length === 0) {
        // Check if greeting is stored in sessionStorage
        const storedGreeting = sessionStorage.getItem('characterGreeting');
        if (storedGreeting) {
            // Display the character's greeting message
            addCharacterMessage(storedGreeting);
        } else {
            // Fallback system message if no greeting available
            addSystemMessage(`Interview session started with ${characterName}. You may begin asking questions.`);
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    const sendButton = document.getElementById('sendButton');
    const userInput = document.getElementById('userInput');
    const resetButton = document.getElementById('resetButton');
    const charCounter = document.getElementById('charCounter');

    // Send button click
    sendButton.addEventListener('click', sendMessage);

    // Enter key to send (Shift+Enter for new line)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Character counter
    userInput.addEventListener('input', () => {
        const length = userInput.value.length;
        charCounter.textContent = `${length} / 500`;

        if (length > 450) {
            charCounter.classList.add('warning');
        } else {
            charCounter.classList.remove('warning');
        }
    });

    // Reset button
    resetButton.addEventListener('click', resetInterview);
}

// Send a message
async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();

    // Validate message
    if (!message) {
        return;
    }

    if (isWaitingForResponse) {
        alert('Please wait for the current response to complete.');
        return;
    }

    // Clear input
    userInput.value = '';
    document.getElementById('charCounter').textContent = '0 / 500';

    // Display user message
    addUserMessage(message);

    // Add to conversation history
    conversationHistory.push({
        role: 'user',
        content: message
    });

    // Save to sessionStorage
    saveConversationToStorage();

    // Show typing indicator
    showTypingIndicator();
    isWaitingForResponse = true;

    try {
        // Send to backend
        const response = await fetch(window.API_CONFIG.ENDPOINTS.SEND_MESSAGE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: sessionId,
                characterName: characterName,
                message: message,
                conversationHistory: conversationHistory
            })
        });

        const data = await response.json();

        // Remove typing indicator
        removeTypingIndicator();

        if (data.success) {
            // Display character response
            addCharacterMessage(data.response);

            // Add to conversation history
            conversationHistory.push({
                role: 'character',
                content: data.response
            });

            // Save to sessionStorage
            saveConversationToStorage();
        } else {
            addSystemMessage('Error: Failed to get response from character.');
        }

    } catch (error) {
        console.error('Error sending message:', error);
        removeTypingIndicator();
        addSystemMessage('Error: Could not connect to server. Please make sure the backend is running.');
    }

    isWaitingForResponse = false;
}

// Add user message to chat
function addUserMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';

    messageDiv.innerHTML = `
        <div class="message-bubble">
            <div class="message-sender">You</div>
            <div class="message-text">${escapeHtml(message)}</div>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Add character message to chat
function addCharacterMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message character';

    // Get character image filename from character name
    const imageFilename = characterName.toLowerCase().replace(/ /g, '-') + '.jpg';

    messageDiv.innerHTML = `
        <img src="images/${imageFilename}" alt="${characterName}" class="message-avatar">
        <div class="message-bubble">
            <div class="message-sender">${characterName}</div>
            <div class="message-text">${formatMessage(message)}</div>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Add system message to chat
function addSystemMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system';

    messageDiv.innerHTML = `
        <div class="message-bubble">
            <div class="message-text">${escapeHtml(message)}</div>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Show typing indicator
function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message character';
    typingDiv.id = 'typingIndicator';

    // Get character image filename from character name
    const imageFilename = characterName.toLowerCase().replace(/ /g, '-') + '.jpg';

    typingDiv.innerHTML = `
        <img src="images/${imageFilename}" alt="${characterName}" class="message-avatar">
        <div class="message-bubble">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;

    messagesContainer.appendChild(typingDiv);
    scrollToBottom();
}

// Remove typing indicator
function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Scroll to bottom of chat
function scrollToBottom() {
    const chatMain = document.querySelector('.chat-main');
    chatMain.scrollTop = chatMain.scrollHeight;
}

// Reset interview
function resetInterview() {
    const confirmed = confirm('Are you sure you want to reset the interview? This will clear the conversation and return to character selection.');

    if (confirmed) {
        // Clear sessionStorage
        sessionStorage.clear();

        // Redirect to index
        window.location.href = 'index.html';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format message text: convert *text* to italics for character actions
function formatMessage(text) {
    // First escape HTML to prevent XSS
    let formatted = escapeHtml(text);

    // Convert text between asterisks to italic tags
    // Match *text* patterns and replace with <em>text</em>
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    return formatted;
}

// ========================================================================
// SESSION STORAGE PERSISTENCE
// ========================================================================

// Save conversation to sessionStorage
// This allows messages to persist across page refreshes
function saveConversationToStorage() {
    if (!sessionId) return;

    // Use sessionId as key to prevent conflicts between different sessions
    const storageKey = `chat_${sessionId}`;

    try {
        sessionStorage.setItem(storageKey, JSON.stringify(conversationHistory));
    } catch (error) {
        console.error('Error saving conversation to sessionStorage:', error);
        // sessionStorage might be full or disabled
    }
}

// Load conversation from sessionStorage
// Called on page load to restore previous messages after refresh
function loadConversationFromStorage() {
    if (!sessionId) return;

    const storageKey = `chat_${sessionId}`;

    try {
        const savedData = sessionStorage.getItem(storageKey);

        if (savedData) {
            conversationHistory = JSON.parse(savedData);

            // Restore the UI by displaying all saved messages
            conversationHistory.forEach((msg) => {
                if (msg.role === 'user') {
                    addUserMessage(msg.content);
                } else if (msg.role === 'character') {
                    addCharacterMessage(msg.content);
                }
            });

            console.log(`Restored ${conversationHistory.length} messages from sessionStorage`);
        }
    } catch (error) {
        console.error('Error loading conversation from sessionStorage:', error);
        // If there's an error, just start fresh
        conversationHistory = [];
    }
}
