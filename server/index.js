const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const Groq = require("groq-sdk");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, "..", "data");
const CHAT_FILE_PATH = path.join(DATA_DIR, "chats.json");
const LEGACY_CHAT_FILE_PATH = path.join(__dirname, "chats.json");
const DIST_DIR = path.join(__dirname, "..", "dist");
const DIST_INDEX = path.join(DIST_DIR, "index.html");

const DEFAULT_CHAT_TITLE = "New Chat";
const DEFAULT_WELCOME_MESSAGE =
  "Hello, I'm Jarvis. I can chat, listen, speak, open websites, search the web, summarize this page, and create mock AI images right inside your browser.";
const SYSTEM_PROMPT = [
  "You are Jarvis, a polished browser-based AI assistant inspired by Alexa.",
  "Be concise, clear, and helpful.",
  "Prefer short spoken-friendly sentences unless the user asks for detail.",
  "If the user asks for commands like opening sites or searching the web, the browser client may execute that action for you, so respond naturally without claiming you clicked anything yourself.",
  "If the user asks for image generation, describe the result briefly and enthusiastically."
].join(" ");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json({ limit: "2mb" }));

function generateId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function safeString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function truncateTitle(text) {
  const sanitized = safeString(text).replace(/\s+/g, " ").trim();

  if (!sanitized) {
    return DEFAULT_CHAT_TITLE;
  }

  return sanitized.length > 40 ? `${sanitized.slice(0, 40)}...` : sanitized;
}

function ensureChatStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (fs.existsSync(CHAT_FILE_PATH)) {
    return;
  }

  if (fs.existsSync(LEGACY_CHAT_FILE_PATH)) {
    fs.copyFileSync(LEGACY_CHAT_FILE_PATH, CHAT_FILE_PATH);
    return;
  }

  fs.writeFileSync(CHAT_FILE_PATH, JSON.stringify([], null, 2));
}

function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .map((attachment) => {
      if (!attachment || typeof attachment !== "object") {
        return null;
      }

      if (attachment.type !== "image" || typeof attachment.url !== "string") {
        return null;
      }

      return {
        type: "image",
        url: attachment.url,
        alt: safeString(attachment.alt, "Generated image")
      };
    })
    .filter(Boolean);
}

function normalizeMessage(rawMessage) {
  if (!rawMessage || typeof rawMessage !== "object") {
    return null;
  }

  const role = ["user", "assistant", "system"].includes(rawMessage.role)
    ? rawMessage.role
    : null;
  const content = safeString(rawMessage.content).trim();

  if (!role || !content) {
    return null;
  }

  const type = ["text", "image", "command", "status"].includes(rawMessage.type)
    ? rawMessage.type
    : rawMessage.attachments?.length
      ? "image"
      : "text";
  const createdAt =
    typeof rawMessage.createdAt === "string" && rawMessage.createdAt.trim()
      ? rawMessage.createdAt
      : new Date().toISOString();

  return {
    id: safeString(rawMessage.id, generateId()),
    role,
    type,
    content,
    createdAt,
    attachments: normalizeAttachments(rawMessage.attachments),
    metadata:
      rawMessage.metadata && typeof rawMessage.metadata === "object" ? rawMessage.metadata : {}
  };
}

function createMessage(role, content, extra = {}) {
  return normalizeMessage({
    id: generateId(),
    role,
    content,
    type: extra.type || "text",
    attachments: extra.attachments || [],
    metadata: extra.metadata || {},
    createdAt: new Date().toISOString()
  });
}

function normalizeChat(rawChat) {
  const messages = Array.isArray(rawChat?.messages)
    ? rawChat.messages.map(normalizeMessage).filter(Boolean)
    : [];
  const firstUserMessage = messages.find((message) => message.role === "user");
  const createdAt =
    typeof rawChat?.createdAt === "string" && rawChat.createdAt.trim()
      ? rawChat.createdAt
      : new Date().toISOString();
  const updatedAt =
    typeof rawChat?.updatedAt === "string" && rawChat.updatedAt.trim()
      ? rawChat.updatedAt
      : createdAt;

  return {
    id: safeString(rawChat?.id, generateId()),
    title: truncateTitle(rawChat?.title || firstUserMessage?.content),
    createdAt,
    updatedAt,
    messages
  };
}

function readChats() {
  ensureChatStore();

  try {
    const raw = fs.readFileSync(CHAT_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error("Chat store must be an array.");
    }

    const chats = parsed.map(normalizeChat).sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    writeChats(chats);
    return chats;
  } catch (error) {
    console.error("Failed to read chats. Recreating store.", error);
    fs.writeFileSync(CHAT_FILE_PATH, JSON.stringify([], null, 2));
    return [];
  }
}

