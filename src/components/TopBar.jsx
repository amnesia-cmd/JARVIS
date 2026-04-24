import {
  MenuIcon,
  MicIcon,
  PlusIcon,
  SettingsIcon,
  VolumeIcon,
  VolumeOffIcon
} from "./Icons";

export function TopBar({
  activeChat,
  isListening,
  onCreateChat,
  onToggleSidebar,
  onToggleSettings,
  onToggleVoice,
  onToggleListening,
  speechRecognitionSupported,
  voiceEnabled
}) {
  return (
    <header className="relative flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-4 py-4 md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" className="icon-shell md:hidden" onClick={onToggleSidebar}>
          <MenuIcon className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/70">Mission Feed</p>
          <h2 className="mt-1 truncate font-space text-xl text-white">
            {activeChat?.title || "New Chat"}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" className="icon-shell" onClick={onToggleVoice}>
          {voiceEnabled ? (
            <VolumeIcon className="h-5 w-5" />
          ) : (
            <VolumeOffIcon className="h-5 w-5" />
          )}
        </button>

        <button
          type="button"
          className={`icon-shell ${isListening ? "icon-shell-active" : ""}`}
          onClick={onToggleListening}
          disabled={!speechRecognitionSupported}
        >
          <MicIcon className="h-5 w-5" />
        </button>

        <button type="button" className="icon-shell" onClick={onCreateChat}>
          <PlusIcon className="h-5 w-5" />
        </button>

        <button type="button" className="icon-shell" onClick={onToggleSettings}>
          <SettingsIcon className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
