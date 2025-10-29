"use client";

import type React from "react";

import { useRef, useEffect, useState } from "react";
import { marked } from "marked";
import { useSharedChatContext, Message } from "../contexts/SharedChatContext";
import { useScreenContext } from "../contexts/ScreenContext";
import { useTTSContext } from "../contexts/TTSContext";

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Message interface moved to ChatContext

interface ChatInterfaceProps {
  onUserQuery: (query: string) => void;
  showScreenToggle?: boolean;
  isPIPMode?: boolean;
  // Optional shared state props for PIP mode
  sharedMessages?: Message[];
  sharedInputText?: string;
  sharedIsThinking?: boolean;
  sharedLoadingStage?: string;
  onSetInputText?: (text: string) => void;
  hasScreenAccess?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onUserQuery,
  showScreenToggle = false,
  isPIPMode = false,
  // Shared state props
  sharedMessages,
  sharedInputText,
  sharedIsThinking,
  sharedLoadingStage,
  onSetInputText,
  hasScreenAccess: propHasScreenAccess,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use shared props if provided (PIP mode), otherwise use contexts (main window)
  const sharedChatContext = isPIPMode ? null : useSharedChatContext();
  const screenContext = isPIPMode ? null : useScreenContext();
  const ttsContext = isPIPMode ? null : useTTSContext();

  // Local input state for PIP mode to avoid sync issues
  const [localInputText, setLocalInputText] = useState("");

