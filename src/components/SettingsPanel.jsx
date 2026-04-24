import { MicIcon, VolumeIcon } from "./Icons";

export function SettingsPanel({
  voiceSupported,
  voiceEnabled,
  voices,
  selectedVoiceUri,
  onSelectVoice,
  onToggleVoice,
  speechRecognitionSupported
}) {
  return (
    <div className="glass-card w-[320px] rounded-[24px] border border-white/12 p-5 shadow-2xl">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Settings</p>
        <h3 className="mt-2 font-space text-xl text-white">Voice Studio</h3>
      </div>

      <div className="space-y-4 text-sm">
        <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-white">
                <VolumeIcon className="h-4 w-4" />
                Speech output
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Enable or mute Jarvis voice replies.
              </p>
            </div>

            <button
              type="button"
              className={`inline-flex h-8 w-14 rounded-full border transition ${
                voiceEnabled ? "border-cyan-300/30 bg-cyan-300/25" : "border-white/10 bg-white/10"
              }`}
              onClick={onToggleVoice}
            >
              <span
                className={`m-1 h-5 w-5 rounded-full bg-white transition ${
                  voiceEnabled ? "translate-x-6" : ""
                }`}
              />
            </button>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Voice selection</span>
          <select
            value={selectedVoiceUri}
            onChange={(event) => onSelectVoice(event.target.value)}
            disabled={!voiceSupported || voices.length === 0}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/35"
          >
            <option value="">Automatic voice</option>
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-2xl border border-white/8 bg-white/5 p-4 text-xs text-slate-300">
          <div className="flex items-center gap-2 text-white">
            <MicIcon className="h-4 w-4" />
            Voice input
          </div>
          <p className="mt-2">
            {speechRecognitionSupported
              ? "Speech recognition is available. Use Ctrl + Shift + M or the mic button to start listening."
              : "Speech recognition is not available in this browser. Speech synthesis can still work if voices are installed."}
          </p>
        </div>
      </div>
    </div>
  );
}
