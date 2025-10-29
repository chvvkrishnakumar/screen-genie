import { useRef, useEffect, useState } from "react";
import { ChatInterface } from "./ChatInterface";
import { enablePIPScreenProtection } from "../utils/screenProtection";
import { Message } from "../contexts/SharedChatContext";
import { useAISession } from "../hooks/useAISession";
import { TTSProvider } from "../contexts/TTSContext";
import Tesseract from "tesseract.js";

// Type definitions for Chrome AI APIs
declare global {
  interface Window {
    LanguageModel?: any;
    ai?: {
      languageModel?: any;
      summarizer?: any;
      writer?: any;
      rewriter?: any;
      translator?: any;
      canCreateGenericSession?: () => boolean;
    };
  }
}

// Message interface moved to ChatContext

interface PIPAppProps {
  onClose: () => void;
  sharedScreenStream?: MediaStream | null;
  hasMainScreenAccess?: boolean;
  // Shared state from main window
  sharedMessages: Message[];
  sharedIsThinking: boolean;
  sharedLoadingStage: string;
  onAddMessage: (type: Message["type"], content: string, id?: number) => void;
  onUpdateMessage: (id: number, content: string) => void;
  onClearConversation: () => void;
  onSetIsThinking: (thinking: boolean) => void;
  onSetLoadingStage: (stage: string) => void;
  onScreenToggle?: () => Promise<void>;
  buildCleanConversationContext: () => string;
}

