const appShell = document.querySelector(".app-shell");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const chatList = document.getElementById("chatList");
const chatTitle = document.getElementById("chatTitle");
const chatSubtitle = document.getElementById("chatSubtitle");
const menuToggle = document.getElementById("menuToggle");
const chatContainer = document.getElementById("chatContainer");
const typingIndicator = document.getElementById("typingIndicator");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const muteToggle = document.getElementById("muteToggle");
const newChatButton = document.getElementById("newChatButton");

const DEFAULT_CHAT_TITLE = "New Chat";
const MOBILE_BREAKPOINT = 920;

const state = {
  chats: [],
  activeChatId: null,
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

function getActiveChat() {
  return state.chats.find((chat) => chat.id === state.activeChatId) || null;
}

function autoResizeTextarea() {
  messageInput.style.height = "auto";
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 180)}px`;
}

function formatMessageTime(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatChatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
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
  if (!("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();

  if (state.currentSpeakingMessageId) {
    setSpeakingIndicator(state.currentSpeakingMessageId, false);
    state.currentSpeakingMessageId = null;
  }
}

function pickFemaleVoice() {
  const preferredVoiceNames = ["Google UK English Female", "Samantha", "Karen", "Zira"];

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
  if (state.isMuted || !("speechSynthesis" in window) || !String(text || "").trim()) {
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

function closeSidebar() {
  appShell.classList.remove("sidebar-open");
  menuToggle.setAttribute("aria-expanded", "false");
}

function openSidebar() {
  appShell.classList.add("sidebar-open");
  menuToggle.setAttribute("aria-expanded", "true");
}

function syncSidebarState() {
  if (window.innerWidth > MOBILE_BREAKPOINT) {
    appShell.classList.remove("sidebar-open");
    menuToggle.setAttribute("aria-expanded", "false");
  }
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
          <span>\u{1F508}</span>
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
        <span>${formatMessageTime(message.createdAt)}</span>
        ${replayButton}
      </div>
    </div>
  `;

  return row;
}

function renderMessages() {
  const activeChat = getActiveChat();

  chatContainer.innerHTML = "";

  if (!activeChat) {
    chatTitle.textContent = DEFAULT_CHAT_TITLE;
    chatSubtitle.textContent = "Start a conversation to begin.";
    return;
  }

  chatTitle.textContent = activeChat.title || DEFAULT_CHAT_TITLE;
  chatSubtitle.textContent = `Created ${formatChatDate(activeChat.createdAt)}`;

  activeChat.messages.forEach((message) => {
    chatContainer.appendChild(createMessageElement(message));
  });

  scrollToBottom();
}

function renderChatList() {
  if (state.chats.length === 0) {
    chatList.innerHTML = `
      <div class="empty-chats">
        No saved chats yet. Create one and Jarvis will keep the full conversation here.
      </div>
    `;
    return;
  }

  chatList.innerHTML = state.chats
    .map(
      (chat) => `
        <div class="chat-item">
          <button
            class="chat-open ${chat.id === state.activeChatId ? "active" : ""}"
            type="button"
            data-chat-id="${chat.id}"
          >
            <div class="chat-item-content">
              <span class="chat-title">${escapeHtml(chat.title || DEFAULT_CHAT_TITLE)}</span>
              <span class="chat-date">${escapeHtml(formatChatDate(chat.createdAt))}</span>
            </div>
          </button>
          <button
            class="chat-delete"
            type="button"
            aria-label="Delete conversation"
            data-delete-chat="${chat.id}"
          >
            &#128465;
          </button>
        </div>
      `
    )
    .join("");
}

