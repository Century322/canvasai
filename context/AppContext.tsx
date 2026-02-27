import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { StoredKey, ModelCapability, GenerationConfig, PromptPreset, KnowledgeFile, ToastNotification } from '../types';
import { INITIAL_SYSTEM_INSTRUCTION, DEFAULT_GENERATION_CONFIG } from '../constants';
import { GeminiService } from '../services/geminiService';
import { useChatEngine } from '../hooks/useChatEngine';

interface AppContextType {
  isIncognito: boolean;
  setIsIncognito: (val: boolean) => void;
  isIncognitoRef: React.MutableRefObject<boolean>;
  
  leftSystemInstruction: string;
  setLeftSystemInstruction: (val: string) => void;
  leftSystemInstructionRef: React.MutableRefObject<string>;
  
  rightSystemInstruction: string;
  setRightSystemInstruction: (val: string) => void;
  rightSystemInstructionRef: React.MutableRefObject<string>;
  
  generationConfig: GenerationConfig;
  setGenerationConfig: (val: GenerationConfig) => void;
  
  customPrompts: PromptPreset[];
  setCustomPrompts: React.Dispatch<React.SetStateAction<PromptPreset[]>>;
  
  knowledgeFiles: KnowledgeFile[];
  setKnowledgeFiles: React.Dispatch<React.SetStateAction<KnowledgeFile[]>>;
  
  availableModels: ModelCapability[];
  setAvailableModels: React.Dispatch<React.SetStateAction<ModelCapability[]>>;
  
  currentModelId: string;
  setCurrentModelId: (val: string) => void;
  
  rightModelId: string;
  setRightModelId: (val: string) => void;
  
  storedKeys: StoredKey[];
  setStoredKeys: React.Dispatch<React.SetStateAction<StoredKey[]>>;
  
  geminiService: GeminiService;
  
  leftEngine: ReturnType<typeof useChatEngine>;
  rightEngine: ReturnType<typeof useChatEngine>;
  
  toasts: ToastNotification[];
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
  
  isSplitScreen: boolean;
  setIsSplitScreen: (val: boolean) => void;
  
  isAutoBattle: boolean;
  setIsAutoBattle: (val: boolean) => void;
  
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  
  isRightSidebarOpen: boolean;
  setIsRightSidebarOpen: (val: boolean) => void;
  
  targetRightSidebarTrigger: { section: string, timestamp: number } | null;
  setTargetRightSidebarTrigger: (val: { section: string, timestamp: number } | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isIncognito, setIsIncognito] = useState(false);
  const isIncognitoRef = useRef(false);
  useEffect(() => { isIncognitoRef.current = isIncognito; }, [isIncognito]);

  const [leftSystemInstruction, setLeftSystemInstruction] = useState(INITIAL_SYSTEM_INSTRUCTION);
  const leftSystemInstructionRef = useRef(INITIAL_SYSTEM_INSTRUCTION);
  useEffect(() => { leftSystemInstructionRef.current = leftSystemInstruction; }, [leftSystemInstruction]);

  const [rightSystemInstruction, setRightSystemInstruction] = useState(INITIAL_SYSTEM_INSTRUCTION);
  const rightSystemInstructionRef = useRef(INITIAL_SYSTEM_INSTRUCTION);
  useEffect(() => { rightSystemInstructionRef.current = rightSystemInstruction; }, [rightSystemInstruction]);

  const [generationConfig, setGenerationConfig] = useState<GenerationConfig>(DEFAULT_GENERATION_CONFIG);
  const [customPrompts, setCustomPrompts] = useState<PromptPreset[]>([]);
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);
  const [availableModels, setAvailableModels] = useState<ModelCapability[]>([]);
  const [currentModelId, setCurrentModelId] = useState<string>("");
  const [rightModelId, setRightModelId] = useState<string>("");
  const [storedKeys, setStoredKeys] = useState<StoredKey[]>([]);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [isAutoBattle, setIsAutoBattle] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [targetRightSidebarTrigger, setTargetRightSidebarTrigger] = useState<{ section: string, timestamp: number } | null>(null);

  const [geminiService] = useState(() => new GeminiService(''));

  const leftEngine = useChatEngine({
    geminiService,
    generationConfig,
    systemInstruction: leftSystemInstruction,
    knowledgeFiles
  });

  const rightEngine = useChatEngine({
    geminiService,
    generationConfig,
    systemInstruction: rightSystemInstruction,
    knowledgeFiles
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToasts(prev => {
      const newToasts = [{ id: crypto.randomUUID(), message, type }, ...prev];
      return newToasts.slice(0, 3);
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value: AppContextType = {
    isIncognito,
    setIsIncognito,
    isIncognitoRef,
    leftSystemInstruction,
    setLeftSystemInstruction,
    leftSystemInstructionRef,
    rightSystemInstruction,
    setRightSystemInstruction,
    rightSystemInstructionRef,
    generationConfig,
    setGenerationConfig,
    customPrompts,
    setCustomPrompts,
    knowledgeFiles,
    setKnowledgeFiles,
    availableModels,
    setAvailableModels,
    currentModelId,
    setCurrentModelId,
    rightModelId,
    setRightModelId,
    storedKeys,
    setStoredKeys,
    geminiService,
    leftEngine,
    rightEngine,
    toasts,
    showToast,
    dismissToast,
    isSplitScreen,
    setIsSplitScreen,
    isAutoBattle,
    setIsAutoBattle,
    isSidebarOpen,
    setIsSidebarOpen,
    isRightSidebarOpen,
    setIsRightSidebarOpen,
    targetRightSidebarTrigger,
    setTargetRightSidebarTrigger
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
