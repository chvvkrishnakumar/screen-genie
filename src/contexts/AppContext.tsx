import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AppContextType {
  isFloating: boolean;
  isStarted: boolean;
  isStarting: boolean;
  autoFloatEnabled: boolean;
  setIsFloating: React.Dispatch<React.SetStateAction<boolean>>;
  setIsStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setIsStarting: React.Dispatch<React.SetStateAction<boolean>>;
  setAutoFloatEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [isFloating, setIsFloating] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [autoFloatEnabled, setAutoFloatEnabled] = useState(false);

  const value: AppContextType = {
    isFloating,
    isStarted,
    isStarting,
    autoFloatEnabled,
    setIsFloating,
    setIsStarted,
    setIsStarting,
    setAutoFloatEnabled,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};