import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "./useLocalStorage";

const PREFERRED_VOICE_NAMES = ["Microsoft Aria", "Google UK English Female", "Samantha", "Zira"];

export function useSpeechSynthesis() {
  const [voices, setVoices] = useState([]);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useLocalStorage("jarvis-voice-enabled", true);
  const [selectedVoiceUri, setSelectedVoiceUri] = useLocalStorage("jarvis-voice-uri", "");

  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    function loadVoices() {
      setVoices(window.speechSynthesis.getVoices());
    }

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported]);

  const resolvedVoice = useMemo(() => {
    if (!voices.length) {
      return null;
    }

    return (
      voices.find((voice) => voice.voiceURI === selectedVoiceUri) ||
      voices.find((voice) => PREFERRED_VOICE_NAMES.some((name) => voice.name.includes(name))) ||
      voices.find((voice) => /en-/i.test(voice.lang)) ||
      voices[0]
    );
  }, [selectedVoiceUri, voices]);

  const stop = useCallback(() => {
    if (!isSupported) {
      return;
    }

    window.speechSynthesis.cancel();
    setSpeakingMessageId(null);
  }, [isSupported]);

  const speak = useCallback(
    (text, messageId) => {
      if (!isSupported || !voiceEnabled || !String(text || "").trim()) {
        return;
      }

      stop();

      const utterance = new SpeechSynthesisUtterance(String(text).trim());

      if (resolvedVoice) {
        utterance.voice = resolvedVoice;
      }

      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onstart = () => {
        setSpeakingMessageId(messageId || "speaking");
      };
      utterance.onend = () => {
        setSpeakingMessageId(null);
      };
      utterance.onerror = () => {
        setSpeakingMessageId(null);
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSupported, resolvedVoice, stop, voiceEnabled]
  );

  return {
    isSupported,
    voiceEnabled,
    setVoiceEnabled,
    voices,
    selectedVoiceUri,
    setSelectedVoiceUri,
    speakingMessageId,
    speak,
    stop
  };
}
