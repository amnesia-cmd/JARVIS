import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

export function ChatView({
  messages,
  pending,
  pendingLabel,
  speakingMessageId,
  onReplay,
  bootstrapError
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, pending]);

  return (
    <section ref={scrollRef} className="relative h-full overflow-y-auto px-4 pb-8 pt-5 md:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        {messages.length === 0 ? (
          <div className="glass-card px-6 py-8 text-sm text-slate-300">
            Start a new conversation and Jarvis will keep everything in your sidebar automatically.
          </div>
        ) : null}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isSpeaking={speakingMessageId === message.id}
            onReplay={onReplay}
          />
        ))}

        {pending ? <TypingIndicator label={pendingLabel} /> : null}

        {bootstrapError ? (
          <div className="glass-card border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
            {bootstrapError}
          </div>
        ) : null}
      </div>
    </section>
  );
}
