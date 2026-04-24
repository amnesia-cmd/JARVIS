const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

export function fetchChats() {
  return requestJson("/api/chats");
}

export function fetchChat(chatId) {
  return requestJson(`/api/chats/${chatId}`);
}

export function createChat() {
  return requestJson("/api/chats", {
    method: "POST"
  });
}

export function sendMessage(chatId, payload) {
  return requestJson(`/api/chats/${chatId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function deleteChat(chatId) {
  return requestJson(`/api/chats/${chatId}`, {
    method: "DELETE"
  });
}
