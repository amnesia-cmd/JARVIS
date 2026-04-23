# Jarvis

Jarvis is a sleek full-stack personal AI assistant with a sci-fi dark UI, Groq-powered chat, persistent JSON-backed conversation history, markdown replies, and automatic spoken responses in a female voice using the browser's Web Speech API.

## Features

- Full-screen chat interface inspired by modern AI assistants
- Groq API integration with persistent multi-chat history
- Markdown rendering for AI responses
- Auto-scroll, typing indicator, timestamps, and message replay audio
- Female voice auto-selected with mute/unmute control
- Responsive sidebar with saved conversations, timestamps, and delete controls
- New Chat button that creates a fresh conversation and stops speech
- Local JSON file storage for saved conversations in `server/chats.json`
- Express backend with CORS and dotenv support

## Tech Stack

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js, Express
- AI: Groq (`llama-3.3-70b-versatile`)
- Voice: Web Speech API (`speechSynthesis`)

## Project Structure

```text
jarvis/
  public/
    index.html
    style.css
    script.js
  server/
    index.js
    chats.json
  .env
  .gitignore
  package.json
  README.md
```

## Setup

1. Open a terminal in `jarvis`.
2. Install dependencies:

```bash
npm install
```

3. Add your Groq API key in `.env`:

```env
GROQ_API_KEY=your_real_key_here
```

4. Start the server:

```bash
npm start
```

5. Open `http://localhost:3000` in your browser.

## API

- `GET /api/chats` returns the saved conversation list
- `GET /api/chats/:id` returns a full conversation with messages
- `POST /api/chats` creates a new conversation with the Jarvis welcome message
- `POST /api/chats/:id/messages` adds a user message and stores the AI reply
- `DELETE /api/chats/:id` removes a conversation

## Notes

- Voice playback depends on the voices available in the user's browser and operating system.
- Browsers may require a user interaction before speech playback works consistently.
- Chat history is saved locally in `server/chats.json` and reloaded when the app restarts.
- `server/chats.json` is ignored by Git so local conversations do not get committed.