function writeChats(chats) {
  ensureChatStore();
  fs.writeFileSync(CHAT_FILE_PATH, JSON.stringify(chats, null, 2));
}

function buildPreview(message) {
  if (!message) {
    return "No messages yet";
  }

  if (message.type === "image") {
    return `Image: ${message.metadata?.prompt || message.content}`;
  }

  if (message.type === "command") {
    return `Command: ${message.content}`;
  }

  return safeString(message.content).slice(0, 110);
}

function getChatSummary(chat) {
  const lastMessage = chat.messages[chat.messages.length - 1];

  return {
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    preview: buildPreview(lastMessage),
    messageCount: chat.messages.length
  };
}

function createChat() {
  const now = new Date().toISOString();

  return {
    id: generateId(),
    title: DEFAULT_CHAT_TITLE,
    createdAt: now,
    updatedAt: now,
    messages: [createMessage("assistant", DEFAULT_WELCOME_MESSAGE)]
  };
}

function updateChatTitle(chat) {
  const firstUserMessage = chat.messages.find((message) => message.role === "user");
  chat.title = truncateTitle(firstUserMessage?.content);
}

function extractImagePrompt(content, mode) {
  const text = safeString(content).trim();

  if (!text) {
    return "";
  }

  if (mode === "image") {
    return text
      .replace(/^(create|generate|make|design|draw)(?: me)?(?: an?| the)? image(?: of)?\s+/i, "")
      .trim();
  }

  const match = text.match(
    /^(?:create|generate|make|design|draw)(?: me)?(?: an?| the)? image(?: of)?\s+(.+)$/i
  );

  return match ? match[1].trim() : "";
}

function hashString(input) {
  return Array.from(input).reduce((total, char) => total + char.charCodeAt(0), 0);
}

function buildMockImageDataUrl(prompt) {
  const colorSeed = hashString(prompt || "jarvis");
  const hueA = colorSeed % 360;
  const hueB = (colorSeed * 1.7) % 360;
  const hueC = (colorSeed * 2.2) % 360;
  const safePrompt = safeString(prompt, "AI concept render").slice(0, 90);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="768" viewBox="0 0 1280 768">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="hsl(${hueA} 80% 16%)" />
          <stop offset="55%" stop-color="hsl(${hueB} 85% 10%)" />
          <stop offset="100%" stop-color="hsl(${hueC} 90% 20%)" />
        </linearGradient>
        <radialGradient id="glowA" cx="25%" cy="30%" r="40%">
          <stop offset="0%" stop-color="hsla(${hueB} 95% 68% / 0.95)" />
          <stop offset="100%" stop-color="hsla(${hueB} 95% 68% / 0)" />
        </radialGradient>
        <radialGradient id="glowB" cx="72%" cy="58%" r="32%">
          <stop offset="0%" stop-color="hsla(${hueC} 95% 72% / 0.7)" />
          <stop offset="100%" stop-color="hsla(${hueC} 95% 72% / 0)" />
        </radialGradient>
      </defs>
      <rect width="1280" height="768" fill="url(#bg)" />
      <rect width="1280" height="768" fill="url(#glowA)" />
      <rect width="1280" height="768" fill="url(#glowB)" />
      <g opacity="0.22">
        <circle cx="1040" cy="150" r="180" fill="none" stroke="white" stroke-width="1.5" />
        <circle cx="990" cy="610" r="220" fill="none" stroke="white" stroke-width="1.2" />
        <path d="M120 610 C360 420 540 460 790 250" fill="none" stroke="white" stroke-width="2" />
      </g>
      <rect x="72" y="72" width="1136" height="624" rx="36" fill="rgba(7, 12, 24, 0.32)" stroke="rgba(255,255,255,0.16)" />
      <text x="112" y="186" fill="white" font-family="Space Grotesk, Arial, sans-serif" font-size="28" opacity="0.72">JARVIS IMAGE LAB</text>
      <text x="112" y="268" fill="white" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="62" font-weight="700">${safePrompt}</text>
      <text x="112" y="334" fill="rgba(255,255,255,0.78)" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="28">Mock cinematic render generated locally for rapid prototyping</text>
      <g transform="translate(112 452)">
        <rect width="282" height="168" rx="28" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.18)" />
        <circle cx="74" cy="78" r="34" fill="rgba(255,255,255,0.16)" />
        <path d="M36 128 C90 84 152 94 238 38" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="4" />
      </g>
      <g transform="translate(448 420)">
        <rect width="656" height="204" rx="36" fill="rgba(5,10,20,0.28)" stroke="rgba(255,255,255,0.14)" />
        <text x="44" y="70" fill="rgba(255,255,255,0.78)" font-family="Space Grotesk, Arial, sans-serif" font-size="24">Prompt</text>
        <text x="44" y="122" fill="white" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="34">${safePrompt}</text>
        <text x="44" y="170" fill="rgba(255,255,255,0.72)" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="22">Swap this mock generator for a real image API whenever you are ready.</text>
      </g>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createImageMessage(prompt) {
  const normalizedPrompt = safeString(prompt, "A futuristic concept scene").trim();
  const imageUrl = buildMockImageDataUrl(normalizedPrompt);

  return createMessage(
    "assistant",
    `Image generated for "${normalizedPrompt}". You can keep iterating on the prompt to refine the look.`,
    {
      type: "image",
      attachments: [
        {
          type: "image",
          url: imageUrl,
          alt: normalizedPrompt
        }
      ],
      metadata: {
        prompt: normalizedPrompt,
        provider: "mock-image-engine"
      }
    }
  );
}

