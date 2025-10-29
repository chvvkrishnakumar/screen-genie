import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

interface TTSSettings {
  autoSpeak: boolean;
  rate: number;
  pitch: number;
  volume: number;
  voice: SpeechSynthesisVoice | null;
}

interface TTSContextType {
  // TTS functionality
  speak: (text: string, messageId?: number) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  
  // State
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  currentText: string;
  currentMessageId: number | null;
  
  // Settings
  settings: TTSSettings;
  updateSettings: (newSettings: Partial<TTSSettings>) => void;
  
  // Voice management
  voices: SpeechSynthesisVoice[];
  
  // Auto-speak functionality
  speakAIResponse: (text: string) => void;
  toggleAutoSpeak: () => void;
}

const TTSContext = createContext<TTSContextType | undefined>(undefined);

export const useTTSContext = () => {
  const context = useContext(TTSContext);
  if (context === undefined) {
    throw new Error('useTTSContext must be used within a TTSProvider');
  }
  return context;
};

interface TTSProviderProps {
  children: ReactNode;
}

const defaultSettings: TTSSettings = {
  autoSpeak: false,
  rate: 1.3, // Faster speech for better flow
  pitch: 1.05, // Slightly higher pitch for clarity
  volume: 1, // Full volume for clarity
  voice: null,
};

export const TTSProvider: React.FC<TTSProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<TTSSettings>(defaultSettings);
  
  const {
    speak: synthSpeak,
    stop: synthStop,
    pause: synthPause,
    resume: synthResume,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    updateSettings: updateSynthSettings,
    currentText,
    currentMessageId,
  } = useSpeechSynthesis();

  // Update speech synthesis settings when TTS settings change
  const updateSettings = useCallback((newSettings: Partial<TTSSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      // Update speech synthesis settings
      updateSynthSettings({
        rate: updated.rate,
        pitch: updated.pitch,
        volume: updated.volume,
        voice: updated.voice,
      });
      
      return updated;
    });
  }, [updateSynthSettings]);

  // Initialize voice settings when voices are loaded
  React.useEffect(() => {
    if (voices.length > 0 && !settings.voice) {
      const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
      if (englishVoice) {
        updateSettings({ voice: englishVoice });
      }
    }
  }, [voices, settings.voice, updateSettings]);

  const speak = useCallback((text: string, messageId?: number) => {
    if (!text.trim()) return;
    synthSpeak(text, messageId);
  }, [synthSpeak]);

  const stop = useCallback(() => {
    synthStop();
  }, [synthStop]);

  const pause = useCallback(() => {
    synthPause();
  }, [synthPause]);

  const resume = useCallback(() => {
    synthResume();
  }, [synthResume]);

  // Auto-speak AI responses if enabled
  const speakAIResponse = useCallback((text: string) => {
    if (settings.autoSpeak && text.trim()) {
      // Stop any current speech before speaking new response
      synthStop();
      // Small delay to ensure clean transition
      setTimeout(() => {
        synthSpeak(text);
      }, 100);
    }
  }, [settings.autoSpeak, synthStop, synthSpeak]);

  const toggleAutoSpeak = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      autoSpeak: !prev.autoSpeak
    }));
    
    // Stop speaking when auto-speak is disabled
    if (settings.autoSpeak) {
      synthStop();
    }
  }, [settings.autoSpeak, synthStop]);

  const value: TTSContextType = {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    currentText,
    currentMessageId,
    settings,
    updateSettings,
    voices,
    speakAIResponse,
    toggleAutoSpeak,
  };

  return <TTSContext.Provider value={value}>{children}</TTSContext.Provider>;
};