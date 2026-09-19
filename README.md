# Jarvis

A full-stack browser AI assistant with persistent chat sessions, voice interaction, browser commands, and a React/Express architecture.

## Features

- React + Vite frontend
- Express backend
- Persistent local chat storage
- Voice input and speech synthesis
- Modular browser-command handling
- AI chat through Groq
- Mock image-generation workflow

## Architecture

```text
Browser UI → React/Vite → /api → Express → AI provider
                         ↓
                    local chat data
```

## Stack

- React, Vite, Tailwind CSS
- Node.js, Express
- Groq API
- Web Speech API
- Local JSON persistence

## Development

```bash
npm install
cp .env.example .env
npm run dev
```

Configure `GROQ_API_KEY` and `PORT` in `.env`.

## Production

```bash
npm run build
npm start
```

## Security notes

- Keep provider API keys server-side.
- Never commit `.env` or real credentials.
- Validate browser commands before execution.
- Local JSON storage is intended for experimentation, not multi-user production data.

## Status

Experimental personal-assistant project.
