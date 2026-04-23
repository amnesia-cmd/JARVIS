const chatContainer = document.getElementById("chatContainer");
const typingIndicator = document.getElementById("typingIndicator");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const muteToggle = document.getElementById("muteToggle");
const newChatButton = document.getElementById("newChatButton");

const state = {
  messages: [],
  isMuted: false,
  isWaiting: false,
  currentSpeakingMessageId: null,
  voices: []
};

marked.setOptions({
  breaks: true,
  gfm: true
});

function loadVoices() {
  if (!("speechSynthesis" in window)) {
    state.voices = [];
    return;
  }
  state.voices = window.speechSynthesis.getVoices();
}

loadVoices();
if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function autoResizeTextarea() {
  messageInput.style.height = "auto";
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 180)}px`;
}

function formatTimestamp(date = new Date()) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderMarkdown(text) {
  const parsed = window.marked.parse(text || "");
  if (window.DOMPurify) {
    return window.DOMPurify.sanitize(parsed);
  }
  return escapeHtml(text || "").replace(/\n/g, "<br>");
}

function setWaitingState(isWaiting) {
  state.isWaiting = isWaiting;
  messageInput.disabled = isWaiting;
  sendButton.disabled = isWaiting;
  typingIndicator.classList.toggle("hidden", !isWaiting);
}

function updateMuteButton() {
  const icon = muteToggle.querySelector(".button-icon");
  const label = muteToggle.querySelector(".button-label");

  icon.textContent = state.isMuted ? "\u{1F507}" : "\u{1F50A}";
  label.textContent = state.isMuted ? "Voice Off" : "Voice On";
  muteToggle.classList.toggle("active", !state.isMuted);
  muteToggle.setAttribute("aria-pressed", String(!state.isMuted));
}

function setSpeakingIndicator(messageId, isSpeaking) {
  const wave = document.querySelector(`[data-wave-for="${messageId}"]`);
  if (!wave) {
    return;
  }
  wave.classList.toggle("active", isSpeaking);
}

function stopSpeaking() {
  window.speechSynthesis.cancel();
  if (state.currentSpeakingMessageId) {
    setSpeakingIndicator(state.currentSpeakingMessageId, false);
    state.currentSpeakingMessageId = null;
  }
}

function pickFemaleVoice() {
  const preferredVoiceNames = [
    "Google UK English Female",
    "Samantha",
    "Karen",
    "Zira"
  ];

  return (
    state.voices.find((voice) => preferredVoiceNames.includes(voice.name)) ||
    state.voices.find((voice) =>
      /female|woman|zira|samantha|karen|aria|jenny/i.test(voice.name)
    ) ||
    state.voices.find((voice) => /en-/i.test(voice.lang)) ||
    state.voices[0]
  );
}

function speakText(text, messageId) {
  if (state.isMuted || !("speechSynthesis" in window) || !text.trim()) {
    return;
  }

  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text);
  const femaleVoice = pickFemaleVoice();

  if (femaleVoice) {
    utterance.voice = femaleVoice;
  }

  utterance.rate = 1.0;
  utterance.pitch = 1.1;
  utterance.volume = 1.0;
  utterance.onstart = () => {
    state.currentSpeakingMessageId = messageId;
    setSpeakingIndicator(messageId, true);
  };
  utterance.onend = () => {
    setSpeakingIndicator(messageId, false);
    if (state.currentSpeakingMessageId === messageId) {
      state.currentSpeakingMessageId = null;
    }
  };
  utterance.onerror = () => {
    setSpeakingIndicator(messageId, false);
    if (state.currentSpeakingMessageId === messageId) {
      state.currentSpeakingMessageId = null;
    }
  };

  window.speechSynthesis.speak(utterance);
}

function createMessageElement(message) {
  const row = document.createElement("article");
  row.className = `message-row ${message.role}`;

  const contentHtml =
    message.role === "assistant"
      ? renderMarkdown(message.content)
      : `<p>${escapeHtml(message.content)}</p>`;

  const replayButton =
    message.role === "assistant"
      ? `
        <button class="replay-button" type="button" data-replay="${message.id}">
          <span>${"\u{1F508}"}</span>
          <span>Replay</span>
        </button>
      `
      : "";

  row.innerHTML = `
    <div class="avatar-block">
      <div class="avatar">${message.role === "assistant" ? "J" : "U"}</div>
      ${
        message.role === "assistant"
          ? `
          <div class="sound-wave" data-wave-for="${message.id}">
            <span></span>
            <span></span>
            <span></span>
          </div>
        `
          : ""
      }
    </div>
    <div class="message-card">
      <div class="message-content">${contentHtml}</div>
      <div class="message-meta">
        <span>${message.timestamp}</span>
        ${replayButton}
      </div>
    </div>
  `;

  return row;
}

function addMessage(role, content, options = {}) {
  const message = {
    id: options.id || `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    role,
    content,
    timestamp: options.timestamp || formatTimestamp()
  };

  state.messages.push(message);
  chatContainer.appendChild(createMessageElement(message));
  scrollToBottom();
  return message;
}

function resetChat() {
  state.messages = [];
  chatContainer.innerHTML = "";
  setWaitingState(false);
  stopSpeaking();
  messageInput.disabled = false;
  sendButton.disabled = false;
  showWelcomeMessage();
}

async function sendMessage(content) {
  addMessage("user", content);
  setWaitingState(true);
  stopSpeaking();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: state.messages.map(({ role, content: messageContent }) => ({
          role: role === "user" ? "user" : "assistant",
          content: messageContent
        }))
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Jarvis couldn't respond right now.");
    }

    const assistantMessage = addMessage("assistant", data.reply);
    speakText(data.reply, assistantMessage.id);
  } catch (error) {
    const friendlyError =
      "I ran into a connection issue just now. Please check your API key or server connection and try again.";
    const details = error?.message ? `\n\nDetails: ${error.message}` : "";
    const assistantMessage = addMessage("assistant", `${friendlyError}${details}`);
    speakText(friendlyError, assistantMessage.id);
  } finally {
    setWaitingState(false);
    messageInput.focus();
  }
}

function showWelcomeMessage() {
  const welcomeMessage = addMessage(
    "assistant",
    "Hey, I'm Jarvis. Your personal AI. What can I do for you today?"
  );

  setTimeout(() => {
    speakText(welcomeMessage.content, welcomeMessage.id);
  }, 250);
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (state.isWaiting) {
    return;
  }

  const content = messageInput.value.trim();

  if (!content) {
    return;
  }

  messageInput.value = "";
  autoResizeTextarea();
  await sendMessage(content);
});

messageInput.addEventListener("input", autoResizeTextarea);

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

muteToggle.addEventListener("click", () => {
  state.isMuted = !state.isMuted;
  updateMuteButton();

  if (state.isMuted) {
    stopSpeaking();
  }
});

newChatButton.addEventListener("click", () => {
  resetChat();
  messageInput.focus();
});

chatContainer.addEventListener("click", (event) => {
  const button = event.target.closest("[data-replay]");
  if (!button) {
    return;
  }

  const messageId = button.getAttribute("data-replay");
  const message = state.messages.find((item) => item.id === messageId);

  if (message) {
    speakText(message.content, message.id);
  }
});

updateMuteButton();
autoResizeTextarea();
showWelcomeMessage();
