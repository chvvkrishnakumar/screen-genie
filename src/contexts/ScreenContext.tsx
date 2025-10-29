import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ScreenContextType {
  hasScreenAccess: boolean;
  currentScreenshot: string | null;
  isListening: boolean;
  setHasScreenAccess: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentScreenshot: React.Dispatch<React.SetStateAction<string | null>>;
  setIsListening: React.Dispatch<React.SetStateAction<boolean>>;
}

const ScreenContext = createContext<ScreenContextType | undefined>(undefined);

export const useScreenContext = () => {
  const context = useContext(ScreenContext);
  if (context === undefined) {
    throw new Error('useScreenContext must be used within a ScreenProvider');
  }
  return context;
};

interface ScreenProviderProps {
  children: ReactNode;
}

export const ScreenProvider: React.FC<ScreenProviderProps> = ({ children }) => {
  const [hasScreenAccess, setHasScreenAccess] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const value: ScreenContextType = {
    hasScreenAccess,
    currentScreenshot,
    isListening,
    setHasScreenAccess,
    setCurrentScreenshot,
    setIsListening,
  };

  return <ScreenContext.Provider value={value}>{children}</ScreenContext.Provider>;
};