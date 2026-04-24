# Jarvis

Jarvis is a full-stack browser AI assistant with a premium glassmorphism interface, persistent chat history, browser command execution, voice input and speech output, and built-in mock image generation.

## Features

- React + Vite frontend with Tailwind CSS styling
- Express backend with persistent JSON chat storage
- Left sidebar with previous chats, switching, and delete controls
- Voice input using the Web Speech API
- Speech synthesis with selectable browser voices
- Voice toggle, mic button, and keyboard shortcut: `Ctrl + Shift + M`
- Modular command handling:
  - `open youtube`
  - `open google`
  - `search for futuristic dashboards`
  - `summarize this page`
- Image mode plus natural prompts like `create an image of a neon city`
- Typing indicator, smooth scrolling, loading states, and responsive layout

## Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express
- AI chat: Groq API
- Voice: Web Speech API
- Image generation: local mock image generator with saved prompt history

## Project Structure

```text
jarvis/
  src/
    api/
    components/
    hooks/
    utils/
    App.jsx
    main.jsx
    styles.css
  server/
    index.js
    chats.json           # legacy import source if present
  data/
    chats.json           # runtime chat persistence
  .env.example
  index.html
  package.json
  vite.config.mjs
```

## Setup

1. Open a terminal in `jarvis`.
2. Install dependencies:

```bash
npm install
```

3. Create `.env` from `.env.example` and add your Groq API key:

```env
GROQ_API_KEY=your_groq_api_key_here
PORT=3000
```

4. Start the full stack in development:

```bash
npm run dev
```

5. Open `http://localhost:5173`.

The backend runs on `http://localhost:3000` and Vite proxies `/api` requests automatically.

## Production Build

Build the frontend:

```bash
npm run build
```

Start the Express server:

```bash
npm start
```

Then open `http://localhost:3000`.

## Notes

- If `GROQ_API_KEY` is missing, Jarvis still supports browser commands, chat storage, speech controls, and mock image generation, but conversational AI replies will be limited.
- Voice input depends on browser support for `SpeechRecognition` or `webkitSpeechRecognition`.
- Voice output depends on voices installed in the browser and operating system.
- Chat history is stored locally in `data/chats.json`.