async function generateAssistantReply(messages) {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your_groq_api_key_here") {
    return [
      "Jarvis is online, but conversational AI needs a `GROQ_API_KEY` in your `.env` file.",
      "Browser commands, voice controls, chat history, and mock image generation are still available."
    ].join(" ");
  }

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    max_tokens: 1024,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages]
  });

  return completion.choices?.[0]?.message?.content?.trim() || "I don't have a response right now.";
}

function getChatIndex(chats, chatId) {
  return chats.findIndex((chat) => chat.id === chatId);
}

function moveChatToTop(chats, chatIndex) {
  const [chat] = chats.splice(chatIndex, 1);
  chats.unshift(chat);
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/chats", (req, res) => {
  const chats = readChats().map(getChatSummary);
  res.json(chats);
});

app.get("/api/chats/:id", (req, res) => {
  const chats = readChats();
  const chat = chats.find((item) => item.id === req.params.id);

  if (!chat) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  return res.json(chat);
});

app.post("/api/chats", (req, res) => {
  const chats = readChats();
  const chat = createChat();

  chats.unshift(chat);
  writeChats(chats);

  res.status(201).json(chat);
});

app.post("/api/chats/:id/messages", async (req, res) => {
  const content = safeString(req.body?.content).trim();
  const mode = safeString(req.body?.mode, "chat");

  if (!content) {
    return res.status(400).json({ error: "Request body must include message content." });
  }

  const chats = readChats();
  const chatIndex = getChatIndex(chats, req.params.id);

  if (chatIndex === -1) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  const chat = chats[chatIndex];
  const userMessage = createMessage("user", content);
  chat.messages.push(userMessage);
  updateChatTitle(chat);

  let assistantMessage = null;

  try {
    const clientAssistantMessage = normalizeMessage({
      role: "assistant",
      ...req.body?.assistantMessage
    });

    if (clientAssistantMessage) {
      assistantMessage = clientAssistantMessage;
    } else {
      const imagePrompt = extractImagePrompt(req.body?.prompt || content, mode);

      if (mode === "image" || imagePrompt) {
        assistantMessage = createImageMessage(imagePrompt || content);
      } else {
        const reply = await generateAssistantReply(
          chat.messages
            .filter((message) => message.role === "user" || message.role === "assistant")
            .map((message) => ({
              role: message.role,
              content: message.content
            }))
        );

        assistantMessage = createMessage("assistant", reply);
      }
    }
  } catch (error) {
    console.error("Failed to process message:", error);
    assistantMessage = createMessage(
      "assistant",
      "I hit a connection issue while finishing that request. Please check your API key or server connection and try again."
    );
  }

  chat.messages.push(assistantMessage);
  chat.updatedAt = new Date().toISOString();
  chats[chatIndex] = chat;
  moveChatToTop(chats, chatIndex);
  writeChats(chats);

  return res.json({
    chat: getChatSummary(chat),
    userMessage,
    assistantMessage
  });
});

app.delete("/api/chats/:id", (req, res) => {
  const chats = readChats();
  const nextChats = chats.filter((chat) => chat.id !== req.params.id);

  if (nextChats.length === chats.length) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  writeChats(nextChats);
  res.json({ ok: true });
});

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));

  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(DIST_INDEX);
  });
}

app.listen(PORT, () => {
  ensureChatStore();
  console.log(`Jarvis server listening on http://localhost:${PORT}`);
});
