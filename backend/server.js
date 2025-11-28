require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');
const { randomUUID } = require('crypto'); // Secure session ID generation
const rateLimit = require('express-rate-limit'); // Rate limiting for security
const { getCharacterSystemMessage, getCharacterMetadata, getAllCharacters } = require('./characters');
const { analyzeMessage, getInitialScore, getLevelDescription } = require('./rapportTracker');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// In-memory conversation storage (keyed by sessionId)
const conversationMemory = new Map();

// Enhanced session storage for admin dashboard
const sessions = new Map();

// ==================== RATE LIMITING CONFIGURATION ====================
// General API rate limiter: 100 requests per 15 minutes per IP
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Message endpoint rate limiter: 30 requests per 10 minutes per session
// This is applied per session ID to prevent abuse of the OpenAI API
const messageRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // Limit each session to 30 messages per windowMs
  message: { success: false, error: 'Too many messages sent. Please wait before sending more messages.' },
  // Use sessionId for rate limiting, fallback to default IP handling
  keyGenerator: (req, res) => {
    // If sessionId exists in body, use it for rate limiting
    if (req.body && req.body.sessionId) {
      return req.body.sessionId;
    }
    // Otherwise, use the default IP key generator (handles IPv6 properly)
    return req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip failed requests (don't count them against the limit)
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
});

