export function TypingIndicator({ label }) {
  return (
    <div className="glass-card flex items-center gap-4 rounded-[24px] border border-cyan-300/12 px-5 py-4 text-slate-200">
      <div className="flex items-end gap-1">
        <span className="typing-dot" />
        <span className="typing-dot [animation-delay:120ms]" />
        <span className="typing-dot [animation-delay:240ms]" />
      </div>
      <span className="text-sm">{label}</span>
    </div>
  );
}
