import { useState, useEffect, useRef } from "react";
import { marked } from "marked";
import { useNavigate } from "react-router-dom";
import { useScreenCapture } from "../hooks/useScreenCapture";
import { useChromeAI } from "../hooks/useChromeAI";
import { useReactPIP } from "../hooks/useReactPIP";
import { useWindowFocus } from "../hooks/useWindowFocus";
import { useAISession } from "../hooks/useAISession";
import { PIPApp } from "../components/PIPApp";
import { ChatInterface } from "../components/ChatInterface";
import { enableScreenProtection } from "../utils/screenProtection";
import { useSharedChatContext, SharedChatProvider } from "../contexts/SharedChatContext";
import { useScreenContext, ScreenProvider } from "../contexts/ScreenContext";
import { useAppContext, AppProvider } from "../contexts/AppContext";
import { useTTSContext } from "../contexts/TTSContext";

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false,
});

export const ChatPage = () => {
  const navigate = useNavigate();
  const {
    messages,
    inputText,
    isThinking,
    loadingStage,
    setInputText,
    setIsThinking,
    setLoadingStage,
    addMessage,
    updateMessage,
    clearConversation,
    buildCleanConversationContext,
  } = useSharedChatContext();

  const {
    hasScreenAccess,
    currentScreenshot,
    setHasScreenAccess,
    setCurrentScreenshot,
  } = useScreenContext();

  const {
    isFloating,
    autoFloatEnabled,
    setIsFloating,
    setAutoFloatEnabled,
  } = useAppContext();

  const { speakAIResponse, stop: stopTTS } = useTTSContext();
  const protectionCleanup = useRef<(() => void) | null>(null);

  // Custom hooks
  const { requestScreenAccess, silentCapture, hasAccess, getStream, stopCapture } =
    useScreenCapture({ excludeOwnWindow: true });
  const { isReady: aiReady, status: aiStatus } = useChromeAI();
  const { isOpen: pipIsOpen, openPIPWindow, closePIPWindow } = useReactPIP();
  
  // AI session management
  const { getOrCreateSession, recreateSession, destroySession } = useAISession();
  
  // Auto-floating window detection (bi-directional)
  useWindowFocus({
    pipIsOpen,
    onWindowBlur: () => {
      if (!pipIsOpen && hasScreenAccess && autoFloatEnabled) {
        console.log('✅ Calling toggleSystemPIP() for auto-open');
        toggleSystemPIP();
      }
    },
    onWindowFocus: () => {
      if (pipIsOpen && autoFloatEnabled) {
        console.log('Auto-closing floating window due to window focus');
        toggleSystemPIP();
      }
    },
    debounceMs: 1500,
  });

  useEffect(() => {
    // Check if AI is ready, if not redirect to home
    if (!aiReady && aiStatus === "not-available") {
      navigate("/");
      return;
    }

    // Enable lightweight screen protection
    protectionCleanup.current = enableScreenProtection();

    return () => {
      if (protectionCleanup.current) {
        protectionCleanup.current();
      }
      // Clean up AI session
      destroySession();
    };
  }, [aiReady, aiStatus, navigate]);

  const handleUserQuery = async (query: string) => {
    if (!query.trim()) return;

    // Stop any current TTS when user sends new query
    stopTTS();

    addMessage("user", query);
    setInputText("");
    setIsThinking(true);

    // Only capture screen if user has enabled screen access
    let screenshot: string | null = null;
    if (hasScreenAccess && hasAccess()) {
      setLoadingStage("📸 Capturing your screen...");
      screenshot = await silentCapture();
      if (screenshot) {
        setCurrentScreenshot(screenshot);
      }
      setLoadingStage("🧠 AI is analyzing your screen...");
    } else {
      setLoadingStage("🧠 AI is thinking...");
    }

    try {
      if (!aiReady) {
        setIsThinking(false);
        setLoadingStage("");
        addMessage("error", "AI not ready. Please wait for model to load.");
        return;
      }

      // Create system prompt that clearly states capabilities
      const systemPrompt = `You are a helpful AI assistant. 

IMPORTANT CAPABILITIES:
${hasScreenAccess ? `
✓ SCREEN ACCESS IS ENABLED - I can automatically see your screen
✓ I have real-time access to screenshot images 
✓ When you mention "screen", "see", or ask visual questions, I can see your current display
✓ I do NOT need users to paste images - I capture them automatically
✓ I should respond naturally about what I observe on screen when asked
` : `
✗ Screen access is disabled - I work in text-only mode
✗ To enable screen viewing, ask the user to click "📸 Enable Screen" button
`}

RESPONSE GUIDELINES:
- Be conversational and brief unless detail is requested
- For general questions (jokes, chat), respond normally without mentioning screens
- For screen-related questions ("what do you see", "what's on my screen"), describe what I observe
- Reference conversation history when relevant
- Never ask users to "paste a screenshot" - I can see automatically when screen access is enabled`;

      // Try multimodal approach first if we have a screenshot
      let session = null;
      if (screenshot && hasScreenAccess) {
        try {
          // Get or create persistent session with multimodal support
          session = await getOrCreateSession({
            expectedInputs: [{ type: "image" }],
            systemPrompt,
          });

          if (session) {
            // Convert base64 screenshot to blob for the API
            const base64Data = screenshot.split(",")[1];
            if (base64Data) {
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
          }
        } catch (multimodalError) {
          console.log("Multimodal not available, falling back to text-only:", multimodalError);
          session = null;
        }
      }

      // If multimodal failed or no screenshot, use text-only session
      if (!session) {
        // Get or create persistent session for text-only
        session = await getOrCreateSession({
          systemPrompt,
        });

        if (!session) {
          // If session creation fails, try with fallback context
          const cleanContext = buildCleanConversationContext();
          const fallbackSystemPrompt = cleanContext 
            ? `${systemPrompt}\n\nCONVERSATION HISTORY:\n${cleanContext}`
            : systemPrompt;

          session = await recreateSession({
            systemPrompt: fallbackSystemPrompt,
          });

          if (!session) {
            setIsThinking(false);
            setLoadingStage("");
            addMessage("error", "Failed to create AI session");
            return;
          }
        }
      }

      try {
        // Use streaming for real-time responses
        setLoadingStage("✨ Generating response...");
        
        const stream = session.promptStreaming(query);

        // Add initial message
        const messageId = Date.now();
        addMessage("assistant", "", messageId);

        let response = "";
        for await (const chunk of stream) {
          response += chunk;
          updateMessage(messageId, response);
        }

        // Only disable thinking state after streaming is complete
        setIsThinking(false);
        setLoadingStage("");

        // Trigger TTS for the complete AI response
        if (response.trim()) {
          speakAIResponse(response);
        }

        console.log("AI response completed successfully!");
      } catch (error) {
        console.error("AI streaming error:", error);
        setIsThinking(false);
        setLoadingStage("");
        
        // If session fails, try recreating with fallback context
        try {
          const cleanContext = buildCleanConversationContext();
          const fallbackSystemPrompt = cleanContext 
            ? `${systemPrompt}\n\nCONVERSATION HISTORY:\n${cleanContext}`
            : systemPrompt;

          const fallbackSession = await recreateSession({
            systemPrompt: fallbackSystemPrompt,
          });

          if (fallbackSession) {
            const stream = fallbackSession.promptStreaming(query);
            const messageId = Date.now();
            addMessage("assistant", "", messageId);

            let response = "";
            for await (const chunk of stream) {
              response += chunk;
              updateMessage(messageId, response);
            }
            setIsThinking(false);
            setLoadingStage("");
            
            // Trigger TTS for the fallback response
            if (response.trim()) {
              speakAIResponse(response);
            }
          } else {
            throw error;
          }
        } catch (fallbackError) {
          addMessage(
            "error",
            `AI Error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    } catch (error) {
      console.error("AI Error:", error);
      addMessage(
        "error",
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setIsThinking(false);
      setLoadingStage("");
    }
  };


  const handleClearConversation = () => {
    // Destroy current session when clearing conversation
    destroySession();
    clearConversation();
    setCurrentScreenshot(null);
  };

  const handleScreenToggle = async () => {
    if (hasScreenAccess) {
      // Stop screen capture and update state
      stopCapture();
      setHasScreenAccess(false);
      addMessage(
        "system",
        "📸 Screen view disabled. AI will work in text-only mode."
      );
    } else {
      const success = await requestScreenAccess();
      setHasScreenAccess(success);
      if (success) {
        const hasExistingScreenMessage = messages.some(msg => 
          msg.content.includes("Screen view enabled") || 
          msg.content.includes("Screen: ON")
        );
        
        if (!hasExistingScreenMessage) {
          addMessage(
            "system",
            "📸 Screen view enabled! AI can now see your screen."
          );
        }
      } else {
        addMessage(
          "error",
          "Screen access denied. AI will work without screen context."
        );
      }
    }
  };

  const toggleSystemPIP = async () => {
    if (pipIsOpen) {
      closePIPWindow();
      setIsFloating(false);
    } else {
      const pipComponent = (
        <PIPApp
          onClose={() => {
            closePIPWindow();
            setIsFloating(false);
          }}
          sharedScreenStream={getStream()}
          hasMainScreenAccess={hasScreenAccess}
          sharedMessages={messages}
          sharedIsThinking={isThinking}
          sharedLoadingStage={loadingStage}
          onAddMessage={addMessage}
          onUpdateMessage={updateMessage}
          onClearConversation={clearConversation}
          onSetIsThinking={setIsThinking}
          onSetLoadingStage={setLoadingStage}
          onScreenToggle={handleScreenToggle}
          buildCleanConversationContext={buildCleanConversationContext}
        />
      );

      const success = await openPIPWindow(pipComponent, {
        width: 400,
        height: 600,
        x: window.screen.width - 420,
        y: 50,
      });

      if (success) {
        setIsFloating(true);
      } else {
        addMessage(
          "error",
          "Failed to open floating window. Please allow popups for this site and try again. Look for a popup blocker icon in your browser's address bar."
        );
      }
    }
  };

  // Don't render the main app if PIP is open (content moved to popup)
  if (pipIsOpen) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-6 bg-gray-800 p-8 rounded-lg border border-gray-700">
          <h2 className="text-2xl font-bold text-white">
            🎯 AI Assistant is now floating system-wide!
          </h2>
          <div className="space-y-4 text-gray-300">
            <p>
              Your AI assistant is now in a floating window that works across
              all applications.
            </p>
            <p>
              You can switch between apps while keeping the assistant
              accessible.
            </p>
          </div>
          <button
            onClick={toggleSystemPIP}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white border-none rounded-lg cursor-pointer font-medium"
            type="button"
          >
            📱 Return to Browser
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-gray-900 text-xl font-bold m-0 leading-tight">
                ScreenGenie
              </h1>
              <p className="text-gray-500 text-sm m-0 leading-tight">
                AI-Powered Screen Assistant
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="w-12 h-12 bg-gray-100 hover:bg-gray-200 text-gray-600 border-none rounded-xl cursor-pointer transition-colors flex items-center justify-center"
              type="button"
              title="Home"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
            
            <button
              onClick={handleScreenToggle}
              className={`w-12 h-12 text-white border-none rounded-xl cursor-pointer transition-all flex items-center justify-center ${
                hasScreenAccess
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
              type="button"
              title={hasScreenAccess ? "Screen capture is ON" : "Enable screen capture"}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            
            <button
              onClick={() => setAutoFloatEnabled(!autoFloatEnabled)}
              className={`w-12 h-12 text-white border-none rounded-xl cursor-pointer transition-all flex items-center justify-center ${
                autoFloatEnabled
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-gray-500 hover:bg-gray-600"
              }`}
              type="button"
              title={`Auto-float ${autoFloatEnabled ? 'enabled' : 'disabled'}: automatically open floating window when switching apps`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            <button
              onClick={toggleSystemPIP}
              className="w-12 h-12 bg-purple-500 hover:bg-purple-600 text-white border-none rounded-xl cursor-pointer transition-colors flex items-center justify-center"
              type="button"
              title={pipIsOpen ? "Close floating window" : "Open system-wide floating window"}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
            
            <button
              onClick={handleClearConversation}
              className="w-12 h-12 bg-red-500 hover:bg-red-600 text-white border-none rounded-xl cursor-pointer transition-colors flex items-center justify-center"
              type="button"
              title="Clear conversation"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <ChatInterface
        onUserQuery={handleUserQuery}
        showScreenToggle={false}
        isPIPMode={false}
      />
    </div>
  );
};