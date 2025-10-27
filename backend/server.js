require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');
const characters = require('./characters');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// In-memory conversation storage (keyed by sessionId)
const conversationMemory = new Map();

// Enhanced session storage for admin dashboard
const sessions = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Start session endpoint
app.post('/api/start-session', (req, res) => {
  const { characterName, characterRole, sessionId } = req.body;

  const startTime = new Date().toISOString();

  // Initialize conversation memory for this session
  conversationMemory.set(sessionId, {
    characterName: characterName,
    messages: [],
    rapportLevel: 'low', // Start at low rapport
    messageCount: 0
  });

  // Initialize enhanced session storage for admin dashboard
  sessions.set(sessionId, {
    sessionId: sessionId,
    characterName: characterName,
    characterRole: characterRole,
    messages: [],
    rapportLevel: 'low',
    startTime: startTime,
    lastActivity: startTime,
    messageCount: 0
  });

  // Log the session data to console
  console.log('=== New Interview Session Started ===');
  console.log('Session ID:', sessionId);
  console.log('Character Name:', characterName);
  console.log('Character Role:', characterRole);
  console.log('Timestamp:', startTime);
  console.log('=====================================\n');

  // Return success response with greeting
  const character = characters[characterName];
  res.json({
    success: true,
    message: 'Session started',
    sessionId: sessionId,
    greeting: character ? character.greeting : null,
    character: {
      name: characterName,
      role: characterRole
    }
  });
});

// Send message endpoint
app.post('/api/send-message', async (req, res) => {
  try {
    const { sessionId, characterName, message } = req.body;

    // Get session data from memory
    const sessionData = conversationMemory.get(sessionId);
    if (!sessionData) {
      return res.status(400).json({
        success: false,
        error: 'Session not found. Please start a new session.'
      });
    }

    // Get character definition
    const character = characters[characterName];
    if (!character) {
      return res.status(400).json({
        success: false,
        error: 'Character not found.'
      });
    }

    // Log the message to console
    console.log('=== New Message Received ===');
    console.log('Session ID:', sessionId);
    console.log('Character:', characterName);
    console.log('User Message:', message);
    console.log('Rapport Level:', sessionData.rapportLevel);
    console.log('Message Count:', sessionData.messageCount + 1);
    console.log('Timestamp:', new Date().toISOString());
    console.log('============================\n');

    const timestamp = new Date().toISOString();

    // Add user message to session memory
    sessionData.messages.push({
      role: 'user',
      content: message
    });
    sessionData.messageCount++;

    // Update enhanced session storage
    const session = sessions.get(sessionId);
    if (session) {
      session.messages.push({
        speaker: 'User',
        content: message,
        timestamp: timestamp
      });
      session.lastActivity = timestamp;
      session.messageCount = sessionData.messageCount;
    }

    // Simple rapport calculation (we'll make this smarter later)
    // For now: low (0-3 messages), medium (4-7), high (8+)
    if (sessionData.messageCount >= 8) {
      sessionData.rapportLevel = 'high';
    } else if (sessionData.messageCount >= 4) {
      sessionData.rapportLevel = 'medium';
    }

    // Build messages for OpenAI
    // Include system prompt with rapport level indicator
    const systemMessage = {
      role: 'system',
      content: `${character.systemPrompt}

CURRENT RAPPORT LEVEL: ${sessionData.rapportLevel.toUpperCase()}

Adjust your responses according to the rapport level. At ${sessionData.rapportLevel} rapport, you should behave as described in the ${sessionData.rapportLevel.toUpperCase()} RAPPORT section of your character description.`
    };

    // Get last 15 messages for context (to avoid token limits)
    const recentMessages = sessionData.messages.slice(-15);

    // Combine system message with conversation history
    const messages = [systemMessage, ...recentMessages];

    // Call OpenAI API
    console.log('Calling OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using gpt-4o-mini for cost efficiency, you can change to 'gpt-4' if needed
      messages: messages,
      temperature: 0.8,
      max_tokens: 300
    });

    const aiResponse = completion.choices[0].message.content;
    const responseTimestamp = new Date().toISOString();

    // Add AI response to session memory
    sessionData.messages.push({
      role: 'assistant',
      content: aiResponse
    });

    // Update the memory
    conversationMemory.set(sessionId, sessionData);

    // Update enhanced session storage with AI response
    if (session) {
      session.messages.push({
        speaker: characterName,
        content: aiResponse,
        timestamp: responseTimestamp
      });
      session.rapportLevel = sessionData.rapportLevel;
      session.lastActivity = responseTimestamp;
      sessions.set(sessionId, session);
    }

    console.log('AI Response generated successfully');
    console.log('Response length:', aiResponse.length, 'characters\n');

    // Return response
    res.json({
      success: true,
      response: aiResponse,
      sessionId: sessionId,
      rapportLevel: sessionData.rapportLevel,
      messageCount: sessionData.messageCount
    });

  } catch (error) {
    console.error('Error in /api/send-message:', error);

    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API quota exceeded. Please check your API key and billing.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate response. Please try again.',
      details: error.message
    });
  }
});

// ==================== ADMIN ENDPOINTS ====================

// Admin login endpoint
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;

  if (password === process.env.ADMIN_PASSWORD) {
    console.log('Admin login successful');
    res.json({
      success: true,
      message: 'Login successful'
    });
  } else {
    console.log('Admin login failed - incorrect password');
    res.status(401).json({
      success: false,
      message: 'Incorrect password'
    });
  }
});

// Get all active sessions
app.get('/api/admin/sessions', (req, res) => {
  try {
    // Convert sessions Map to array with metadata only (no full message content)
    const sessionList = Array.from(sessions.values()).map(session => ({
      sessionId: session.sessionId,
      characterName: session.characterName,
      characterRole: session.characterRole,
      messageCount: session.messageCount,
      rapportLevel: session.rapportLevel,
      startTime: session.startTime,
      lastActivity: session.lastActivity
    }));

    res.json({
      success: true,
      sessions: sessionList,
      totalSessions: sessionList.length
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions'
    });
  }
});

// Get full conversation for a specific session
app.get('/api/admin/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      session: session
    });
  } catch (error) {
    console.error('Error fetching session details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session details'
    });
  }
});

// Serve admin.html at /admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'admin.html'));
});

// Catch-all route to serve index.html for any non-API routes
// This must be last, after all API routes
app.use((req, res, next) => {
  if (!req.path.startsWith('/api') && req.path !== '/admin') {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
  } else {
    next();
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Frontend available at http://localhost:${PORT}`);
});
