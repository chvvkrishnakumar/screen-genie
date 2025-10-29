import { useRef, useCallback } from 'react';

interface AISessionConfig {
  temperature?: number;
  topK?: number;
  expectedInputs?: { type: string }[];
  outputLanguage?: string;
  systemPrompt?: string;
}

interface AISession {
  append: (messages: any[]) => Promise<void>;
  promptStreaming: (prompt: string) => AsyncIterable<string>;
  destroy: () => void;
}

export const useAISession = () => {
  const sessionRef = useRef<AISession | null>(null);
  const isCreatingRef = useRef(false);

  const createSession = useCallback(async (config: AISessionConfig): Promise<AISession | null> => {
    // Prevent concurrent session creation
    if (isCreatingRef.current) {
      // Wait for existing creation to complete
      while (isCreatingRef.current) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return sessionRef.current;
    }

    try {
      isCreatingRef.current = true;

      // Check if Chrome AI is available
      if (typeof window.LanguageModel === "undefined") {
        throw new Error("Chrome AI not available");
      }

      const availability = await window.LanguageModel.availability();
      if (availability !== "available") {
        throw new Error(`AI Status: ${availability}`);
      }

      const params = await window.LanguageModel.params();
      
      const session = await window.LanguageModel.create({
        temperature: config.temperature ?? params.defaultTemperature,
        topK: config.topK ?? params.defaultTopK,
        expectedInputs: config.expectedInputs,
        outputLanguage: config.outputLanguage ?? "en",
        systemPrompt: config.systemPrompt,
      });

      sessionRef.current = session;
      return session;
    } catch (error) {
      console.error("Failed to create AI session:", error);
      sessionRef.current = null;
      throw error;
    } finally {
      isCreatingRef.current = false;
    }
  }, []);

  const getOrCreateSession = useCallback(async (config: AISessionConfig): Promise<AISession | null> => {
    // Return existing session if available
    if (sessionRef.current) {
      return sessionRef.current;
    }

    // Create new session
    return await createSession(config);
  }, [createSession]);

  const recreateSession = useCallback(async (config: AISessionConfig): Promise<AISession | null> => {
    // Destroy existing session
    if (sessionRef.current) {
      try {
        sessionRef.current.destroy();
      } catch (error) {
        console.warn("Error destroying existing session:", error);
      }
      sessionRef.current = null;
    }

    // Create new session
    return await createSession(config);
  }, [createSession]);

  const destroySession = useCallback(() => {
    if (sessionRef.current) {
      try {
        sessionRef.current.destroy();
      } catch (error) {
        console.warn("Error destroying session:", error);
      }
      sessionRef.current = null;
    }
  }, []);

  const hasSession = useCallback(() => {
    return sessionRef.current !== null;
  }, []);

  return {
    getOrCreateSession,
    recreateSession,
    destroySession,
    hasSession,
  };
};