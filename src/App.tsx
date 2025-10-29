import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { ChatPage } from "./pages/ChatPage";
import { AppProvider } from "./contexts/AppContext";
import { ScreenProvider } from "./contexts/ScreenContext";
import { SharedChatProvider } from "./contexts/SharedChatContext";
import { TTSProvider } from "./contexts/TTSContext";
import "./App.css";

// Type definitions for Chrome AI APIs
declare global {
  interface Window {
    LanguageModel?: any;
    ai?: any;
    webkitSpeechRecognition?: any;
  }
}

function App() {
  // Add reload warning
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only show warning if we're on the chat page (not home page)
      if (window.location.pathname === "/chat") {
        e.preventDefault();
        e.returnValue =
          "You will lose your conversation if you reload. Are you sure?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <AppProvider>
      <ScreenProvider>
        <SharedChatProvider>
          <TTSProvider>
            {/* 👇 Add basename for GitHub Pages */}
            <Router basename="/screen-genie">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/chat" element={<ChatPage />} />
              </Routes>
            </Router>
          </TTSProvider>
        </SharedChatProvider>
      </ScreenProvider>
    </AppProvider>
  );
}

export default App;
