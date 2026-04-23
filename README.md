# Jarvis

Jarvis is a sleek full-stack personal AI assistant with a sci-fi dark UI, Claude-powered chat, markdown replies, session memory, and automatic spoken responses in a female voice using the browser's Web Speech API.

## Features

- Full-screen chat interface inspired by modern AI assistants
- Claude API integration with full in-session conversation history
- Markdown rendering for AI responses
- Auto-scroll, typing indicator, timestamps, and message replay audio
- Female voice auto-selected with mute/unmute control
- New Chat button that clears history and stops speech
- Express backend with CORS and dotenv support

## Tech Stack

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js, Express
- AI: Anthropic Claude (`claude-sonnet-4-20250514`)
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
  .env
  package.json
  README.md
```

## Setup

1. Open a terminal in `jarvis`.
2. Install dependencies:

```bash
npm install
```

3. Add your Anthropic API key in `.env`:

```env
ANTHROPIC_API_KEY=your_real_key_here
```

4. Start the server:

```bash
npm start
```

5. Open `http://localhost:3000` in your browser.

## API

### `POST /api/chat`

Request body:

```json
{
  "messages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi, how can I help?" }
  ]
}
```

Response body:

```json
{
  "reply": "Jarvis reply text"
}
```

## Notes

- Voice playback depends on the voices available in the user's browser and operating system.
- Browsers may require a user interaction before speech playback works consistently.
- The frontend stores chat history in memory for the current page session only.
