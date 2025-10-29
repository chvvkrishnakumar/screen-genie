import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChromeAI } from "../hooks/useChromeAI";

export const HomePage = () => {
  const [isStarting, setIsStarting] = useState(false);
  const { isReady: aiReady, status: aiStatus } = useChromeAI();
  const navigate = useNavigate();

  const startAssistant = async () => {
    setIsStarting(true);

    // Check AI availability first
    if (!aiReady) {
      if (aiStatus === "not-available") {
        alert("Chrome AI not available. Please use Chrome Canary with AI features enabled.");
        setIsStarting(false);
        return;
      } else {
        alert(`AI is loading (${aiStatus}). Please wait...`);
        setIsStarting(false);
        return;
      }
    }

    // Navigate to chat page
    setIsStarting(false);
    navigate("/chat");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-12">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-6xl font-bold text-white leading-tight">
            ScreenGenie
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Your intelligent screen companion with voice output powered by Chrome's built-in AI
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 group">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              Smart Screen Awareness
            </h3>
            <p className="text-gray-300 leading-relaxed">
              I automatically see what's on your screen and provide contextual help based on your current activity
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 group">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              Natural Conversation
            </h3>
            <p className="text-gray-300 leading-relaxed">
              Chat naturally with context awareness. I understand what you're asking and remember our conversation
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 group">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M15.536 8.464a5 5 0 010 7.072M18 5.5a9 9 0 010 13M3 7v10l4-2 4 2V7l-4 2-4-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              Hear Out Responses
            </h3>
            <p className="text-gray-300 leading-relaxed">
              Listen to AI responses with high-quality text-to-speech. Perfect for multitasking while getting help
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 group">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              System-Wide Float
            </h3>
            <p className="text-gray-300 leading-relaxed">
              Float above all applications - use me while working in any app without interrupting your workflow
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            System Requirements
          </h3>
          <div className="space-y-4">
            <div
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                aiReady
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : aiStatus === "not-available"
                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${
                aiReady 
                  ? "bg-emerald-400" 
                  : aiStatus === "not-available" 
                  ? "bg-red-400" 
                  : "bg-yellow-400 animate-pulse"
              }`} />
              <span className="font-medium">
                Chrome AI (Gemini Nano): {" "}
                {aiReady
                  ? "Ready"
                  : aiStatus === "not-available"
                  ? "Not Available"
                  : aiStatus}
              </span>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <div className="w-3 h-3 rounded-full bg-blue-400" />
              <span className="font-medium">
                Screen sharing will be requested when you start
              </span>
            </div>
          </div>

          {aiStatus === "not-available" && (
            <div className="mt-6 p-6 bg-red-500/10 rounded-xl border border-red-500/30">
              <h4 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                To enable Chrome AI:
              </h4>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 ml-7">
                <li>
                  Install{" "}
                  <a
                    href="https://www.google.com/chrome/canary/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline font-medium"
                  >
                    Chrome Canary
                  </a>
                </li>
                <li>
                  Go to{" "}
                  <code className="bg-gray-800 px-3 py-1 rounded-lg text-sm text-blue-300 font-mono">
                    chrome://flags
                  </code>
                </li>
                <li>Enable "Prompt API for Gemini Nano"</li>
                <li>Enable "Optimization Guide On Device Model"</li>
                <li>Restart Chrome</li>
              </ol>
            </div>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={startAssistant}
            disabled={isStarting || !aiReady}
            className={`relative px-10 py-4 text-lg font-bold rounded-2xl transition-all duration-300 transform ${
              isStarting || !aiReady
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white cursor-pointer shadow-xl hover:shadow-2xl hover:scale-105"
            }`}
            type="button"
          >
            {isStarting ? (
              <div className="flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-white rounded-full"></div>
                Starting...
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Start AI Assistant
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};