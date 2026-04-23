const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const Groq = require("groq-sdk");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const CHAT_FILE_PATH = path.join(__dirname, "chats.json");
const SYSTEM_PROMPT =
  "You are Jarvis, a highly intelligent, witty, and friendly personal AI assistant. You can help with absolutely anything - coding, writing, research, math, life advice, creative ideas, answering questions, casual conversation, and more. Be concise, smart, and conversational. You are the user's personal assistant, always ready to help with anything they need.";
const DEFAULT_WELCOME_MESSAGE = "Hey, I'm Jarvis. Your personal AI. What can I do for you today?";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

function generateId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function createMessage(role, content) {
  return {
    id: generateId(),
    role,
    content,
    createdAt: new Date().toISOString()
  };
}

function truncateTitle(text) {
  const sanitized = String(text || "").replace(/\s+/g, " ").trim();

  if (!sanitized) {
    return "New Chat";
  }

  return sanitized.length > 30 ? `${sanitized.slice(0, 30)}...` : sanitized;
}

function createChat() {
  const now = new Date().toISOString();

  return {
    id: generateId(),
    title: "New Chat",
    messages: [createMessage("assistant", DEFAULT_WELCOME_MESSAGE)],
    createdAt: now,
    updatedAt: now
  };
}

function ensureChatFile() {
  if (!fs.existsSync(CHAT_FILE_PATH)) {
    fs.writeFileSync(CHAT_FILE_PATH, JSON.stringify([], null, 2));
  }
}

function normalizeMessage(message) {
  if (
    !message ||
    (message.role !== "user" && message.role !== "assistant") ||
    typeof message.content !== "string"
  ) {
    return null;
  }

  return {
    id: typeof message.id === "string" && message.id.trim() ? message.id : generateId(),
    role: message.role,
    content: message.content,
    createdAt:
      typeof message.createdAt === "string" && message.createdAt.trim()
        ? message.createdAt
        : new Date().toISOString()
  };
}

function normalizeChat(chat) {
  const createdAt =
    typeof chat?.createdAt === "string" && chat.createdAt.trim()
      ? chat.createdAt
      : new Date().toISOString();
  const normalizedMessages = Array.isArray(chat?.messages)
    ? chat.messages.map(normalizeMessage).filter(Boolean)
    : [];
  const firstUserMessage = normalizedMessages.find((message) => message.role === "user");

  return {
    id: typeof chat?.id === "string" && chat.id.trim() ? chat.id : generateId(),
    title:
      typeof chat?.title === "string" && chat.title.trim()
        ? truncateTitle(chat.title)
        : truncateTitle(firstUserMessage?.content),
    messages: normalizedMessages,
    createdAt,
    updatedAt:
      typeof chat?.updatedAt === "string" && chat.updatedAt.trim() ? chat.updatedAt : createdAt
  };
}

function readChats() {
  ensureChatFile();

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
    console.error("Failed to read chats.json, recreating it.", error);
    fs.writeFileSync(CHAT_FILE_PATH, JSON.stringify([], null, 2));
    return [];
  }
}

function writeChats(chats) {
  ensureChatFile();
  fs.writeFileSync(CHAT_FILE_PATH, JSON.stringify(chats, null, 2));
}

function getChatSummary(chat) {
  return {
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt
  };
}

async function generateAssistantReply(messages) {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your_key_here") {
    const error = new Error("Groq API key is missing. Add a real GROQ_API_KEY to your .env file.");
    error.statusCode = 500;
    throw error;
  }

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages]
  });

  return completion.choices?.[0]?.message?.content?.trim() || "I don't have a response right now.";
}

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
  const newChat = createChat();

  chats.unshift(newChat);
  writeChats(chats);

  res.status(201).json(newChat);
});

app.post("/api/chats/:id/messages", async (req, res) => {
  const { content } = req.body;

  if (typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "Request body must include message content." });
  }

  const chats = readChats();
  const chatIndex = chats.findIndex((item) => item.id === req.params.id);

  if (chatIndex === -1) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  const chat = chats[chatIndex];
  const userMessage = createMessage("user", content.trim());
  chat.messages.push(userMessage);

  const firstUserMessage = chat.messages.find((message) => message.role === "user");
  if (firstUserMessage) {
    chat.title = truncateTitle(firstUserMessage.content);
  }

  try {
    const assistantReply = await generateAssistantReply(
      chat.messages.map(({ role, content: messageContent }) => ({
        role,
        content: messageContent
      }))
    );
    const assistantMessage = createMessage("assistant", assistantReply);
    const now = new Date().toISOString();

    chat.messages.push(assistantMessage);
    chat.updatedAt = now;
    chats.splice(chatIndex, 1);
    chats.unshift(chat);
    writeChats(chats);

    return res.json({
      chat: getChatSummary(chat),
      userMessage,
      assistantMessage
    });
  } catch (error) {
    console.error("Groq API error:", error);

    const friendlyError =
      "I ran into a connection issue just now. Please check your API key or server connection and try again.";
    const details = error?.message ? `\n\nDetails: ${error.message}` : "";
    const assistantMessage = createMessage("assistant", `${friendlyError}${details}`);
    const now = new Date().toISOString();

    chat.messages.push(assistantMessage);
    chat.updatedAt = now;
    chats.splice(chatIndex, 1);
    chats.unshift(chat);
    writeChats(chats);

    return res.json({
      chat: getChatSummary(chat),
      userMessage,
      assistantMessage
    });
  }
});

app.delete("/api/chats/:id", (req, res) => {
  const chats = readChats();
  const nextChats = chats.filter((item) => item.id !== req.params.id);

  if (nextChats.length === chats.length) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  writeChats(nextChats);
  return res.json({ ok: true });
});

app.listen(PORT, () => {
  ensureChatFile();
  console.log(`Server running on port ${PORT}`);
});
