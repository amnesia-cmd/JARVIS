import { ReplayIcon } from "./Icons";
import { formatMessageTime } from "../utils/formatters";

export function MessageBubble({ message, isSpeaking, onReplay }) {
  const assistant = message.role === "assistant";

  return (
    <article className={`flex gap-3 ${assistant ? "" : "justify-end"}`}>
      {assistant ? (
        <div className="avatar-shell avatar-shell-assistant">
          <span>J</span>
        </div>
      ) : null}

      <div
        className={`message-card w-full max-w-3xl ${
          assistant
            ? "border border-cyan-400/15 bg-white/8"
            : "border border-white/10 bg-[linear-gradient(135deg,rgba(255,151,77,0.18),rgba(255,255,255,0.08))]"
        }`}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
              {assistant ? "Jarvis" : "You"}
            </p>
            {message.type === "command" ? (
              <p className="mt-2 inline-flex rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-100">
                Browser command
              </p>
            ) : null}
            {message.type === "image" ? (
              <p className="mt-2 inline-flex rounded-full border border-amber-300/15 bg-amber-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-amber-100">
                Image result
              </p>
            ) : null}
          </div>

          {assistant ? (
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs text-slate-200 transition ${
                isSpeaking
                  ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
              }`}
              onClick={() => onReplay(message)}
            >
              <ReplayIcon className="h-4 w-4" />
              {isSpeaking ? "Speaking" : "Replay"}
            </button>
          ) : null}
        </div>

        <div className="space-y-4">
          <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-100">{message.content}</p>

          {Array.isArray(message.attachments)
            ? message.attachments.map((attachment, index) => (
                <div key={`${message.id}-${index}`} className="overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/40">
                  <img
                    src={attachment.url}
                    alt={attachment.alt || "Generated asset"}
                    className="h-auto w-full object-cover"
                  />
                </div>
              ))
            : null}
        </div>

        <div className="mt-4 text-xs text-slate-400">{formatMessageTime(message.createdAt)}</div>
      </div>

      {!assistant ? (
        <div className="avatar-shell avatar-shell-user">
          <span>U</span>
        </div>
      ) : null}
    </article>
  );
}
