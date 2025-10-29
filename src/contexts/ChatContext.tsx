import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Message {
  id: number;
  type: "user" | "assistant" | "system" | "error";
  content: string;
  timestamp: Date;
}

interface ChatContextType {
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
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: "system",
      content: "🎯 AI Screen Assistant is ready! I can help with questions and tasks.",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [conversationContext, setConversationContext] = useState("");

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
    setMessages([
      {
        id: 1,
        type: "system",
        content: "🎯 AI Screen Assistant is ready! I can help with questions and tasks.",
        timestamp: new Date(),
      },
    ]);
    setConversationContext("");
    addMessage("system", "Conversation cleared. Start fresh!");
  };

  const value: ChatContextType = {
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
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};