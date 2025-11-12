/**
 * Rapport Tracking System based on Motivational Interviewing (MI) and OARS Model
 *
 * This module analyzes user messages to track rapport building/damaging behaviors
 * based on evidence-based Motivational Interviewing techniques.
 *
 * Rapport Scale (Realistic Trust-Building):
 * - 0-40: Low rapport (guarded, defensive responses)
 * - 41-75: Medium rapport (opening up, some trust)
 * - 76-100: High rapport (full disclosure, trust established)
 *
 * All sessions start at 20 (middle of low range) to reflect initial guardedness
 *
 * Key Principle: Trust is gained slowly but lost quickly
 * - Maximum GAIN per message: +8 points (building trust takes time)
 * - Maximum LOSS per message: -15 points (breaking trust is fast)
 * - Typical good MI progression: +2 to +3 per message
 * - Need ~12-15 quality messages to reach high rapport
 * - One aggressive message can undo 2-3 good messages of progress
 */

// ============================================================================
// MOTIVATIONAL INTERVIEWING TECHNIQUES (Rapport Building)
// ============================================================================

const MI_TECHNIQUES = {
  // Open Questions (+2): Invites elaboration and exploration
  openQuestions: {
    score: 2,
    patterns: [
      /\bhow do you feel\b/i,
      /\bwhat'?s been going on\b/i,
      /\btell me (about|more)\b/i,
      /\bcan you help me understand\b/i,
      /\bwhat'?s (that|it) like for you\b/i,
      /\bwalk me through\b/i,
      /\bdescribe\b/i,
      /\bexplain to me\b/i,
      /\bhelp me understand\b/i,
      /\bwhat are your thoughts\b/i,
      /\bwhat do you think about\b/i,
      /\bhow would you describe\b/i,
      /\bwhat does .+ mean to you\b/i,
      /\bwhat'?s your experience\b/i,
      /\btell me what\b/i
    ],
    label: "Open Question"
  },

  // Affirmations (+3): Recognizes strengths and efforts
  affirmations: {
    score: 3,
    patterns: [
      /\bthat takes courage\b/i,
      /\bi appreciate (you|your|that you)\b/i,
      /\byou'?re being really honest\b/i,
      /\bthat'?s insightful\b/i,
      /\byou'?re thinking carefully\b/i,
      /\bi respect that\b/i,
      /\bthat'?s brave\b/i,
      /\bi admire\b/i,
      /\byou'?re doing (great|well)\b/i,
      /\bthat shows strength\b/i,
      /\bi recognize\b/i,
      /\byou have (courage|strength|insight)\b/i,
      /\bthat takes (strength|bravery)\b/i
    ],
    label: "Affirmation"
  },

  // Reflective Listening (+3): Demonstrates understanding
  reflectiveListening: {
    score: 3,
    patterns: [
      /\bso you'?re saying\b/i,
      /\bi notice\b/i,
      /\bit sounds like\b/i,
      /\bwhat i'?m hearing is\b/i,
      /\byou feel\b/i,
      /\bseems like you'?re\b/i,
      /\bi sense that\b/i,
      /\bif i understand (correctly|right)\b/i,
      /\byou'?re feeling\b/i,
      /\bit seems (like|that)\b/i,
      /\byou mentioned\b/i,
      /\byou'?re experiencing\b/i,
      /\bfrom what you'?re saying\b/i,
      /\byou seem\b/i
    ],
    label: "Reflective Listening"
  },

  // Summaries (+4): Ties together themes and shows attentiveness
  summaries: {
    score: 4,
    patterns: [
      /\blet me make sure i\b/i,
      /\bit sounds like\b/i,
      /\bso far you'?ve (mentioned|told me|said)\b/i,
      /\bputting (it|this) together\b/i,
      /\bfrom what you'?ve told me\b/i,
      /\bto summarize\b/i,
      /\bif i could recap\b/i,
      /\blooking at everything\b/i,
      /\bfrom our conversation\b/i,
      /\byou'?ve shared that\b/i,
      /\btaking (stock|account) of\b/i,
      /\bcollecting what you'?ve said\b/i
    ],
    label: "Summary"
  },

  // Empathy (+3): Demonstrates emotional understanding
  empathy: {
    score: 3,
    patterns: [
      /\bi understand\b/i,
      /\bwow!\b/i,
      /\bthat sounds like a lot\b/i,
      /\bsounds like you've been going through a lot\b/i,
      /\bthat must be\b/i,
      /\bi hear you\b/i,
      /\bi'?m sorry\b/i,
      /\bthat'?s really hard\b/i,
      /\bcan'?t imagine\b/i,
      /\bthat sounds (painful|difficult|overwhelming)\b/i,
      /\bi can only imagine\b/i,
      /\bmust be tough\b/i
    ],
    label: "Empathy"
  },

  // Validation (+2): Normalizes and validates feelings
  validation: {
    score: 2,
    patterns: [
      /\b(that )?makes sense\b/i,
      /\bi can see why\b/i,
      /\bthat'?s understandable\b/i,
      /\bsounds (difficult|hard|tough|challenging|complicated)\b/i,
      /\bi bet you feel\b/i,
      /\bi get it\b/i,
      /\byour feelings are valid\b/i,
      /\bit'?s (normal|natural|reasonable) to feel\b/i,
      /\byou have (every|a) right to feel\b/i,
      /\bmakes perfect sense\b/i
    ],
    label: "Validation"
  },

  // Support (+2): Offers partnership and assistance
  support: {
    score: 2,
    patterns: [
      /\bi'?m here to help\b/i,
      /\bwe can work through\b/i,
      /\byou'?re not alone\b/i,
      /\bi want to support you\b/i,
      /\blet'?s figure this out together\b/i,
      /\bi'?m here for you\b/i,
      /\bwe'?ll work on this together\b/i,
      /\bi'?d like to help\b/i,
      /\byou don'?t have to (do this|go through this) alone\b/i,
      /\blet'?s navigate the next steps\b/i,
      /\bwho else would you feel comfortable sharing with\b/i,
      /\bwhat else can i do\b/i,
      /\bwhat do you need\b/i
    ],
    label: "Support"
  },

  // Exploring Ambivalence (+3): Helps explore mixed feelings
  exploringAmbivalence: {
    score: 3,
    patterns: [
      /\bwhat concerns you about\b/i,
      /\bwhat might be different if\b/i,
      /\bpart of you wants\b/i,
      /\bon one hand.+on the other\b/i,
      /\bwhat are the (pros and cons|benefits and drawbacks)\b/i,
      /\bwhat (worries|concerns) you\b/i,
      /\bwhat holds you back\b/i,
      /\btorn between\b/i,
      /\bmixed feelings\b/i,
      /\bsounds confusing\.? help me understand\b/i,
      /\btell me about your different feelings in connection to\b/i,
      /\bwhat are the complications of\b/i
    ],
    label: "Exploring Ambivalence"
  }
};

