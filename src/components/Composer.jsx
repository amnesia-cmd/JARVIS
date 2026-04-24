import { useEffect, useRef } from "react";
import { ImageSparkIcon, MicIcon, SendIcon, StarsIcon } from "./Icons";

export function Composer({
  draft,
  onDraftChange,
  onSend,
  pending,
  mode,
  onModeChange,
  isListening,
  onMicClick,
  speechRecognitionSupported,
  listeningText
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [draft]);

  return (
    <div className="border-t border-white/10 bg-[linear-gradient(180deg,rgba(5,8,22,0),rgba(5,8,22,0.92)_32%)] px-4 pb-4 pt-3 md:px-8 md:pb-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`mode-chip ${mode === "assistant" ? "mode-chip-active" : ""}`}
            onClick={() => onModeChange("assistant")}
          >
            <StarsIcon className="h-4 w-4" />
            Assist
          </button>

          <button
            type="button"
            className={`mode-chip ${mode === "image" ? "mode-chip-active image-chip" : ""}`}
            onClick={() => onModeChange("image")}
          >
            <ImageSparkIcon className="h-4 w-4" />
            Generate Image
          </button>

          <span className="text-xs text-slate-400">
            Try "open youtube", "search for neon glassmorphism", or "summarize this page".
          </span>
        </div>

        <div className="glass-card flex items-end gap-3 rounded-[26px] border border-white/10 px-4 py-3 md:px-5">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            rows={1}
            placeholder={
              mode === "image"
                ? "Describe the image you want Jarvis to create..."
                : "Ask Jarvis anything..."
            }
            className="min-h-[56px] flex-1 resize-none bg-transparent py-3 text-[15px] leading-7 text-white outline-none placeholder:text-slate-500"
            disabled={pending}
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`icon-shell ${isListening ? "icon-shell-active" : ""}`}
              onClick={onMicClick}
              disabled={!speechRecognitionSupported}
              title={speechRecognitionSupported ? "Start voice input" : "Speech recognition unavailable"}
            >
              <MicIcon className="h-5 w-5" />
            </button>

            <button type="button" className="send-shell" onClick={onSend} disabled={pending}>
              <SendIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
          <span>{listeningText || "Keyboard shortcut: Ctrl + Shift + M for voice input"}</span>
          <span>{pending ? "Jarvis is working..." : "Persistent chat history is enabled"}</span>
        </div>
      </div>
    </div>
  );
}
