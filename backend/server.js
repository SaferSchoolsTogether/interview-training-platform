require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');
const { getCharacterSystemMessage, getCharacterMetadata, getAllCharacters } = require('./characters');
const { analyzeMessage, getInitialScore, getLevelDescription } = require('./rapportTracker');

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
  const initialRapportScore = getInitialScore(); // Start at 20 (middle of low range)

  // Initialize conversation memory for this session
  conversationMemory.set(sessionId, {
    characterName: characterName,
    messages: [],
    rapportScore: initialRapportScore, // Numeric score (0-100)
    rapportLevel: 'low', // Descriptive level (low/medium/high)
    rapportHistory: [{ score: initialRapportScore, level: 'low', timestamp: startTime }], // Track score over time
    messageCount: 0
  });

  // Initialize enhanced session storage for admin dashboard
  sessions.set(sessionId, {
    sessionId: sessionId,
    characterName: characterName,
    characterRole: characterRole,
    messages: [],
    rapportScore: initialRapportScore,
    rapportLevel: 'low',
    rapportHistory: [{ score: initialRapportScore, level: 'low', timestamp: startTime }],
    startTime: startTime,
    lastActivity: startTime,
    messageCount: 0
  });

  // Log the session data to console
  console.log('=== New Interview Session Started ===');
  console.log('Session ID:', sessionId);
  console.log('Character Name:', characterName);
  console.log('Character Role:', characterRole);
  console.log('Initial Rapport Score:', initialRapportScore);
  console.log('Rapport Level:', 'low');
  console.log('Timestamp:', startTime);
  console.log('=====================================\n');

  // Get character metadata
  const characterMeta = getCharacterMetadata(characterName);

  // Return success response with greeting
  res.json({
    success: true,
    message: 'Session started',
    sessionId: sessionId,
    greeting: characterMeta ? characterMeta.greeting : null,
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

    // Verify character exists
    try {
      getCharacterMetadata(characterName);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Character not found.'
      });
    }

    const timestamp = new Date().toISOString();

    // ========================================================================
    // RAPPORT ANALYSIS - Analyze user's message using MI-based rapport tracker
    // ========================================================================

    const rapportAnalysis = analyzeMessage(message, sessionData.rapportScore);

    // Update rapport score and level
    const previousScore = sessionData.rapportScore;
    const previousLevel = sessionData.rapportLevel;

    sessionData.rapportScore = rapportAnalysis.newScore;
    sessionData.rapportLevel = rapportAnalysis.newLevel;

    // Add to rapport history
    sessionData.rapportHistory.push({
      score: rapportAnalysis.newScore,
      level: rapportAnalysis.newLevel,
      scoreChange: rapportAnalysis.scoreChange,
      changes: rapportAnalysis.changes,
      reasoning: rapportAnalysis.reasoning,
      timestamp: timestamp
    });

    // Log rapport change to console for admin monitoring
    console.log('=== New Message Received ===');
    console.log('Session ID:', sessionId);
    console.log('Character:', characterName);
    console.log('User Message:', message);
    console.log('----------------------------');
    console.log('RAPPORT ANALYSIS:');
    console.log('Previous Score:', previousScore, `(${previousLevel})`);
    console.log('New Score:', rapportAnalysis.newScore, `(${rapportAnalysis.newLevel})`);
    console.log('Change:', rapportAnalysis.scoreChange > 0 ? `+${rapportAnalysis.scoreChange}` : rapportAnalysis.scoreChange);
    console.log('Reasoning:', rapportAnalysis.reasoning);
    if (rapportAnalysis.changes.length > 0) {
      console.log('Detected Techniques:');
      rapportAnalysis.changes.forEach(change => {
        console.log(`  - ${change.technique}: ${change.points > 0 ? '+' : ''}${change.points}`);
      });
    }
    console.log('----------------------------');
    console.log('Message Count:', sessionData.messageCount + 1);
    console.log('Timestamp:', timestamp);
    console.log('============================\n');

    // Add user message to session memory (with rapport metadata)
    sessionData.messages.push({
      role: 'user',
      content: message
    });
    sessionData.messageCount++;

    // Update enhanced session storage for admin dashboard
    const session = sessions.get(sessionId);
    if (session) {
      session.messages.push({
        speaker: 'User',
        content: message,
        timestamp: timestamp,
        rapportChange: rapportAnalysis.scoreChange,
        rapportReasoning: rapportAnalysis.reasoning,
        rapportChanges: rapportAnalysis.changes,
        rapportScoreAfter: rapportAnalysis.newScore,
        rapportLevelAfter: rapportAnalysis.newLevel
      });
      session.lastActivity = timestamp;
      session.messageCount = sessionData.messageCount;
      session.rapportScore = rapportAnalysis.newScore;
      session.rapportLevel = rapportAnalysis.newLevel;
      session.rapportHistory = sessionData.rapportHistory;
    }

    // ========================================================================
    // BUILD OPENAI PROMPT with rapport-aware character system message
    // ========================================================================

    const systemMessageContent = getCharacterSystemMessage(characterName, sessionData.rapportLevel);

    const systemMessage = {
      role: 'system',
      content: systemMessageContent
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

    // Return response (DO NOT include rapport data for user-facing endpoint)
    res.json({
      success: true,
      response: aiResponse,
      sessionId: sessionId,
      messageCount: sessionData.messageCount
      // Note: rapportScore and rapportLevel are intentionally omitted
      // Users should not see rapport information - only admins can
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

// Get all active sessions (ADMIN ONLY - includes rapport data)
app.get('/api/admin/sessions', (req, res) => {
  try {
    // Convert sessions Map to array with metadata including rapport info
    const sessionList = Array.from(sessions.values()).map(session => ({
      sessionId: session.sessionId,
      characterName: session.characterName,
      characterRole: session.characterRole,
      messageCount: session.messageCount,
      rapportScore: session.rapportScore, // Numeric score 0-100
      rapportLevel: session.rapportLevel, // low/medium/high
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
