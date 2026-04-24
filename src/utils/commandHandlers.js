const SITE_MAP = {
  youtube: "https://youtube.com",
  google: "https://google.com",
  github: "https://github.com",
  gmail: "https://mail.google.com",
  spotify: "https://open.spotify.com"
};

function summarizeText(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return "I couldn't find enough readable content on this page to summarize.";
  }

  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  const summary = sentences.slice(0, 3).join(" ");

  if (summary) {
    return `Here's a quick summary of this page: ${summary}`;
  }

  return `Here's a quick summary of this page: ${cleaned.slice(0, 300)}${cleaned.length > 300 ? "..." : ""}`;
}

function resolveOpenTarget(target) {
  const normalized = target.trim().toLowerCase();

  if (SITE_MAP[normalized]) {
    return {
      url: SITE_MAP[normalized],
      label: normalized
    };
  }

  if (/^[a-z0-9-]+\.[a-z]{2,}$/i.test(normalized)) {
    return {
      url: `https://${normalized}`,
      label: normalized
    };
  }

  return null;
}

const handlers = [
  {
    id: "open-site",
    match(text) {
      const match = text.match(/^open\s+(.+)$/i);

      if (!match) {
        return null;
      }

      return resolveOpenTarget(match[1]);
    },
    async execute({ text, window }) {
      const target = this.match(text);

      if (!target) {
        return {
          message: "I can open known sites like YouTube, Google, GitHub, Gmail, Spotify, or direct domains such as example.com.",
          metadata: {
            action: "open_url_unresolved"
          }
        };
      }

      const openedWindow = window.open(target.url, "_blank", "noopener,noreferrer");
      const blocked = !openedWindow;

      return {
        message: blocked
          ? `I tried to open ${target.label}, but the browser blocked the popup.`
          : `Opening ${target.label} in a new tab.`,
        metadata: {
          action: "open_url",
          url: target.url,
          blocked
        }
      };
    }
  },
  {
    id: "search-google",
    match(text) {
      const match = text.match(/^(?:search for|google)\s+(.+)$/i);
      return match ? { query: match[1].trim() } : null;
    },
    async execute({ text, window }) {
      const result = this.match(text);
      const url = `https://www.google.com/search?q=${encodeURIComponent(result.query)}`;
      const openedWindow = window.open(url, "_blank", "noopener,noreferrer");

      return {
        message: openedWindow
          ? `Searching Google for "${result.query}".`
          : `I prepared a Google search for "${result.query}", but the browser blocked the new tab.`,
        metadata: {
          action: "search_google",
          query: result.query,
          url
        }
      };
    }
  },
  {
    id: "summarize-page",
    match(text) {
      return /^summari[sz]e this page$/i.test(text.trim()) ? {} : null;
    },
    async execute({ document }) {
      const pageText = document?.body?.innerText || "";

      return {
        message: summarizeText(pageText),
        metadata: {
          action: "summarize_page"
        }
      };
    }
  }
];

export function extractImagePrompt(text, mode) {
  const trimmed = String(text || "").trim();

  if (!trimmed) {
    return "";
  }

  if (mode === "image") {
    return trimmed.replace(
      /^(?:create|generate|make|design|draw)(?: me)?(?: an?| the)? image(?: of)?\s+/i,
      ""
    );
  }

  const match = trimmed.match(
    /^(?:create|generate|make|design|draw)(?: me)?(?: an?| the)? image(?: of)?\s+(.+)$/i
  );

  return match ? match[1].trim() : "";
}

export function detectIntent(text, mode) {
  const imagePrompt = extractImagePrompt(text, mode);

  if (mode === "image" || imagePrompt) {
    return {
      kind: "image",
      prompt: imagePrompt || text.trim()
    };
  }

  for (const handler of handlers) {
    if (handler.match(text)) {
      return {
        kind: "command",
        handler
      };
    }
  }

  return {
    kind: "chat"
  };
}