function upsertChat(chat, options = {}) {
  const existingIndex = state.chats.findIndex((item) => item.id === chat.id);

  if (existingIndex >= 0) {
    state.chats.splice(existingIndex, 1);
  }

  if (options.append) {
    state.chats.push(chat);
  } else {
    state.chats.unshift(chat);
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

async function loadChatList() {
  const chats = await requestJson("/api/chats");
  state.chats = Array.isArray(chats) ? chats : [];
  renderChatList();
}

async function loadChat(chatId, options = {}) {
  const chat = await requestJson(`/api/chats/${chatId}`);
  upsertChat(chat);
  state.activeChatId = chat.id;
  renderChatList();
  renderMessages();

  if (options.speakWelcome) {
    const welcomeMessage = chat.messages.find((message) => message.role === "assistant");

    if (welcomeMessage) {
      setTimeout(() => {
        speakText(welcomeMessage.content, welcomeMessage.id);
      }, 250);
    }
  }

  if (window.innerWidth <= MOBILE_BREAKPOINT) {
    closeSidebar();
  }
}

function addMessagesToActiveChat(messages, updatedChat) {
  const activeChat = getActiveChat();

  if (!activeChat) {
    return;
  }

  activeChat.messages = [...activeChat.messages, ...messages];
  activeChat.title = updatedChat.title;
  activeChat.createdAt = updatedChat.createdAt;
  activeChat.updatedAt = updatedChat.updatedAt;
}

async function createNewChat(options = {}) {
  setWaitingState(false);
  stopSpeaking();

  const chat = await requestJson("/api/chats", {
    method: "POST"
  });

  state.activeChatId = chat.id;
  upsertChat(chat);
  renderChatList();
  renderMessages();
  messageInput.focus();

  if (options.speakWelcome) {
    const welcomeMessage = chat.messages.find((message) => message.role === "assistant");

    if (welcomeMessage) {
      setTimeout(() => {
        speakText(welcomeMessage.content, welcomeMessage.id);
      }, 250);
    }
  }

  if (window.innerWidth <= MOBILE_BREAKPOINT) {
    closeSidebar();
  }
}

function addLocalAssistantErrorMessage(content) {
  const activeChat = getActiveChat();

  if (!activeChat) {
    return null;
  }

  const message = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    role: "assistant",
    content,
    createdAt: new Date().toISOString()
  };

  activeChat.messages = [...activeChat.messages, message];
  activeChat.updatedAt = new Date().toISOString();
  renderMessages();
  renderChatList();
  return message;
}

async function sendMessage(content) {
  const activeChat = getActiveChat();

  if (!activeChat || state.isWaiting) {
    return;
  }

  setWaitingState(true);
  stopSpeaking();

  try {
    const data = await requestJson(`/api/chats/${activeChat.id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ content })
    });

    addMessagesToActiveChat([data.userMessage, data.assistantMessage], data.chat);
    state.chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    renderChatList();
    renderMessages();
    speakText(data.assistantMessage.content, data.assistantMessage.id);
  } catch (error) {
    const friendlyError =
      "I ran into a connection issue just now. Please check your API key or server connection and try again.";
    const details = error?.message ? `\n\nDetails: ${error.message}` : "";
    const assistantMessage = addLocalAssistantErrorMessage(`${friendlyError}${details}`);

    if (assistantMessage) {
      speakText(friendlyError, assistantMessage.id);
    }
  } finally {
    setWaitingState(false);
    messageInput.focus();
  }
}

async function deleteChat(chatId) {
  await requestJson(`/api/chats/${chatId}`, {
    method: "DELETE"
  });

  state.chats = state.chats.filter((chat) => chat.id !== chatId);

  if (state.activeChatId === chatId) {
    if (state.chats.length > 0) {
      await loadChat(state.chats[0].id);
    } else {
      await createNewChat();
    }
  } else {
    renderChatList();
  }
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const content = messageInput.value.trim();

  if (!content || state.isWaiting) {
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

newChatButton.addEventListener("click", async () => {
  await createNewChat({ speakWelcome: true });
});

menuToggle.addEventListener("click", () => {
  if (appShell.classList.contains("sidebar-open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

sidebarOverlay.addEventListener("click", closeSidebar);

window.addEventListener("resize", syncSidebarState);

chatList.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest("[data-delete-chat]");

  if (deleteButton) {
    event.stopPropagation();
    const chatId = deleteButton.getAttribute("data-delete-chat");

    if (chatId) {
      await deleteChat(chatId);
    }
    return;
  }

  const chatItem = event.target.closest("[data-chat-id]");
  if (!chatItem) {
    return;
  }

  const chatId = chatItem.getAttribute("data-chat-id");

  if (chatId && chatId !== state.activeChatId) {
    await loadChat(chatId);
  } else if (window.innerWidth <= MOBILE_BREAKPOINT) {
    closeSidebar();
  }
});

chatContainer.addEventListener("click", (event) => {
  const button = event.target.closest("[data-replay]");

  if (!button) {
    return;
  }

  const messageId = button.getAttribute("data-replay");
  const activeChat = getActiveChat();
  const message = activeChat?.messages.find((item) => item.id === messageId);

  if (message) {
    speakText(message.content, message.id);
  }
});

updateMuteButton();
autoResizeTextarea();
syncSidebarState();

(async function initializeChat() {
  try {
    await loadChatList();

    if (state.chats.length > 0) {
      await loadChat(state.chats[0].id);
      return;
    }

    await createNewChat({ speakWelcome: true });
  } catch (error) {
    console.error("Failed to initialize chat UI:", error);
    chatTitle.textContent = "Server Error";
    chatSubtitle.textContent = "Unable to load saved chats.";
  }
})();
