import { PlusIcon, TrashIcon } from "./Icons";
import { formatSidebarDate } from "../utils/formatters";

export function Sidebar({
  chats,
  activeChatId,
  isOpen,
  onClose,
  onCreateChat,
  onDeleteChat,
  onSelectChat
}) {
  return (
    <>
      <aside
        className={`glass-sidebar fixed inset-y-3 left-3 z-40 w-[300px] rounded-[28px] border border-white/10 p-4 transition md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-[120%]"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/70">Jarvis Core</p>
            <h1 className="mt-2 font-space text-2xl text-white">Assistant Console</h1>
          </div>

          <button type="button" className="icon-shell md:hidden" onClick={onClose}>
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>

        <button type="button" className="mt-5 flex w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,rgba(71,247,216,0.92),rgba(255,151,77,0.86))] px-4 py-3 font-medium text-slate-950 shadow-[0_20px_45px_rgba(71,247,216,0.22)] transition hover:-translate-y-0.5" onClick={onCreateChat}>
          <PlusIcon className="h-4 w-4" />
          New Chat
        </button>

        <div className="mt-6 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-400">
          <span>Saved chats</span>
          <span>{chats.length}</span>
        </div>

        <div className="mt-4 flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {chats.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-white/12 bg-white/4 px-4 py-5 text-sm text-slate-400">
              Start a new conversation and it will appear here automatically.
            </div>
          ) : null}

          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`rounded-[22px] border p-3 transition ${
                chat.id === activeChatId
                  ? "border-cyan-300/25 bg-cyan-300/10"
                  : "border-white/8 bg-white/5 hover:border-white/16 hover:bg-white/8"
              }`}
            >
              <button type="button" className="w-full text-left" onClick={() => onSelectChat(chat.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{chat.title}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-400">{chat.preview || "Open the chat to continue."}</p>
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    {formatSidebarDate(chat.updatedAt)}
                  </span>
                </div>
              </button>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{chat.messageCount || 0} messages</span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-1 transition hover:border-rose-300/20 hover:bg-rose-400/10 hover:text-rose-100"
                  onClick={() => onDeleteChat(chat.id)}
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {isOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-label="Close chat history"
        />
      ) : null}
    </>
  );
}