  const messages = sharedMessages || sharedChatContext?.messages || [];
  const inputText = isPIPMode
    ? localInputText
    : sharedInputText !== undefined
    ? sharedInputText
    : sharedChatContext?.inputText || "";
  const isThinking =
    sharedIsThinking !== undefined
      ? sharedIsThinking
      : sharedChatContext?.isThinking || false;
  const loadingStage =
    sharedLoadingStage || sharedChatContext?.loadingStage || "";
  const setInputText = isPIPMode
    ? setLocalInputText
    : onSetInputText || sharedChatContext?.setInputText || (() => {});
  const hasScreenAccess =
    propHasScreenAccess !== undefined
      ? propHasScreenAccess
      : screenContext?.hasScreenAccess || false;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    if (isThinking) return;
    e.preventDefault();
    if (inputText.trim()) {
      onUserQuery(inputText);
      // Clear input after sending (both local and shared)
      if (isPIPMode) {
        setLocalInputText("");
      } else {
        setInputText("");
      }
    }
  };

  return (
    <>
      {/* Header with optional screen toggle */}
      {/* <header className="border-b border-border bg-card px-6 py-4 flex-shrink-0 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-lg">✨</span>
          </div>
          <h1 className="m-0 text-foreground text-base font-semibold tracking-tight">
            AI Assistant
          </h1>
        </div>
        {showScreenToggle && (
          <button
            onClick={onScreenToggle}
            className={`px-4 py-2 text-sm font-medium border border-border rounded-lg transition-all duration-200 ${
              hasScreenAccess
                ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20"
                : "bg-card text-foreground hover:bg-muted"
            }`}
          >
            <span className="flex items-center gap-2">
              <span>📸</span>
              <span>{hasScreenAccess ? "Screen Active" : "Enable Screen"}</span>
            </span>
          </button>
        )}
      </header> */}

      {/* Messages area */}
      <div
        className={`flex-1 overflow-auto h-[calc(100vh-160px)] ${
          ""
          // isPIPMode ? "max-h-[calc(100vh-140px)]" : "max-h-[calc(100vh-80px)]"
        }`}
      >
        <div className="w-full px-4 py-6">
          {messages
            .filter((msg) => msg.type === "user" || msg.type === "assistant") // Only show user and assistant messages
            .map((msg) => (
              <div
                key={msg.id}
                className={`mb-6 ${isPIPMode ? "text-sm" : "text-base"}`}
              >
                {msg.type === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-gray-700 text-white rounded-2xl rounded-tr-sm px-4 py-3">
                      <div className="leading-relaxed">{msg.content}</div>
                    </div>
                  </div>
                ) : msg.type === "assistant" ? (
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-base">🤖</span>
                    </div>
                    <div className="flex-1 min-w-0 max-w-[80%]">
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-tl-sm px-4 py-3 overflow-hidden">
                        <div
                          className="markdown-content text-foreground leading-relaxed text-left w-full overflow-x-auto"
                          dangerouslySetInnerHTML={{
                            __html: marked(msg.content || ""),
                          }}
                        />
                      </div>
                      {/* TTS Controls */}
                      {ttsContext?.isSupported && msg.content && (
                        <div className="flex gap-2 mt-2 ml-1">
                          <button
                            type="button"
                            onClick={() =>
                              ttsContext.speak(msg.content, msg.id)
                            }
                            disabled={
                              ttsContext.isSpeaking &&
                              ttsContext.currentMessageId === msg.id
                            }
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
                              ttsContext.isSpeaking &&
                              ttsContext.currentMessageId === msg.id
                                ? "bg-blue-50 text-blue-600 border-blue-200 cursor-not-allowed"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300"
                            }`}
                            title="Read aloud"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.536 8.464a5 5 0 010 7.072M18 5.5a9 9 0 010 13M3 7v10l4-2 4 2V7l-4 2-4-2z"
                              />
                            </svg>
                            {ttsContext.isSpeaking &&
                            ttsContext.currentMessageId === msg.id
                              ? "Speaking"
                              : "Hear Out"}
                          </button>
                          {ttsContext.isSpeaking &&
                            ttsContext.currentMessageId === msg.id && (
                              <>
                                <button
                                  type="button"
                                  onClick={
                                    ttsContext.isPaused
                                      ? ttsContext.resume
                                      : ttsContext.pause
                                  }
                                  className="px-2 py-1.5 text-xs font-medium rounded-lg border bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300 transition-all flex items-center"
                                  title={
                                    ttsContext.isPaused ? "Resume" : "Pause"
                                  }
                                >
                                  {ttsContext.isPaused ? (
                                    <svg
                                      className="w-3 h-3"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  ) : (
                                    <svg
                                      className="w-3 h-3"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                    </svg>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={ttsContext.stop}
                                  className="px-2 py-1.5 text-xs font-medium rounded-lg border bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300 transition-all flex items-center"
                                  title="Stop"
                                >
                                  <svg
                                    className="w-3 h-3"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M6 6h12v12H6z" />
                                  </svg>
                                </button>
                              </>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          {isThinking && (
            <div className={`mb-6 ${isPIPMode ? "text-sm" : "text-base"}`}>
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-base">🤖</span>
                </div>
                <div className="flex-1 min-w-0 max-w-[80%]">
                  <div className="text-muted-foreground leading-relaxed flex items-center gap-2">
                    <span>{loadingStage || "Thinking"}</span>
                    <span className="inline-flex gap-1">
                      <span className="thinking-dot"></span>
                      <span className="thinking-dot"></span>
                      <span className="thinking-dot"></span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input form */}
      <div className="border-t border-border bg-card flex-shrink-0 sticky bottom-0 w-full">
        <form onSubmit={handleSubmit} className="w-full px-4 py-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Message AI Assistant..."
                disabled={isThinking}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                autoFocus
              />
            </div>

            {ttsContext?.isSupported && (
              <button
                type="button"
                onClick={ttsContext.toggleAutoSpeak}
                disabled={isThinking}
                className={`px-4 py-3 border border-gray-300 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  isThinking
                    ? "cursor-not-allowed opacity-50 bg-gray-100"
                    : "cursor-pointer hover:bg-gray-50"
                } ${
                  ttsContext.settings.autoSpeak
                    ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                    : "bg-white text-gray-700 hover:border-gray-400"
                }`}
                title={`Auto-speak AI responses: ${
                  ttsContext.settings.autoSpeak ? "ON" : "OFF"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072M18 5.5a9 9 0 010 13M3 7v10l4-2 4 2V7l-4 2-4-2z"
                  />
                </svg>
                {ttsContext.settings.autoSpeak
                  ? "Hear Out: ON"
                  : "Hear Out: OFF"}
              </button>
            )}

            <button
              type="submit"
              disabled={!inputText.trim() || isThinking}
              className={`px-5 py-3 border rounded-xl text-sm font-medium transition-all duration-200 ${
                inputText.trim() && !isThinking
                  ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 cursor-pointer shadow-sm"
                  : "bg-muted text-muted-foreground border-border cursor-not-allowed"
              }`}
            >
              {isThinking ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                </span>
              ) : (
                <span className="text-primary-foreground">Send</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
