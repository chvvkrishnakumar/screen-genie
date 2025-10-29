import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

export interface Message {
  id: number;
  type: "user" | "assistant" | "system" | "error";
  content: string;
  timestamp: Date;
}

interface SharedChatContextType {
  messages: Message[];
  inputText: string;
  isThinking: boolean;
  loadingStage: string;
  conversationContext: string;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  setIsThinking: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingStage: React.Dispatch<React.SetStateAction<string>>;
  setConversationContext: React.Dispatch<React.SetStateAction<string>>;
  addMessage: (type: Message["type"], content: string, id?: number) => void;
  updateMessage: (id: number, content: string) => void;
  clearConversation: () => void;
  buildCleanConversationContext: () => string;
}

const SharedChatContext = createContext<SharedChatContextType | undefined>(undefined);

export const useSharedChatContext = () => {
  const context = useContext(SharedChatContext);
  if (context === undefined) {
    throw new Error('useSharedChatContext must be used within a SharedChatProvider');
  }
  return context;
};

interface SharedChatProviderProps {
  children: ReactNode;
}

export const SharedChatProvider: React.FC<SharedChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: "system" as const,
      content: "🎯 AI Screen Assistant is ready! I can help with questions and tasks.",
      timestamp: new Date(),
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [conversationContext, setConversationContext] = useState("");

  // No localStorage persistence - fresh start on every reload

  const addMessage = (type: Message["type"], content: string, id?: number) => {
    const newMessage: Message = {
      type,
      content,
      timestamp: new Date(),
      id: id || Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const updateMessage = (id: number, content: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, content } : msg))
    );
  };

  const clearConversation = () => {
    const initialMessage: Message = {
      id: Date.now(),
      type: "system",
      content: "🎯 AI Screen Assistant is ready! I can help with questions and tasks.",
      timestamp: new Date(),
    };
    
    setMessages([initialMessage]);
    setConversationContext("");
    
    // Don't add redundant "cleared" message - just reset to initial state
  };

  const buildCleanConversationContext = () => {
    // FALLBACK CONTEXT BUILDER
    // This function is now primarily used as a fallback when persistent AI sessions fail
    // and need to be recreated with manual conversation context injection.
    // In normal operation, the persistent AI session maintains conversation memory naturally.
    
    // Filter out system and error messages, keep only user and assistant messages
    const conversationMessages = messages.filter(msg => 
      msg.type === "user" || msg.type === "assistant"
    );
    
    // Take the last 8 messages (4 exchanges) to stay within token limits
    const recentMessages = conversationMessages.slice(-8);
    
    // Build conversation context from actual messages
    const context = recentMessages.map(msg => {
      const role = msg.type === "user" ? "User" : "Assistant";
      return `${role}: ${msg.content.trim()}`;
    }).join('\n\n');
    
    return context;
  };

  const value: SharedChatContextType = {
    messages,
    inputText,
    isThinking,
    loadingStage,
    conversationContext,
    setMessages,
    setInputText,
    setIsThinking,
    setLoadingStage,
    setConversationContext,
    addMessage,
    updateMessage,
    clearConversation,
    buildCleanConversationContext,
  };

  return <SharedChatContext.Provider value={value}>{children}</SharedChatContext.Provider>;
};