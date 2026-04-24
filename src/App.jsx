import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createChat,
  deleteChat,
  fetchChat,
  fetchChats,
  sendMessage as postMessage
} from "./api/client";
import { ChatView } from "./components/ChatView";
import { Composer } from "./components/Composer";
import { SettingsPanel } from "./components/SettingsPanel";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "./hooks/useSpeechSynthesis";
import { detectIntent } from "./utils/commandHandlers";

function sortChats(chats) {
  return [...chats].sort((left, right) => {
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

function mergeChat(existingChats, incomingChat) {
  const previous = existingChats.find((chat) => chat.id === incomingChat.id);
  const nextChat = {
    ...previous,
    ...incomingChat,
    messages: incomingChat.messages || previous?.messages || []
  };

  return sortChats([nextChat, ...existingChats.filter((chat) => chat.id !== incomingChat.id)]);
}

export default function App() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [draft, setDraft] = useState("");
  const [composerMode, setComposerMode] = useLocalStorage("jarvis-composer-mode", "assistant");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [activityLabel, setActivityLabel] = useState("Jarvis is thinking");
  const [bootstrapError, setBootstrapError] = useState("");

  const settingsRef = useRef(null);

  const activeChat = useMemo(() => {
    return chats.find((chat) => chat.id === activeChatId) || null;
  }, [activeChatId, chats]);

  const {
    isSupported: voiceSupported,
    voiceEnabled,
    setVoiceEnabled,
    voices,
    selectedVoiceUri,
    setSelectedVoiceUri,
    speakingMessageId,
    speak,
    stop: stopSpeaking
  } = useSpeechSynthesis();

  const upsertChat = useCallback((chat) => {
    setChats((currentChats) => mergeChat(currentChats, chat));
  }, []);

  const updateChatWithResponse = useCallback((chatSummary, userMessage, assistantMessage) => {
    setChats((currentChats) => {
      const currentChat = currentChats.find((chat) => chat.id === chatSummary.id);
      const nextChat = {
        ...currentChat,
        ...chatSummary,
        messages: [...(currentChat?.messages || []), userMessage, assistantMessage]
      };

      return sortChats([
        nextChat,
        ...currentChats.filter((chat) => chat.id !== chatSummary.id)
      ]);
    });
  }, []);

  const ensureFreshChatLoaded = useCallback(async (chatId) => {
    const fullChat = await fetchChat(chatId);
    upsertChat(fullChat);
    setActiveChatId(fullChat.id);
  }, [upsertChat]);

  const handleSend = useCallback(
    async (rawValue, options = {}) => {
      const content = rawValue.trim();

      if (!content || pending || !activeChatId) {
        return;
      }

      setPending(true);
      setBootstrapError("");
      stopSpeaking();

      const intent = detectIntent(content, composerMode);
      setActivityLabel(
        intent.kind === "image" ? "Rendering your concept art" : "Jarvis is thinking"
      );

      try {
        let payload = { content, mode: intent.kind === "image" ? "image" : "chat" };

        if (intent.kind === "image") {
          payload = {
            ...payload,
            prompt: intent.prompt
          };
        }

        if (intent.kind === "command") {
          const commandResult = await intent.handler.execute({
            text: content,
            window,
            document
          });

          payload = {
            content,
            mode: "chat",
            assistantMessage: {
              content: commandResult.message,
              type: "command",
              metadata: commandResult.metadata
            }
          };
        }

        const response = await postMessage(activeChatId, payload);
        updateChatWithResponse(response.chat, response.userMessage, response.assistantMessage);

        if (voiceEnabled) {
          const speechText =
            intent.kind === "image"
              ? `Your image for ${intent.prompt || content} is ready.`
              : response.assistantMessage.content;

          speak(speechText, response.assistantMessage.id);
        }

        if (!options.fromVoice) {
          setDraft("");
        }
      } catch (error) {
        setBootstrapError(error.message || "Jarvis ran into a request error.");
      } finally {
        setPending(false);
      }
    },
    [activeChatId, composerMode, pending, speak, stopSpeaking, updateChatWithResponse, voiceEnabled]
  );

  const sendTranscript = useCallback(
    async (transcript) => {
      const cleaned = transcript.trim();

      if (!cleaned) {
        return;
      }

      await handleSend(cleaned, { fromVoice: true });
    },
    [handleSend]
  );

  const {
    isSupported: speechRecognitionSupported,
    isListening,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening
  } = useSpeechRecognition({
    onFinalTranscript: sendTranscript
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const summaries = await fetchChats();

        if (cancelled) {
          return;
        }

        if (summaries.length === 0) {
          const freshChat = await createChat();

          if (!cancelled) {
            setChats([freshChat]);
            setActiveChatId(freshChat.id);
          }

          return;
        }

        setChats(summaries);
        await ensureFreshChatLoaded(summaries[0].id);
      } catch (error) {
        if (!cancelled) {
          setBootstrapError(error.message || "Unable to load Jarvis.");
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [ensureFreshChatLoaded]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setSettingsOpen(false);
      }
    }

    function handleShortcut(event) {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "m") {
        event.preventDefault();

        if (speechRecognitionSupported) {
          if (isListening) {
            stopListening();
          } else {
            startListening();
          }
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleShortcut);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleShortcut);
    };
  }, [isListening, speechRecognitionSupported, startListening, stopListening]);

  async function handleCreateChat() {
    stopSpeaking();
    setPending(false);
    setBootstrapError("");
    const chat = await createChat();
    setChats((currentChats) => mergeChat(currentChats, chat));
    setActiveChatId(chat.id);
    setSidebarOpen(false);
  }

  async function handleSelectChat(chatId) {
    await ensureFreshChatLoaded(chatId);
    setSidebarOpen(false);
  }

  async function handleDeleteChat(chatId) {
    await deleteChat(chatId);

    const remainingChats = chats.filter((chat) => chat.id !== chatId);
    setChats(remainingChats);

    if (activeChatId === chatId) {
      if (remainingChats.length > 0) {
        await ensureFreshChatLoaded(remainingChats[0].id);
      } else {
        await handleCreateChat();
      }
    }
  }

  const listeningText = isListening
    ? interimTranscript || "Listening for your command..."
    : speechError;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060816] text-white">
      <div className="aurora-bg" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(91,250,212,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,151,77,0.16),transparent_24%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1680px] gap-4 px-3 py-3 md:gap-6 md:px-6 md:py-5">
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onCreateChat={handleCreateChat}
          onDeleteChat={handleDeleteChat}
          onSelectChat={handleSelectChat}
        />

        <main className="glass-panel relative flex min-h-[calc(100vh-1.5rem)] flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10">
          <TopBar
            activeChat={activeChat}
            isListening={isListening}
            onCreateChat={handleCreateChat}
            onToggleSidebar={() => setSidebarOpen((open) => !open)}
            onToggleSettings={() => setSettingsOpen((open) => !open)}
            onToggleVoice={() => setVoiceEnabled((enabled) => !enabled)}
            onToggleListening={() => {
              if (isListening) {
                stopListening();
              } else {
                startListening();
              }
            }}
            speechRecognitionSupported={speechRecognitionSupported}
            voiceEnabled={voiceEnabled}
          />

          <div className="relative flex-1 overflow-hidden">
            {settingsOpen ? (
              <div className="absolute right-4 top-4 z-30 md:right-6" ref={settingsRef}>
                <SettingsPanel
                  speechRecognitionSupported={speechRecognitionSupported}
                  voiceEnabled={voiceEnabled}
                  voices={voices}
                  voiceSupported={voiceSupported}
                  selectedVoiceUri={selectedVoiceUri}
                  onSelectVoice={setSelectedVoiceUri}
                  onToggleVoice={() => setVoiceEnabled((enabled) => !enabled)}
                />
              </div>
            ) : null}

            <ChatView
              messages={activeChat?.messages || []}
              pending={pending}
              pendingLabel={activityLabel}
              speakingMessageId={speakingMessageId}
              onReplay={(message) => speak(message.content, message.id)}
              bootstrapError={bootstrapError}
            />
          </div>

          <Composer
            draft={draft}
            onDraftChange={setDraft}
            onSend={() => handleSend(draft)}
            pending={pending}
            mode={composerMode}
            onModeChange={setComposerMode}
            isListening={isListening}
            onMicClick={() => {
              if (isListening) {
                stopListening();
              } else {
                startListening();
              }
            }}
            speechRecognitionSupported={speechRecognitionSupported}
            listeningText={listeningText}
          />
        </main>
      </div>
    </div>
  );
}
