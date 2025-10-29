"use client";

import type React from "react";
import { useRef, useEffect, useState } from "react";
import { marked } from "marked";
import { useSharedChatContext, Message } from "../contexts/SharedChatContext";
import { useScreenContext } from "../contexts/ScreenContext";
import { useTTSContext } from "../contexts/TTSContext";

marked.setOptions({
  breaks: true,
  gfm: true,
});

interface ChatInterfaceProps {
  onUserQuery: (query: string) => void;
  showScreenToggle?: boolean;
  isPIPMode?: boolean;
  sharedMessages?: Message[];
  sharedInputText?: string;
  sharedIsThinking?: boolean;
  sharedLoadingStage?: string;
  onSetInputText?: (text: string) => void;
  hasScreenAccess?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onUserQuery,
  isPIPMode = false,
  sharedMessages,
  sharedInputText,
  sharedIsThinking,
  sharedLoadingStage,
  onSetInputText,
  hasScreenAccess: propHasScreenAccess,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sharedChatContext = isPIPMode ? null : useSharedChatContext();
  const screenContext = isPIPMode ? null : useScreenContext();
  const ttsContext = isPIPMode ? null : useTTSContext();

  const [localInputText, setLocalInputText] = useState("");

  const messages = sharedMessages || sharedChatContext?.messages || [];
  const inputText = isPIPMode
    ? localInputText
    : sharedInputText ?? sharedChatContext?.inputText ?? "";
  const isThinking = sharedIsThinking ?? sharedChatContext?.isThinking ?? false;
  const loadingStage =
    sharedLoadingStage ?? sharedChatContext?.loadingStage ?? "";
  const setInputText = isPIPMode
    ? setLocalInputText
    : onSetInputText ?? sharedChatContext?.setInputText ?? (() => {});
  const hasScreenAccess =
    propHasScreenAccess ?? screenContext?.hasScreenAccess ?? false;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isThinking || !inputText.trim()) return;
    onUserQuery(inputText);
    if (isPIPMode) setLocalInputText("");
    else setInputText("");
  };

  return (
    <>
      <div className="flex-1 overflow-auto h-[calc(100vh-160px)]">
        <div className="w-full px-4 py-6 bg-gray-50">
          {messages
            .filter((msg) => msg.type === "user" || msg.type === "assistant")
            .map((msg) => (
              <div key={msg.id} className="mb-6">
                {msg.type === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-gray-800 text-white rounded-2xl rounded-tr-sm px-4 py-3">
                      <div className="leading-relaxed">{msg.content}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-base">🤖</span>
                    </div>
                    <div className="flex-1 min-w-0 max-w-[80%]">
                      <div className="bg-gray-300 text-gray-900 border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                        <div
                          className="markdown-content leading-relaxed text-left w-full overflow-x-auto"
                          dangerouslySetInnerHTML={{
                            __html: marked(msg.content || ""),
                          }}
                        />
                      </div>
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
                          >
                            🔊{" "}
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
                                  className="px-2 py-1.5 text-xs font-medium rounded-lg border bg-white text-gray-600 border-gray-200 hover:bg-gray-50 transition-all"
                                  title={
                                    ttsContext.isPaused ? "Resume" : "Pause"
                                  }
                                >
                                  {ttsContext.isPaused ? "▶" : "⏸"}
                                </button>
                                <button
                                  type="button"
                                  onClick={ttsContext.stop}
                                  className="px-2 py-1.5 text-xs font-medium rounded-lg border bg-white text-gray-600 border-gray-200 hover:bg-gray-50 transition-all"
                                  title="Stop"
                                >
                                  ⏹
                                </button>
                              </>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

          {isThinking && (
            <div className="mb-6">
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-base">🤖</span>
                </div>
                <div className="flex-1 min-w-0 max-w-[80%]">
                  <div className="text-gray-500 leading-relaxed flex items-center gap-2">
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

      <div className="border-t border-gray-200 bg-white sticky bottom-0 w-full">
        <form onSubmit={handleSubmit} className="w-full px-4 py-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Message AI Assistant..."
                disabled={isThinking}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 text-sm placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                autoFocus
              />
            </div>

            {ttsContext?.isSupported && (
              <button
                type="button"
                onClick={ttsContext.toggleAutoSpeak}
                disabled={isThinking}
                className={`px-4 py-3 border border-gray-300 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  ttsContext.settings.autoSpeak
                    ? "bg-blue-50 text-blue-600 border-blue-200"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                } ${isThinking ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                🔈{" "}
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
                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                  : "bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed"
              }`}
            >
              {isThinking ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                </span>
              ) : (
                "Send"
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