export const PIPApp: React.FC<PIPAppProps> = ({
  onClose,
  sharedScreenStream,
  hasMainScreenAccess = false,
  // Shared state props
  sharedMessages: initialMessages,
  sharedIsThinking: initialIsThinking,
  sharedLoadingStage: initialLoadingStage,
  onAddMessage,
  onUpdateMessage,
  onClearConversation,
  onSetIsThinking,
  onSetLoadingStage,
  onScreenToggle,
  buildCleanConversationContext,
}) => {
  // Local state that syncs with main window
  const [localMessages, setLocalMessages] = useState(initialMessages);
  const [localIsThinking, setLocalIsThinking] = useState(initialIsThinking);
  const [localLoadingStage, setLocalLoadingStage] =
    useState(initialLoadingStage);
  // Use shared screen access state from main window (no local state needed)
  const hasScreenAccess = hasMainScreenAccess;

  const screenStreamRef = useRef<MediaStream | null>(null);
  const protectionCleanup = useRef<(() => void) | null>(null);

  // AI session management
  const { getOrCreateSession, recreateSession, destroySession } =
    useAISession();

  // Sync state with main window through callbacks
  useEffect(() => {
    setLocalMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    setLocalIsThinking(initialIsThinking);
  }, [initialIsThinking]);

  useEffect(() => {
    setLocalLoadingStage(initialLoadingStage);
  }, [initialLoadingStage]);

  // Wrapper functions that update both local state and main window
  const handleAddMessage = (
    type: Message["type"],
    content: string,
    id?: number
  ) => {
    const newMessage: Message = {
      type,
      content,
      timestamp: new Date(),
      id: id || Date.now(),
    };
    setLocalMessages((prev) => [...prev, newMessage]);
    onAddMessage(type, content, id);
  };

  const handleUpdateMessage = (id: number, content: string) => {
    setLocalMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, content } : msg))
    );
    onUpdateMessage(id, content);
  };

  const handleSetIsThinking = (thinking: boolean) => {
    setLocalIsThinking(thinking);
    onSetIsThinking(thinking);
  };

  const handleSetLoadingStage = (stage: string) => {
    setLocalLoadingStage(stage);
    onSetLoadingStage(stage);
  };

  const handleClearConversation = () => {
    const initialMessage: Message = {
      id: Date.now(),
      type: "system",
      content:
        "🎯 AI Screen Assistant is ready! I can help with questions and tasks.",
      timestamp: new Date(),
    };
    setLocalMessages([initialMessage]);
    // Destroy current session when clearing conversation
    destroySession();
    onClearConversation();
  };

  useEffect(() => {
    // Enable screen capture protection for PIP only
    protectionCleanup.current = enablePIPScreenProtection();

    // Use shared screen access instead of requesting new permission
    const initScreenAccess = () => {
      if (sharedScreenStream && hasMainScreenAccess) {
        screenStreamRef.current = sharedScreenStream;
        // Don't show screen access message - it's already established
      }
      // Don't show any initialization messages - the shared chat state already has the conversation
    };

    initScreenAccess();

    return () => {
      // Clean up screen protection
      if (protectionCleanup.current) {
        protectionCleanup.current();
      }
      // Clean up screen stream
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      // Clean up AI session
      destroySession();
    };
  }, [sharedScreenStream, hasMainScreenAccess]);

  // Helper to grab a frame from active video stream
  const captureFrame = async (stream: MediaStream): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = async () => {
        try {
          await video.play().catch(() => {}); // ensure metadata is available
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          ctx.drawImage(video, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch (err) {
          reject(err);
        }
      };

      video.onerror = (e) => reject(e);
    });
  };

  const captureScreen = async (): Promise<string | null> => {
    if (!hasScreenAccess || !screenStreamRef.current) return null;

    const tracks = screenStreamRef.current.getTracks();
    if (tracks.length === 0 || tracks?.[0]?.readyState === "ended") {
      // Stream ended - PIP window cannot request new permissions, need main window to handle this
      console.log(
        "Screen stream ended in PIP window - screen sharing may need to be restarted from main window"
      );
      return null;
    }

    return await captureFrame(screenStreamRef.current);
  };

  // const captureScreen = async (): Promise<string | null> => {
  //   try {
  //     // Only request new permission if we don't have access
  //     if (!hasScreenAccess || !screenStreamRef.current) {
  //       return null; // Don't request again - use cached permission
  //     }

  //     // Check if stream is still active
  //     const tracks = screenStreamRef.current.getTracks();
  //     if (tracks.length === 0 || tracks[0].readyState === "ended") {
  //       // Stream ended, try to request again
  //       const granted = await requestScreenAccess();
  //       if (!granted) return null;
  //     }

  //     // Create video element to capture current frame
  //     const video = document.createElement("video");
  //     video.srcObject = screenStreamRef.current!;
  //     video.muted = true;
  //     video.playsInline = true;
  //     video.play();

  //     return new Promise((resolve) => {
  //       video.onloadedmetadata = () => {
  //         const canvas = document.createElement("canvas");
  //         canvas.width = video.videoWidth;
  //         canvas.height = video.videoHeight;

  //         const ctx = canvas.getContext("2d");
  //         if (ctx) {
  //           ctx.drawImage(video, 0, 0);
  //           const dataUrl = canvas.toDataURL("image/png");
  //           resolve(dataUrl);
  //         } else {
  //           resolve(null);
  //         }
  //       };

  //       video.onerror = (error) => {
  //         resolve(null);
  //       };
  //     });
  //   } catch (error) {
  //     console.error("Screen capture error:", error);
  //     return null;
  //   }
  // };

  // Handle screen toggle - delegate to main window
  const handleScreenToggle = async () => {
    if (onScreenToggle) {
      await onScreenToggle();
    }
  };

  const extractTextFromImageOCR = async (
    imageDataUrl: string
  ): Promise<string> => {
    try {
      handleSetLoadingStage("🔍 Reading text from your screen");
      const {
        data: { text },
      } = await Tesseract.recognize(imageDataUrl, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            handleSetLoadingStage(
              `🔍 Reading text ${Math.round(m.progress * 100)}%`
            );
          }
        },
      });
      return text.trim();
    } catch (error) {
      console.error("OCR Error:", error);
      return "";
    }
  };

  // addMessage and updateMessage are now provided by useChatContext()

  // const handleUserQuery = async (query: string) => {
  //   if (!query.trim()) return;

  //   addMessage("user", query);
  //   setInputText("");
  //   setIsThinking(true);

  //   // Only capture screen if access is available
  //   let screenshot: string | null = null;
  //   if (hasScreenAccess) {
  //     setLoadingStage("📸 Capturing your screen...");
  //     screenshot = await captureScreen();
  //     setLoadingStage("🧠 AI is analyzing your screen...");
  //   } else {
  //     setLoadingStage("🧠 AI is thinking...");
  //   }

  //   try {
  //     // Use streaming approach with or without screenshot
  //     await handleStreamingResponse(query, screenshot);
  //   } catch (error) {
  //     console.error("Query handling error:", error);
  //     setIsThinking(false);
  //     setLoadingStage("");
  //     addMessage(
  //       "error",
  //       `Error: ${error instanceof Error ? error.message : "Unknown error"}`
  //     );
  //   }
  // };

  const handleUserQuery = async (query: string) => {
    if (!query.trim()) return;

    handleAddMessage("user", query);
    handleSetIsThinking(true);

    let screenshot: string | null = null;

    if (hasScreenAccess) {
      handleSetLoadingStage("📸 Capturing your screen");
      screenshot = await captureScreen(); // ✅ fresh capture every query
      handleSetLoadingStage("🧠 AI is analyzing your screen");
    } else {
      handleSetLoadingStage("🧠 AI is thinking");
    }

    try {
      await handleStreamingResponse(query, screenshot);
    } catch (error) {
      console.error("Query handling error:", error);
      handleSetIsThinking(false);
      handleSetLoadingStage("");
      handleAddMessage(
        "error",
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  const handleStreamingResponse = async (
    query: string,
    screenshot: string | null
  ) => {
    try {
      // Check if Chrome AI APIs are available
      if (typeof window.LanguageModel === "undefined") {
        throw new Error(
          "Chrome AI not available. Please use Chrome Canary with AI features enabled."
        );
      }

      const availability = await window.LanguageModel.availability();
      if (availability !== "available") {
        throw new Error(
          `AI Status: ${availability}. Please wait for the model to download.`
        );
      }

      let response = "";
      let messageId: number | null = null;

      try {
        // Try multimodal approach first - create or reuse session
        const systemPrompt = `You are a helpful AI assistant. 

IMPORTANT CAPABILITIES:
${
  hasScreenAccess
    ? `
✓ SCREEN ACCESS IS ENABLED - I can automatically see your screen
✓ I have real-time access to screenshot images 
✓ When you mention "screen", "see", or ask visual questions, I can see your current display
✓ I do NOT need users to paste images - I capture them automatically
✓ I should respond naturally about what I observe on screen when asked
`
    : `
✗ Screen access is disabled - I work in text-only mode
✗ To enable screen viewing, ask the user to click the screen button
`
}

RESPONSE GUIDELINES:
- Be conversational and brief unless detail is requested
- For general questions (jokes, chat), respond normally without mentioning screens
- For screen-related questions ("what do you see", "what's on my screen"), describe what I observe
- Reference conversation history when relevant
- Never ask users to "paste a screenshot" - I can see automatically when screen access is enabled`;

        const session = await getOrCreateSession({
          expectedInputs: [{ type: "image" }],
          systemPrompt,
        });

        if (!session) {
          throw new Error("Failed to create AI session");
        }

        // If we have a screenshot, try to use it
        if (screenshot) {
          // Convert base64 screenshot to blob for the API
          const base64Data = screenshot.split(",")[1];
          if (!base64Data) throw new Error("Invalid screenshot format");
          const byteArray = Uint8Array.from(atob(base64Data), (c) =>
            c.charCodeAt(0)
          );
          const blob = new Blob([byteArray], { type: "image/png" });

          // Append the image to the session
          await session.append([
            {
              role: "user",
              content: [
                {
                  type: "text",
                  value: "Here is a screenshot for context.",
                },
                {
                  type: "image",
                  value: blob,
                },
              ],
            },
          ]);
        }

        // Use streaming with user's query directly
        handleSetLoadingStage("✨ Generating response ");
        const stream = session.promptStreaming(query);

        // Add initial message
        messageId = Date.now();
        handleAddMessage("assistant", "", messageId);

        for await (const chunk of stream) {
          response += chunk;
          handleUpdateMessage(messageId, response);
        }

        // Only disable thinking after streaming is complete
        handleSetIsThinking(false);
        handleSetLoadingStage("");

        console.log("Multimodal prompt successful!");
      } catch (multimodalError) {
        console.log(
          "Multimodal not available, falling back to text-only:",
          multimodalError instanceof Error
            ? multimodalError.message
            : "Unknown error"
        );

        // Recreate session for text-only mode (different configuration)
        const textOnlySystemPrompt = `You are a helpful AI assistant. 

IMPORTANT CAPABILITIES:
${
  hasScreenAccess
    ? `
✓ SCREEN ACCESS IS ENABLED - I can see your screen via OCR text extraction
✓ I have real-time access to screen content as text
✓ When you mention "screen", "see", or ask visual questions, I can describe what I observe
✓ I do NOT need users to paste images - I extract text automatically
✓ I should respond naturally about what I observe on screen when asked
`
    : `
✗ Screen access is disabled - I work in text-only mode
✗ To enable screen viewing, ask the user to click the screen button
`
}

RESPONSE GUIDELINES:
- Be conversational and brief unless detail is requested
- For general questions (jokes, chat), respond normally without mentioning screens
- For screen-related questions ("what do you see", "what's on my screen"), describe what I observe
- Reference conversation history when relevant
- Never ask users to "paste a screenshot" - I can see automatically when screen access is enabled`;

        // Use fallback context only when recreating session for compatibility
        const cleanContextFallback = buildCleanConversationContext();
        const fallbackSystemPrompt = cleanContextFallback
          ? `${textOnlySystemPrompt}\n\nCONVERSATION HISTORY:\n${cleanContextFallback}`
          : textOnlySystemPrompt;

        const session = await recreateSession({
          systemPrompt: fallbackSystemPrompt,
        });

        if (!session) {
          throw new Error("Failed to create fallback AI session");
        }

        let contextText = "";
        if (screenshot) {
          // Use OCR as fallback
          contextText = await extractTextFromImageOCR(screenshot);
          if (contextText) {
            handleSetLoadingStage("✨ Generating response");
          }
        }

        if (!messageId) {
          messageId = Date.now();
          handleAddMessage("assistant", "", messageId);
        }

        const fullQuery = contextText
          ? `Screen content: "${contextText}"\n\nUser question: ${query}`
          : query;
        const stream = session.promptStreaming(fullQuery);

        for await (const chunk of stream) {
          response += chunk;
          handleUpdateMessage(messageId, response);
        }

        // Only disable thinking after streaming is complete
        handleSetIsThinking(false);
        handleSetLoadingStage("");
      }
    } catch (error) {
      console.error("AI Error:", error);
      handleSetIsThinking(false);
      handleSetLoadingStage("");
      handleAddMessage(
        "error",
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  // handleClearConversation already defined above

  return (
    <TTSProvider>
      <div className="h-screen flex flex-col">
        <ChatInterface
          onUserQuery={handleUserQuery}
          isPIPMode={true}
          sharedMessages={localMessages}
          sharedIsThinking={localIsThinking}
          sharedLoadingStage={localLoadingStage}
          hasScreenAccess={hasScreenAccess}
          isListening={false}
        />

        <div className="flex gap-2 p-2 bg-gray-700 border-t border-gray-600">
          <button
            onClick={handleClearConversation}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white border-none rounded cursor-pointer text-sm"
          >
            🗑️ Clear
          </button>
        </div>
      </div>
    </TTSProvider>
  );
};
