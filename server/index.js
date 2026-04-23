const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const Groq = require("groq-sdk");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const SYSTEM_PROMPT =
  "You are Jarvis, a highly intelligent, witty, and friendly personal AI assistant. You can help with absolutely anything - coding, writing, research, math, life advice, creative ideas, answering questions, casual conversation, and more. Be concise, smart, and conversational. You are the user's personal assistant, always ready to help with anything they need.";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your_key_here") {
      return res.status(500).json({
        error: "Groq API key is missing. Add a real GROQ_API_KEY to your .env file."
      });
    }

    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Request body must include a non-empty messages array."
      });
    }

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages
      ],
    });

    res.json({ reply: response.choices[0].message.content });

  } catch (err) {
    console.error("Groq API error:", err);
    res.status(500).json({ error: err.message || "Something went wrong." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});