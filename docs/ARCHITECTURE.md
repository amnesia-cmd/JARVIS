# Architecture

JARVIS is a browser-based assistant with a React/Vite client and an Express server.

## Request flow

Browser UI → React/Vite → Express API → Groq provider
                         ↘ local JSON chat store

## Responsibilities

- **Client:** interface, voice interaction, browser-side actions, and presentation.
- **Server:** API routing, chat persistence, input normalization, and provider access.
- **Data:** local JSON storage for prototype chat history.
- **AI:** Groq is accessed from the server so the provider key is not placed in client code.

## Production boundary

The current JSON store and permissive prototype CORS configuration are suitable for local experimentation, not a multi-user deployment. A production version should add authenticated ownership checks, restricted origins, durable storage, rate limiting, validation, and audit logging.
