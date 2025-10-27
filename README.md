# Interview Training Platform

A web-based AI-powered platform for practicing behavioral threat assessment interviews with realistic characters. Train on conducting interviews to identify potential risks through conversation and rapport building.

## Description

This platform provides a safe, simulated environment for training professionals in conducting behavioral threat assessment interviews. Users interact with AI-powered characters that exhibit varying levels of openness based on rapport, mirroring real-world interview dynamics. An admin dashboard allows instructors to monitor active sessions in real-time.

## Features

- **AI-Powered Characters**: Five distinct characters powered by OpenAI's GPT models
- **Rapport System**: Characters respond differently based on conversation rapport (low/medium/high)
- **Real-Time Chat Interface**: Professional chat UI with message history and typing indicators
- **Admin Monitoring Dashboard**: Track all active interviews in real-time with conversation transcripts
- **Session Management**: Each interview session maintains conversation context and history
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Technology Stack

### Backend
- **Node.js** with Express.js
- **OpenAI API** (GPT-4o-mini) for AI character responses
- **dotenv** for environment variable management
- **CORS** for cross-origin requests
- In-memory session storage

### Frontend
- **HTML5/CSS3** for structure and styling
- **Vanilla JavaScript** for interactivity
- Modern responsive design with CSS Grid and Flexbox
- Modal components for admin features

## Project Structure

```
interview-training-platform/
├── backend/
│   ├── .env                # Environment variables (not in git)
│   ├── .env.example        # Environment template
│   ├── server.js           # Express server & API endpoints
│   ├── characters.js       # Character definitions & system prompts
│   ├── package.json        # Node dependencies
│   └── node_modules/       # Installed packages
├── frontend/
│   ├── index.html          # Character selection page
│   ├── chat.html           # Interview chat interface
│   ├── admin.html          # Admin monitoring dashboard
│   ├── style.css           # Main application styles
│   ├── admin.css           # Admin dashboard styles
│   ├── script.js           # Character selection logic
│   ├── chat.js             # Chat interface logic
│   └── admin.js            # Admin dashboard logic
├── .gitignore              # Git exclusions
└── README.md               # This file
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd interview-training-platform
   ```

2. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the `backend` directory by copying the example:
   ```bash
   cp .env.example .env
   ```

   Edit `backend/.env` and add your credentials:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ADMIN_PASSWORD=your-secure-password
   PORT=3001
   ```

   **Getting an OpenAI API Key:**
   - Visit https://platform.openai.com/api-keys
   - Sign in or create an account
   - Click "Create new secret key"
   - Copy and paste it into your `.env` file

4. **Start the server**
   ```bash
   node server.js
   ```

   You should see:
   ```
   Server is running on http://localhost:3001
   Frontend available at http://localhost:3001
   ```

5. **Access the application**

   Open your browser and visit: **http://localhost:3001**

## Usage

### User Interface

1. **Select a Character**
   - Visit http://localhost:3001
   - Choose from 5 available characters:
     - **Ethan Reeves** - Student
     - **Lily Reeves** - Mother
     - **Andrew Wright** - Student
     - **Taylor Gibbons** - School Counselor
     - **Sam Harding** - School Resource Officer

2. **Conduct Interview**
   - Chat interface opens with the selected character
   - Type messages up to 500 characters
   - Press Enter to send (Shift+Enter for new line)
   - Character responses adapt based on rapport level:
     - **Low Rapport (0-3 messages)**: Guarded, defensive
     - **Medium Rapport (4-7 messages)**: More open, sharing some information
     - **High Rapport (8+ messages)**: Emotionally open, full disclosure

3. **Reset Interview**
   - Click "Reset Interview" to end session and return to character selection

### Admin Dashboard

1. **Access Admin Panel**
   - Visit http://localhost:3001/admin
   - Enter admin password (set in `.env` file)

2. **Monitor Sessions**
   - View all active interview sessions
   - See real-time statistics:
     - Total active sessions
     - Auto-refresh every 5 seconds
     - Last update timestamp

3. **View Conversation Details**
   - Click "View Conversation" on any session card
   - See full transcript with timestamps
   - Monitor rapport level progression
   - Track message counts and session duration

4. **Dashboard Features**
   - **Color-coded rapport levels**:
     - 🔴 Red = Low
     - 🟡 Yellow = Medium
     - 🟢 Green = High
   - **Auto-refresh**: Updates every 5 seconds automatically
   - **Session metadata**: ID, character, role, message count, start time, last activity

## Available Characters

### Ethan Reeves (Student) - Fully Implemented
A 17-year-old high school junior dealing with personal struggles. Has detailed background, behavioral cues, and rapport-based revelation system. Best character for testing the platform's capabilities.

### Other Characters (Placeholder)
- **Lily Reeves** (Mother)
- **Andrew Wright** (Student)
- **Taylor Gibbons** (School Counselor)
- **Sam Harding** (School Resource Officer)

*Note: Additional characters have basic definitions and can be expanded with detailed system prompts similar to Ethan.*

## API Endpoints

### Public Endpoints
- `GET /` - Serves character selection page
- `GET /chat.html` - Serves interview chat interface
- `GET /api/health` - Health check endpoint

### Interview Endpoints
- `POST /api/start-session` - Initialize new interview session
- `POST /api/send-message` - Send message and get AI response

### Admin Endpoints
- `GET /admin` - Serves admin dashboard
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/sessions` - Get all active sessions
- `GET /api/admin/session/:sessionId` - Get specific session details

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |
| `ADMIN_PASSWORD` | Password for admin dashboard | Yes |
| `PORT` | Server port (default: 3001) | No |

### OpenAI Model

Currently using `gpt-4o-mini` for cost efficiency. To use GPT-4 for higher quality responses, change line 133 in `backend/server.js`:

```javascript
model: 'gpt-4', // Change from 'gpt-4o-mini'
```

## Security Considerations

- API keys and passwords stored in `.env` (git-ignored)
- Admin password currently plain text (suitable for development)
- For production deployment:
  - Use password hashing (bcrypt)
  - Implement JWT authentication
  - Add rate limiting
  - Enable HTTPS
  - Use database instead of in-memory storage

## Development

### Adding New Characters

1. Open `backend/characters.js`
2. Add character definition following the Ethan Reeves template
3. Include:
   - name, role, greeting
   - systemPrompt with detailed background
   - rapportLevels configuration
4. Restart server to apply changes

### Customizing Rapport System

Currently uses simple message count-based rapport:
- Low: 0-3 messages
- Medium: 4-7 messages
- High: 8+ messages

To modify, edit lines 136-142 in `backend/server.js`

## Troubleshooting

### Server won't start
- Check that port 3001 is available
- Verify `.env` file exists and has valid API key
- Run `npm install` to ensure dependencies are installed

### AI not responding
- Verify OpenAI API key is correct
- Check OpenAI account has available credits
- Check backend console for error messages

### Admin login failing
- Verify `ADMIN_PASSWORD` is set in `.env`
- Ensure server has been restarted after changing `.env`

### Sessions not appearing in admin
- Ensure auto-refresh is working (check "Last Updated" time)
- Click "Refresh" button manually
- Check browser console for errors

## License

This project is for educational and training purposes.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## Acknowledgments

- OpenAI for GPT API
- Character scenarios designed for behavioral threat assessment training
