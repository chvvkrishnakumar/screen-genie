import { useState, useCallback, useEffect, useRef } from "react";

interface SpeechSettings {
  rate: number;
  pitch: number;
  volume: number;
  voice: SpeechSynthesisVoice | null;
}

interface UseSpeechSynthesisReturn {
  speak: (text: string, messageId?: number) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  settings: SpeechSettings;
  updateSettings: (newSettings: Partial<SpeechSettings>) => void;
  currentText: string;
  currentMessageId: number | null;
}

const defaultSettings: SpeechSettings = {
  rate: 0.8, // Even slower, more natural speech
  pitch: 1.0, // Natural pitch
  volume: 0.8, // Slightly reduced volume for warmth
  voice: null,
};

export const useSpeechSynthesis = (): UseSpeechSynthesisReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settings, setSettings] = useState<SpeechSettings>(defaultSettings);
  const [currentText, setCurrentText] = useState("");
  const [currentMessageId, setCurrentMessageId] = useState<number | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  // Load voices when component mounts or voices change
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);

      // Set default voice to best quality female English voice
      if (availableVoices.length > 0) {
        // Debug: Log available voices to see what we have
        console.log("Available voices:", availableVoices.map(v => `${v.name} (${v.lang})`));
        
        // Force female voice selection - prioritize natural sounding voices
        const femaleVoice = 
          // Try Samantha first (macOS - most natural sounding)
          availableVoices.find((voice) => voice.name === "Samantha" && voice.lang.startsWith("en")) ||
          // Try Catherine (Australian - natural sounding)
          availableVoices.find((voice) => voice.name === "Catherine (en-AU)") ||
          // Try Karen (Australian)
          availableVoices.find((voice) => voice.name === "Karen (en-AU)") ||
          // Try Kathy (US)
          availableVoices.find((voice) => voice.name === "Kathy (en-US)") ||
          // Try Victoria if available
          availableVoices.find((voice) => voice.name.startsWith("Victoria") && voice.lang.startsWith("en")) ||
          // Avoid Flo as it might be robotic - try any other female voice
          availableVoices.find((voice) => 
            voice.lang.startsWith("en") && 
            (voice.name.includes("Catherine") || voice.name.includes("Karen") || voice.name.includes("Kathy"))
          );

        console.log("Selected female voice:", femaleVoice?.name);
        
        // Force set this voice every time
        setSettings((prev) => ({
          ...prev,
          voice: femaleVoice || availableVoices.find((voice) => voice.lang.startsWith("en")) || availableVoices[0],
        }));

        // Pre-warm the speech synthesis with the selected voice
        const selectedVoice = femaleVoice || availableVoices.find((voice) => voice.lang.startsWith("en")) || availableVoices[0];
        if (selectedVoice) {
          const warmUpUtterance = new SpeechSynthesisUtterance("");
          warmUpUtterance.voice = selectedVoice;
          warmUpUtterance.volume = 0; // Silent warm-up
          warmUpUtterance.rate = 0.8;
          speechSynthesis.speak(warmUpUtterance);
          setTimeout(() => speechSynthesis.cancel(), 10); // Quick cancel
        }
      }
    };

    loadVoices();

    // Voices might load asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isSupported, settings.voice]);

  // Clean text by removing markdown, technical jargon, and making it more conversational
  const cleanText = useCallback((text: string): string => {
    if (!text || typeof text !== "string") return "";

    return (
      text
        // Remove emojis first - fastest operation
        .replace(
          /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
          ""
        )

        // Remove image references quickly
        .replace(
          /(?:Here is a screenshot for context\.|Based on the screenshot[^.]*\.|In the image[^,]*,?|Looking at (?:the )?(?:screen|image)[^,]*,?|From (?:the )?(?:screenshot|image)[^,]*,?)/g,
          ""
        )
        .replace(
          /I can see (?:in )?(?:the )?(?:screenshot|image)[^,]*,?/g,
          "I can see "
        )

        // Fast markdown removal - handle asterisks first
        .replace(/#{1,6}\s+/g, "")
        .replace(/\*\*(.*?)\*\*/g, "$1") // Bold: **text** → text
        .replace(/\*(.*?)\*/g, "$1") // Italic: *text* → text
        .replace(/\*/g, "") // Remove any remaining asterisks
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")

        // Handle code blocks better - don't read backticks
        .replace(/```[\s\S]*?```/g, "code block")
        .replace(/`([^`]+)`/g, (_, code) => {
          // Clean up the code content first
          const cleanCode = code.trim();

          // If it's a simple command or short code, speak it naturally
          if (cleanCode.length < 30) {
            // Common patterns that should be spoken naturally
            if (
              /^[a-zA-Z0-9\-_.]+$/.test(cleanCode) || // Simple commands like npm, git, etc.
              /^[a-zA-Z]+\s+[a-zA-Z0-9\-_.]+$/.test(cleanCode)
            ) {
              // Command with simple args
              return cleanCode;
            }
          }

          // For longer or complex code, just say "code"
          return "code";
        })

        // Quick conversational replacements
        .replace(
          /\b(?:However|Furthermore|Additionally|Moreover|It appears that|It seems that|Note that|Please note)\b/g,
          ""
        )
        .replace(/\b(?:Therefore|Thus|Hence|Consequently)\b/g, "So")
        .replace(/\bIn order to\b/g, "To")

        // Fast cleanup
        .replace(/\[\w+\]/g, "")
        .replace(/\b(?:Click|Press|Navigate to|Select)\b/g, "")
        .replace(/\s*,\s*,/g, ",")
        .replace(/\.\s*\./g, ".")
        .replace(/\s+/g, " ")
        .replace(/^\s*,\s*/g, "")
        .replace(/\s*,\s*$/g, ".")
        .trim()
    );
  }, []);

  const speak = useCallback(
    (text: string, messageId?: number) => {
      if (!isSupported || !text.trim()) return;

      const cleanedText = cleanText(text);
      if (!cleanedText.trim()) return;

      // Force immediate cancellation - no delays
      speechSynthesis.cancel();

      // Set current message being spoken
      setCurrentMessageId(messageId || null);
      setCurrentText(cleanedText);

      // Create utterance with optimized settings
      const utterance = new SpeechSynthesisUtterance(cleanedText);

      // Optimized settings for speed and clarity
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;

      if (settings.voice) {
        utterance.voice = settings.voice;
      }

      // Force specific language for faster loading
      utterance.lang = settings.voice?.lang || "en-US";

      // Pre-load voice to reduce lag
      if (settings.voice && utterance.voice !== settings.voice) {
        utterance.voice = settings.voice;
      }

      // Optimized event handlers
      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentText("");
        setCurrentMessageId(null);
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentText("");
        setCurrentMessageId(null);
      };

      utterance.onpause = () => {
        setIsPaused(true);
      };

      utterance.onresume = () => {
        setIsPaused(false);
      };

      utteranceRef.current = utterance;

      // Immediate speech start - no delays
      speechSynthesis.speak(utterance);
    },
    [isSupported, settings, cleanText]
  );

  const stop = useCallback(() => {
    if (!isSupported) return;

    speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentText("");
    setCurrentMessageId(null);
  }, [isSupported]);

  const pause = useCallback(() => {
    if (!isSupported || !isSpeaking) return;

    speechSynthesis.pause();
    setIsPaused(true);
  }, [isSupported, isSpeaking]);

  const resume = useCallback(() => {
    if (!isSupported || !isPaused) return;

    speechSynthesis.resume();
    setIsPaused(false);
  }, [isSupported, isPaused]);

  const updateSettings = useCallback((newSettings: Partial<SpeechSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    settings,
    updateSettings,
    currentText,
    currentMessageId,
  };
};