// Admin endpoints rate limiter: 50 requests per 15 minutes per IP
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: { success: false, error: 'Too many admin requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== MIDDLEWARE ====================
// CORS configuration - supports both development and production
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Apply general rate limiter to all /api routes except message and admin endpoints
app.use('/api', (req, res, next) => {
  // Skip general limiter for endpoints with specific limiters
  if (req.path.startsWith('/admin') || req.path === '/send-message') {
    return next();
  }
  generalApiLimiter(req, res, next);
});

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// ==================== SESSION CLEANUP FUNCTION ====================
// Auto-delete sessions older than 24 hours to prevent memory leaks
function cleanupOldSessions() {
  const now = Date.now();
  const twentyFourHoursInMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  let deletedCount = 0;

  console.log('=== Running Session Cleanup ===');
  console.log('Current sessions:', sessions.size);

  // Iterate through all sessions and check age
  for (const [sessionId, session] of sessions.entries()) {
    const lastActivityTime = new Date(session.lastActivity).getTime();
    const sessionAge = now - lastActivityTime;

    // Delete if older than 24 hours
    if (sessionAge > twentyFourHoursInMs) {
      // Remove from both storage Maps
      sessions.delete(sessionId);
      conversationMemory.delete(sessionId);
      deletedCount++;

      console.log(`Deleted old session: ${sessionId}`);
      console.log(`  Character: ${session.characterName}`);
      console.log(`  Last activity: ${session.lastActivity}`);
      console.log(`  Age: ${Math.round(sessionAge / (60 * 60 * 1000))} hours`);
    }
  }

  console.log(`Cleanup complete. Deleted ${deletedCount} session(s).`);
  console.log(`Remaining sessions: ${sessions.size}`);
  console.log('==============================\n');
}

// Run cleanup every hour (3600000 ms)
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
setInterval(cleanupOldSessions, CLEANUP_INTERVAL);
console.log('Session cleanup scheduled to run every hour (24-hour retention)');

// ==================== API ENDPOINTS ====================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Start session endpoint
// SECURITY: Server-side session ID generation using crypto.randomUUID()
app.post('/api/start-session', (req, res) => {
  const { characterName, characterRole } = req.body;

  // Generate secure session ID server-side (no longer accepts client-provided sessionId)
  const sessionId = randomUUID();

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

  // Initialize enhanced session storage for admin dashboard with lastActivity tracking
  sessions.set(sessionId, {
    sessionId: sessionId,
    characterName: characterName,
    characterRole: characterRole,
    messages: [],
    rapportScore: initialRapportScore,
    rapportLevel: 'low',
    rapportHistory: [{ score: initialRapportScore, level: 'low', timestamp: startTime }],
    startTime: startTime,
    lastActivity: startTime, // Track last activity for session cleanup
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

  // Return success response with server-generated sessionId and greeting
  res.json({
    success: true,
    message: 'Session started',
    sessionId: sessionId, // Server-generated secure UUID
    greeting: characterMeta ? characterMeta.greeting : null,
    character: {
      name: characterName,
      role: characterRole
    }
  });
});

// Send message endpoint with rate limiting (30 messages per 10 minutes per session)
app.post('/api/send-message', messageRateLimiter, async (req, res) => {
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

// Admin login endpoint with rate limiting
app.post('/api/admin/login', adminRateLimiter, (req, res) => {
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
app.get('/api/admin/sessions', adminRateLimiter, (req, res) => {
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
app.get('/api/admin/session/:sessionId', adminRateLimiter, (req, res) => {
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

// Delete a specific session (ADMIN ONLY)
app.delete('/api/admin/session/:sessionId', adminRateLimiter, (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Delete from both storage Maps
    sessions.delete(sessionId);
    conversationMemory.delete(sessionId);

    console.log('=== Admin: Session Deleted ===');
    console.log('Session ID:', sessionId);
    console.log('Character:', session.characterName);
    console.log('Message count:', session.messageCount);
    console.log('==============================\n');

    res.json({
      success: true,
      message: 'Session deleted successfully',
      deletedSession: {
        sessionId: sessionId,
        characterName: session.characterName,
        messageCount: session.messageCount
      }
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete session'
    });
  }
});

// Delete all sessions (ADMIN ONLY)
app.delete('/api/admin/sessions', adminRateLimiter, (req, res) => {
  try {
    const sessionCount = sessions.size;

    // Clear both storage Maps
    sessions.clear();
    conversationMemory.clear();

    console.log('=== Admin: All Sessions Cleared ===');
    console.log('Deleted sessions:', sessionCount);
    console.log('===================================\n');

    res.json({
      success: true,
      message: 'All sessions cleared successfully',
      deletedCount: sessionCount
    });
  } catch (error) {
    console.error('Error clearing sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear sessions'
    });
  }
});

// Download session report (ADMIN ONLY)
app.get('/api/admin/report', adminRateLimiter, (req, res) => {
  try {
    const reportData = [];

    // Convert sessions to array and sort by start time
    const sessionList = Array.from(sessions.values()).sort((a, b) =>
      new Date(a.startTime) - new Date(b.startTime)
    );

    sessionList.forEach(session => {
      const sessionReport = {
        sessionId: session.sessionId,
        character: {
          name: session.characterName,
          role: session.characterRole
        },
        timing: {
          startTime: session.startTime,
          lastActivity: session.lastActivity,
          duration: calculateDuration(session.startTime, session.lastActivity)
        },
        rapport: {
          finalScore: session.rapportScore,
          finalLevel: session.rapportLevel,
          history: session.rapportHistory || []
        },
        messageCount: session.messageCount,
        messages: session.messages || []
      };

      reportData.push(sessionReport);
    });

    console.log('=== Admin: Report Generated ===');
    console.log('Sessions included:', reportData.length);
    console.log('===============================\n');

    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      totalSessions: reportData.length,
      sessions: reportData
    });

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

// Helper function to calculate session duration
function calculateDuration(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffInSeconds = Math.floor((end - start) / 1000);

  const hours = Math.floor(diffInSeconds / 3600);
  const minutes = Math.floor((diffInSeconds % 3600) / 60);
  const seconds = diffInSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

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
  console.log('========================================');
  console.log('🚀 Interview Training Platform Started');
  console.log('========================================');
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`CORS Origin: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  - Health Check: http://localhost:${PORT}/api/health`);
  console.log(`  - Frontend: http://localhost:${PORT}/`);
  console.log(`  - Admin: http://localhost:${PORT}/admin`);
  console.log('========================================');
});