// ============================================================================
// RAPPORT-DAMAGING APPROACHES (Breaks Trust)
// ============================================================================

const DAMAGING_APPROACHES = {
  // Aggressive/Confrontational (-7): Creates defensiveness
  aggressive: {
    score: -7,
    patterns: [
      /\bjust tell me\b/i,
      /\byou (need|have) to\b/i,
      /\byou must\b/i,
      /\bstop lying\b/i,
      /\bbe honest with me\b/i,
      /\bi don'?t believe you\b/i,
      /\bdon'?t (lie|bs|bullshit)\b/i,
      /\bstop (playing|messing)\b/i,
      /\bcut the crap\b/i,
      /\benough (games|lies)\b/i,
      /\bif you don'?t .+,? i will\b/i,
      /\bmaybe you will talk if we bring in\b/i,
      /\bthat'?s not what .+ (said|told me|told us)\b/i,
      /\b(this|you) need(s|has)? to stop\b/i
    ],
    label: "Aggressive/Confrontational"
  },

  // Dismissive (-6): Invalidates experience
  dismissive: {
    score: -6,
    patterns: [
      /\bwhatever\b/i,
      /\bi don'?t care\b/i,
      /\bdoesn'?t matter\b/i,
      /\bso what\b/i,
      /\bget over it\b/i,
      /\bthat'?s not important\b/i,
      /\bwho cares\b/i,
      /\bnot a big deal\b/i,
      /\bnot my problem\b/i,
      /\bit seems like you'?re avoiding\b/i,
      /\bstop wasting (our|my) time\b/i
    ],
    label: "Dismissive"
  },

  // Accusatory (-8): Destroys trust
  accusatory: {
    score: -8,
    patterns: [
      /\byou'?re lying\b/i,
      /\bi know you did\b/i,
      /\badmit it\b/i,
      /\bconfess\b/i,
      /\byou'?re hiding something\b/i,
      /\bstop playing games\b/i,
      /\bi don'?t trust you\b/i,
      /\byou did it\b/i,
      /\byou'?re (guilty|responsible)\b/i,
      /\bjust admit\b/i
    ],
    label: "Accusatory"
  },

  // Demanding (-6): Creates pressure and resistance
  demanding: {
    score: -6,
    patterns: [
      /\banswer me\b/i,
      /\bimmediately\b/i,
      /\bhurry up\b/i,
      /\btell me now\b/i,
      /\bi demand\b/i,
      /\byou better\b/i,
      /\bdo it now\b/i,
      /\bthis instant\b/i
    ],
    label: "Demanding"
  },

  // Minimizing (-5): Invalidates feelings
  minimizing: {
    score: -5,
    patterns: [
      /\bit'?s not that bad\b/i,
      /\b(you'?re )?overreacting\b/i,
      /\bbeing dramatic\b/i,
      /\bjust a phase\b/i,
      /\beveryone goes through this\b/i,
      /\bcould be worse\b/i,
      /\bit'?s not a big deal\b/i,
      /\byou'?ll get over it\b/i,
      /\bstop exaggerating\b/i,
      /\btoughen up\b/i,
      /\bgrow up\b/i,
      /\bthat'?s all\?/i
    ],
    label: "Minimizing"
  },

  // Advice-giving without permission (-3): Can feel preachy
  unsolicited_advice: {
    score: -3,
    patterns: [
      /\byou should\b/i,
      /\byou need to\b/i,
      /\bwhat i would do\b/i,
      /\bjust (do|try)\b/i,
      /\bmy advice is\b/i,
      /\bif i were you\b/i,
      /\bthe best thing (is|would be)\b/i,
      /\bwhat you need to do\b/i,
      /\bit'?s obvious that you (need to|must)\b/i,
      /\bobviously\b/i,
      /\byou must\b/i
    ],
    label: "Unsolicited Advice"
  }
};

// ============================================================================
// ADDITIONAL SCORING FACTORS
// ============================================================================

/**
 * Checks if message is a closed question (yes/no question)
 * @param {string} message - The message to analyze
 * @returns {boolean}
 */
function isClosedQuestion(message) {
  const closedQuestionPatterns = [
    /^(do|does|did|is|are|was|were|will|would|can|could|should|have|has|had) (you|he|she|they|it)\b/i,
    /^(is|are) (there|this|that|it)\b/i
  ];

  return message.includes('?') && closedQuestionPatterns.some(pattern => pattern.test(message.trim()));
}

/**
 * Counts number of questions in a message
 * @param {string} message - The message to analyze
 * @returns {number}
 */
function countQuestions(message) {
  return (message.match(/\?/g) || []).length;
}

/**
 * Checks if message contains profanity
 * @param {string} message - The message to analyze
 * @returns {boolean}
 */
function containsProfanity(message) {
  const profanityPatterns = [
    /\bfuck/i,
    /\bshit/i,
    /\bass(hole)?\b/i,
    /\bbitch/i,
    /\bdamn/i,
    /\bcrap\b/i,
    /\bhell\b/i,
    /\bbastard/i
  ];

  return profanityPatterns.some(pattern => pattern.test(message));
}

/**
 * Counts how many times a character name appears in the message
 * @param {string} message - The message to analyze
 * @param {string} characterName - The character's name to look for
 * @returns {number} Number of times the name appears
 */
function countCharacterNameUsage(message, characterName) {
  if (!characterName || characterName.trim() === '') {
    return 0;
  }

  const regex = new RegExp(`\\b${characterName}\\b`, 'gi');
  const matches = message.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Checks if message is in all caps (yelling)
 * @param {string} message - The message to analyze
 * @returns {boolean}
 */
function isAllCaps(message) {
  const alphaChars = message.replace(/[^a-zA-Z]/g, '');
  if (alphaChars.length < 5) return false; // Too short to judge

  const upperCount = (message.match(/[A-Z]/g) || []).length;
  return upperCount / alphaChars.length > 0.8; // 80%+ uppercase
}

// ============================================================================
// MAIN RAPPORT ANALYSIS FUNCTION
// ============================================================================

/**
 * Analyzes a user message and calculates rapport changes based on MI principles
 *
 * @param {string} message - The user's message to analyze
 * @param {number} currentScore - Current rapport score (0-100)
 * @param {string} characterName - Optional character name to check for overuse
 * @returns {Object} Analysis result with new score, level, changes, and reasoning
 */
function analyzeMessage(message, currentScore = 20, characterName = '') {
  const changes = [];
  let scoreChange = 0;

  // Normalize message for analysis
  const normalizedMessage = message.trim();
  const messageLength = normalizedMessage.length;

  // ========================================================================
  // 1. Check for MI Techniques (Rapport Building)
  // ========================================================================

  for (const [key, technique] of Object.entries(MI_TECHNIQUES)) {
    for (const pattern of technique.patterns) {
      if (pattern.test(normalizedMessage)) {
        scoreChange += technique.score;
        changes.push({
          type: 'positive',
          technique: technique.label,
          points: technique.score,
          description: `Used ${technique.label}`
        });
        break; // Only count each technique once per message
      }
    }
  }

  // ========================================================================
  // 2. Check for Damaging Approaches (Rapport Breaking)
  // ========================================================================

  for (const [key, approach] of Object.entries(DAMAGING_APPROACHES)) {
    for (const pattern of approach.patterns) {
      if (pattern.test(normalizedMessage)) {
        scoreChange += approach.score;
        changes.push({
          type: 'negative',
          technique: approach.label,
          points: approach.score,
          description: `${approach.label} approach detected`
        });
        break; // Only count each approach once per message
      }
    }
  }

  // ========================================================================
  // 3. Additional Scoring Factors
  // ========================================================================

  // Closed questions (-2): Limit elaboration
  if (isClosedQuestion(normalizedMessage)) {
    scoreChange -= 0;
    changes.push({
      type: 'negative',
      technique: 'Closed Question',
      points: 0,
      description: 'Used closed yes/no question'
    });
  }

  // Questions in general (+1): Encourages dialogue
  const questionCount = countQuestions(normalizedMessage);
  if (questionCount === 1) {
    scoreChange += 1;
    changes.push({
      type: 'positive',
      technique: 'Asked Question',
      points: 1,
      description: 'Asked a question to encourage dialogue'
    });
  } else if (questionCount > 1) {
    // Multiple questions feel interrogative (-1)
    scoreChange -= 1;
    changes.push({
      type: 'negative',
      technique: 'Multiple Questions',
      points: -1,
      description: `Asked ${questionCount} questions (can feel interrogative)`
    });
  }

  // All caps detection (-5): Perceived as yelling
  if (isAllCaps(normalizedMessage)) {
    scoreChange -= 5;
    changes.push({
      type: 'negative',
      technique: 'All Caps',
      points: -5,
      description: 'Message in all caps (perceived as yelling)'
    });
  }

  // Very short messages (-2): Shows disengagement
  if (messageLength < 10 && messageLength > 0) {
    scoreChange -= 2;
    changes.push({
      type: 'negative',
      technique: 'Very Short Message',
      points: -2,
      description: 'Very short message suggests disengagement'
    });
  }

  // Long, thoughtful messages (+1): Shows investment
  if (messageLength > 100) {
    scoreChange += 1;
    changes.push({
      type: 'positive',
      technique: 'Thoughtful Message',
      points: 1,
      description: 'Long, thoughtful message shows investment'
    });
  }

  // Profanity (-4): Unprofessional
  if (containsProfanity(normalizedMessage)) {
    scoreChange -= 4;
    changes.push({
      type: 'negative',
      technique: 'Profanity',
      points: -4,
      description: 'Used profanity'
    });
  }

  // Excessive name usage (-1): Using character's name more than 2 times feels unnatural
  if (characterName) {
    const nameCount = countCharacterNameUsage(normalizedMessage, characterName);
    if (nameCount > 2) {
      scoreChange -= 1;
      changes.push({
        type: 'negative',
        technique: 'Excessive Name Usage',
        points: -1,
        description: `Used character's name ${nameCount} times (feels unnatural when used more than twice)`
      });
    }
  }

  // ========================================================================
  // 4. Cap Total Change (Asymmetric: Trust builds slowly, breaks quickly)
  // ========================================================================
  // Positive changes capped at +8 (trust takes time to build)
  // Negative changes capped at -15 (trust can be destroyed quickly)

  if (scoreChange > 8) {
    scoreChange = 8;
    changes.push({
      type: 'system',
      technique: 'Gain Cap Applied',
      points: 0,
      description: 'Maximum rapport gain per message reached (+8) - trust builds slowly'
    });
  } else if (scoreChange < -15) {
    scoreChange = -15;
    changes.push({
      type: 'system',
      technique: 'Loss Cap Applied',
      points: 0,
      description: 'Maximum rapport loss per message reached (-15)'
    });
  }

  // ========================================================================
  // 5. Calculate New Score and Level
  // ========================================================================

  let newScore = currentScore + scoreChange;

  // Ensure score stays within 0-100 bounds
  if (newScore > 100) newScore = 100;
  if (newScore < 0) newScore = 0;

  // Determine rapport level (updated thresholds for realistic trust-building)
  let newLevel;
  if (newScore <= 40) {
    newLevel = 'low';
  } else if (newScore <= 75) {
    newLevel = 'medium';
  } else {
    newLevel = 'high';
  }

  // ========================================================================
  // 6. Generate Human-Readable Reasoning
  // ========================================================================

  let reasoning = '';

  if (changes.length === 0) {
    reasoning = 'Neutral message with no significant rapport impact.';
  } else {
    const positiveChanges = changes.filter(c => c.type === 'positive');
    const negativeChanges = changes.filter(c => c.type === 'negative');

    if (positiveChanges.length > 0) {
      reasoning += 'Rapport builders: ' + positiveChanges.map(c => c.technique).join(', ') + '. ';
    }

    if (negativeChanges.length > 0) {
      reasoning += 'Rapport damagers: ' + negativeChanges.map(c => c.technique).join(', ') + '. ';
    }

    reasoning += `Net change: ${scoreChange > 0 ? '+' : ''}${scoreChange} points.`;
  }

  // ========================================================================
  // 7. Return Analysis Results
  // ========================================================================

  return {
    newScore,
    newLevel,
    scoreChange,
    changes,
    reasoning,
    previousScore: currentScore
  };
}

/**
 * Gets the initial rapport score for a new session
 * @returns {number} Starting rapport score (20 - middle of low)
 */
function getInitialScore() {
  return 20;
}

/**
 * Gets the rapport level description
 * @param {string} level - The rapport level (low/medium/high)
 * @returns {string} Description of what this level means
 */
function getLevelDescription(level) {
  const descriptions = {
    low: 'Character is guarded, defensive, and reluctant to share. Trust has not been established. (0-40 points)',
    medium: 'Character is beginning to open up and share surface-level concerns. Some trust is developing. (41-75 points)',
    high: 'Character fully trusts you and will share critical information, including sensitive details. (76-100 points)'
  };

  return descriptions[level] || 'Unknown rapport level';
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  analyzeMessage,
  getInitialScore,
  getLevelDescription
};
