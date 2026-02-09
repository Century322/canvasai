
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GeminiService } from './services/geminiService';
import ChatInterface from './components/ChatInterface';
import InputArea from './components/InputArea';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import Toast from './components/Toast';
import { Message, MessageRole, Attachment, ChatSession, StoredKey, ModelCapability, ContentType, GenerationConfig, PromptPreset, KnowledgeFile, ToastNotification } from './types';
import { INITIAL_SYSTEM_INSTRUCTION, DEFAULT_GENERATION_CONFIG } from './constants';
import { PanelLeftIcon, NewChatIcon, ChevronDownIcon, SplitScreenIcon, MaximizeIcon, SettingsIcon, ChevronLeftIcon, ChevronRightIcon } from './components/Icons';
import { DB } from './utils/db'; 
import { useChatEngine } from './hooks/useChatEngine';

export default function App() {
  // --- Global State ---
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [storedKeys, setStoredKeys] = useState<StoredKey[]>([]);
  
  // --- Config State ---
  const [availableModels, setAvailableModels] = useState<ModelCapability[]>([]);
  const [currentModelId, setCurrentModelId] = useState<string>(""); 
  const [rightModelId, setRightModelId] = useState<string>("");
  
  // Split System Instructions (Persisted per session in handlers)
  const [leftSystemInstruction, setLeftSystemInstruction] = useState<string>(INITIAL_SYSTEM_INSTRUCTION);
  const [rightSystemInstruction, setRightSystemInstruction] = useState<string>(INITIAL_SYSTEM_INSTRUCTION);
  
  const [generationConfig, setGenerationConfig] = useState<GenerationConfig>(DEFAULT_GENERATION_CONFIG);
  const [customPrompts, setCustomPrompts] = useState<PromptPreset[]>([]);
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);

  // --- UI State ---
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [activePane, setActivePane] = useState<'left' | 'right' | 'equal'>('equal');
  const [isAutoBattle, setIsAutoBattle] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [targetRightSidebarTrigger, setTargetRightSidebarTrigger] = useState<{ section: string, timestamp: number } | null>(null);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState<'left' | 'right' | null>(null);
  const [isIncognito, setIsIncognito] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // --- Data State ---
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]); 
  const [rightMessages, setRightMessages] = useState<Message[]>([]); 

  // --- Services & Hooks ---
  const [geminiService] = useState(() => new GeminiService(''));

  // Initialize Chat Engines with respective system instructions
  const leftEngine = useChatEngine({ 
      geminiService, generationConfig, systemInstruction: leftSystemInstruction, knowledgeFiles 
  });
  
  const rightEngine = useChatEngine({ 
      geminiService, generationConfig, systemInstruction: rightSystemInstruction, knowledgeFiles 
  });

  const activeKeyObject = storedKeys.find(k => k.isEnabled);
  const getModelName = (id: string) => availableModels.find(m => m.id === id)?.name || "AI";

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      setToasts(prev => [...prev, { id: crypto.randomUUID(), message, type }]);
  };
  const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  // --- Initialization Effects ---

  useEffect(() => {
    const savedTheme = localStorage.getItem('gemini_theme') as 'light' | 'dark' | null;
    if (savedTheme) setTheme(savedTheme);
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('gemini_theme', theme);
  }, [theme]);
  
  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: '新对话',
      messages: [],
      rightMessages: [], 
      timestamp: Date.now(),
      leftSystemInstruction: INITIAL_SYSTEM_INSTRUCTION,
      rightSystemInstruction: INITIAL_SYSTEM_INSTRUCTION
    };
    // Optimistic: add to list immediately (summary only)
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setRightMessages([]); 
    setLeftSystemInstruction(INITIAL_SYSTEM_INSTRUCTION);
    setRightSystemInstruction(INITIAL_SYSTEM_INSTRUCTION);
    DB.saveSession(newSession);
    showToast("已创建新对话", 'info');
  }, []);

  // Load Data with Lazy Loading optimization
  useEffect(() => {
    const localKeys = localStorage.getItem('gemini_stored_keys');
    if (localKeys) {
        try { 
            const parsedKeys: StoredKey[] = JSON.parse(localKeys);
            const sanitizedKeys = parsedKeys.map(k => ({
                ...k,
                key: (k.key || "").replace(/[^\x00-\x7F]/g, "").trim(),
                baseUrl: (k.baseUrl || "").replace(/[^\x00-\x7F]/g, "").trim()
            }));
            setStoredKeys(sanitizedKeys);
            localStorage.setItem('gemini_stored_keys', JSON.stringify(sanitizedKeys));
        } catch(e) { console.error(e); }
    } else { setAvailableModels([]); }

    const storedPrompts = localStorage.getItem('gemini_custom_prompts');
    if (storedPrompts) { try { setCustomPrompts(JSON.parse(storedPrompts)); } catch(e) {} }

    const storedFiles = localStorage.getItem('gemini_knowledge_files');
    if (storedFiles) { try { setKnowledgeFiles(JSON.parse(storedFiles)); } catch(e) {} }

    const storedModel = localStorage.getItem('gemini_model_id');
    if (storedModel) setCurrentModelId(storedModel);
    
    const storedConfig = localStorage.getItem('gemini_gen_config');
    if (storedConfig) { try { setGenerationConfig(JSON.parse(storedConfig)); } catch {} }

    // Lazy Loading Logic
    DB.getAllSessions().then(loadedSessions => {
        if (loadedSessions.length > 0) {
            // Strip messages for the sidebar list state to improve memory
            const summaries = loadedSessions.map(s => ({
                ...s,
                messages: new Array(s.messages.length).fill({} as any), // Keep count but remove data
                rightMessages: []
            }));
            setSessions(summaries);

            // Load full content for the first one
            const firstId = loadedSessions[0].id;
            setCurrentSessionId(firstId);
            setMessages(loadedSessions[0].messages);
            setRightMessages(loadedSessions[0].rightMessages || []);
            // Restore System Instructions for the first session
            setLeftSystemInstruction(loadedSessions[0].leftSystemInstruction || INITIAL_SYSTEM_INSTRUCTION);
            setRightSystemInstruction(loadedSessions[0].rightSystemInstruction || INITIAL_SYSTEM_INSTRUCTION);
        } else {
            createNewSession();
        }
    }).catch(e => {
        console.error("Failed to load sessions from DB", e);
        createNewSession();
    });

  }, []);

  // Sync Models & Service Key
  useEffect(() => {
      if (activeKeyObject) {
          geminiService.updateApiKey(activeKeyObject.key, activeKeyObject.provider, activeKeyObject.baseUrl);
      } else {
          geminiService.updateApiKey('', 'google');
      }
      
      const syncModels = async () => {
          if (activeKeyObject) {
              try {
                  const { models } = await geminiService.getAvailableModels();
                  setAvailableModels(models);
                  
                  if (!models.find(m => m.id === currentModelId)) {
                      setCurrentModelId(models.length > 0 ? models[0].id : "");
                  }
                  if (!models.find(m => m.id === rightModelId)) {
                      setRightModelId(models.length > 0 ? (models[1]?.id || models[0].id) : "");
                  }
              } catch (e: any) {
                  setAvailableModels([]);
                  setCurrentModelId("");
                  showToast(`模型列表更新失败: ${e.message}`, 'error');
              }
          } else {
              setAvailableModels([]);
              setCurrentModelId("");
          }
      };
      
      syncModels();

      if (!activeKeyObject && storedKeys.length === 0) {
          const timer = setTimeout(() => {
              setIsRightSidebarOpen(true);
              setTargetRightSidebarTrigger({ section: 'keys', timestamp: Date.now() });
          }, 500);
          return () => clearTimeout(timer);
      }
  }, [activeKeyObject, geminiService, storedKeys.length, currentModelId, rightModelId]); 

  // --- Handlers ---

  const handleSwitchSession = async (sid: string) => {
      setCurrentSessionId(sid);
      setIsSidebarOpen(false);

      const session = await DB.getSession(sid);
      if (session) {
          setMessages(session.messages);
          setRightMessages(session.rightMessages || []);
          // Restore Instructions
          setLeftSystemInstruction(session.leftSystemInstruction || INITIAL_SYSTEM_INSTRUCTION);
          setRightSystemInstruction(session.rightSystemInstruction || INITIAL_SYSTEM_INSTRUCTION);
      } else {
          showToast("加载会话失败", "error");
      }
  };

  const handleSendMessage = async (text: string, attachments: Attachment[], target: 'left' | 'right' | 'both', forceHidden?: boolean) => {
      const isLeft = target === 'left' || target === 'both';
      const isRight = target === 'right' || target === 'both';

      if (isLeft) {
          try {
              await leftEngine.sendMessage(
                  text, attachments, messages, currentModelId, setMessages, forceHidden
              );
          } catch (e) { showToast("左侧发送失败", 'error'); }
      }

      if (isRight && isSplitScreen) {
          try {
              await rightEngine.sendMessage(
                  text, attachments, rightMessages, rightModelId, setRightMessages, forceHidden
              );
          } catch (e) { showToast("右侧发送失败", 'error'); }
      }
  };

  const handleManualRelay = (direction: 'left_to_right' | 'right_to_left') => {
      if (leftEngine.isLoading || rightEngine.isLoading) return;

      if (direction === 'left_to_right') {
          const lastMsg = messages[messages.length - 1];
          if (lastMsg && lastMsg.role === MessageRole.MODEL && !lastMsg.isError) {
               handleSendMessage(lastMsg.content, [], 'right', true); 
          } else {
               showToast("左侧没有可转发的 AI 回复", 'info');
          }
      } else {
          const lastMsg = rightMessages[rightMessages.length - 1];
          if (lastMsg && lastMsg.role === MessageRole.MODEL && !lastMsg.isError) {
               handleSendMessage(lastMsg.content, [], 'left', true); 
          } else {
               showToast("右侧没有可转发的 AI 回复", 'info');
          }
      }
  };

  const handleStop = (target: 'left' | 'right') => {
      if (target === 'left') leftEngine.stopGeneration();
      if (target === 'right') rightEngine.stopGeneration();
      if (isAutoBattle) setIsAutoBattle(false);
      showToast("已停止生成", 'info');
  };

  const toggleAutoBattle = () => {
      setIsAutoBattle(prev => {
          const newState = !prev;
          showToast(newState ? "AI 对战模式已开启" : "AI 对战模式已关闭", newState ? 'success' : 'info');
          return newState;
      });
  };

  // --- Auto Battle Logic ---
  useEffect(() => {
      if (!isAutoBattle) return;
      if (leftEngine.isLoading || rightEngine.isLoading) return;

      if (!currentModelId || !rightModelId) return;

      const lastLeftMsg = messages[messages.length - 1];
      const lastRightMsg = rightMessages[rightMessages.length - 1];

      const triggerBattleTurn = async () => {
          if (
              messages.length > 0 && 
              lastLeftMsg?.role === MessageRole.MODEL && 
              !lastLeftMsg.isError &&
              (!lastRightMsg || lastRightMsg.timestamp < lastLeftMsg.timestamp)
          ) {
               await new Promise(r => setTimeout(r, 1000));
               handleSendMessage(lastLeftMsg.content, [], 'right');
          }
          else if (
              rightMessages.length > 0 && 
              lastRightMsg?.role === MessageRole.MODEL && 
              !lastRightMsg.isError &&
              (!lastLeftMsg || lastLeftMsg.timestamp < lastRightMsg.timestamp)
          ) {
               await new Promise(r => setTimeout(r, 1000));
               handleSendMessage(lastRightMsg.content, [], 'left');
          }
      };
      triggerBattleTurn();
  }, [isAutoBattle, leftEngine.isLoading, rightEngine.isLoading, messages, rightMessages, currentModelId, rightModelId]);

  // --- Persistence ---
  // Optimized persistence: Debounce or save on specific triggers rather than every message update would be better, 
  // but for simplicity we keep effect-based save with a check for loading state.
  useEffect(() => {
      if (isIncognito || !currentSessionId) return;
      
      const isGenerating = leftEngine.isLoading || rightEngine.isLoading;

      if (!isGenerating) {
          const sessionToSave: ChatSession = {
              id: currentSessionId,
              title: sessions.find(s => s.id === currentSessionId)?.title || '对话', 
              messages,
              rightMessages,
              timestamp: Date.now(),
              // Save instructions
              leftSystemInstruction,
              rightSystemInstruction
          };
          
          DB.saveSession(sessionToSave);
          
          setSessions(prev => prev.map(s => s.id === currentSessionId ? { 
              ...s, 
              messages: new Array(messages.length).fill({} as any), 
              timestamp: Date.now() 
          } : s).sort((a,b) => b.timestamp - a.timestamp));
      }
  }, [leftEngine.isLoading, rightEngine.isLoading, messages, rightMessages, currentSessionId, isIncognito, leftSystemInstruction, rightSystemInstruction]);

  // --- Mobile Gestures ---
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      const diffX = touchEnd.x - touchStartRef.current.x;
      const diffY = touchEnd.y - touchStartRef.current.y;
      
      const startX = touchStartRef.current.x;
      touchStartRef.current = null;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
          if (diffX > 0) {
              if (isRightSidebarOpen) setIsRightSidebarOpen(false);
              else if (!isSidebarOpen && !isRightSidebarOpen && startX < 50) setIsSidebarOpen(true);
          }
          else if (diffX < 0) {
              if (isSidebarOpen) setIsSidebarOpen(false);
              else if (!isRightSidebarOpen && !isSidebarOpen && startX > window.innerWidth - 50) setIsRightSidebarOpen(true);
          }
      }
  };

  // --- Render Helpers ---

  const renderModelSelector = (side: 'left' | 'right') => {
      const selectedId = side === 'left' ? currentModelId : rightModelId;
      const setSelected = side === 'left' ? setCurrentModelId : setRightModelId;
      const modelDef = availableModels.find(m => m.id === selectedId);

      return (
        <div className="relative w-full">
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsModelMenuOpen(isModelMenuOpen === side ? null : side);
                }}
                disabled={availableModels.length === 0}
                className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg transition-colors group ${availableModels.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-[#2f2f2f]'}`}
            >
                <span className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                    {modelDef?.name || (availableModels.length > 0 ? "选择模型" : "暂无")}
                </span>
                <ChevronDownIcon className={`w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-transform ${isModelMenuOpen === side ? 'rotate-180' : ''}`} />
            </button>

            {isModelMenuOpen === side && (
                <div className="fixed inset-0 z-40" onClick={() => setIsModelMenuOpen(null)}></div>
            )}

            {isModelMenuOpen === side && availableModels.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-white dark:bg-[#2f2f2f] rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {availableModels.map(model => (
                        <button
                            key={model.id}
                            onClick={() => { setSelected(model.id); setIsModelMenuOpen(null); }}
                            className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#383838] transition-colors ${selectedId === model.id ? 'bg-gray-50 dark:bg-[#383838]' : ''}`}
                        >
                            <div className="flex flex-col gap-0.5 min-w-0">
                                <span className={`text-sm font-medium truncate ${selectedId === model.id ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}>{model.name}</span>
                                <span className="text-[10px] text-gray-400 truncate">{model.description}</span>
                            </div>
                            {selectedId === model.id && <div className="w-1.5 h-1.5 rounded-full bg-gray-700 dark:bg-gray-300 shrink-0"></div>}
                        </button>
                    ))}
                </div>
            )}
        </div>
      );
  };

  const renderHeader = () => {
    return (
        <header className="relative flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-[#212121]/90 backdrop-blur-md flex-shrink-0 z-20 border-b border-gray-100 dark:border-[#2f2f2f]">
            <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
                <button onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#2f2f2f] rounded-lg shrink-0">
                    <PanelLeftIcon className="w-5 h-5" />
                </button>
                <div className="w-28 md:w-44 transition-all">
                    {activeKeyObject ? renderModelSelector('left') : (
                        <div 
                            onClick={() => {
                                setIsRightSidebarOpen(true);
                                setTargetRightSidebarTrigger({ section: 'keys', timestamp: Date.now() });
                            }} 
                            className="text-sm font-semibold text-gray-500 cursor-pointer whitespace-nowrap hover:text-gray-700 transition-colors px-2"
                        >
                            未配置密钥
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                {isSplitScreen && (
                    <div className="w-28 md:w-44 transition-all">
                        {activeKeyObject ? renderModelSelector('right') : null}
                    </div>
                )}
                
                <button 
                    onClick={() => {
                        if (isSplitScreen) {
                            setIsSplitScreen(false);
                            setActivePane('equal');
                            setIsAutoBattle(false);
                            leftEngine.stopGeneration(); rightEngine.stopGeneration();
                        } else {
                            setIsSplitScreen(true);
                            if (!rightModelId) setRightModelId(currentModelId);
                        }
                    }}
                    className={`p-2 -mr-2 rounded-lg transition-colors shrink-0 ${isSplitScreen ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#2f2f2f]'}`}
                    title={isSplitScreen ? "关闭分屏" : "开启分屏"}
                >
                    <SplitScreenIcon className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
  };

  return (
    <div 
        className="flex h-full bg-white dark:bg-[#212121] text-gray-800 dark:text-gray-100 font-sans overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
    >
      <Toast toasts={toasts} onDismiss={dismissToast} />
      
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={createNewSession}
        onSwitchSession={handleSwitchSession}
        onDeleteSession={(e, id) => {
             e.stopPropagation();
             const newSessions = sessions.filter(s => s.id !== id);
             setSessions(newSessions);
             DB.deleteSession(id);
             if (currentSessionId === id) createNewSession();
             showToast("会话已删除", 'info');
        }}
        onClearAllHistory={() => {
             if (window.confirm("确定要删除所有历史记录吗？")) {
                 setSessions([]); DB.clearAllSessions(); createNewSession();
                 showToast("历史记录已清空", 'success');
             }
        }}
        knowledgeFiles={knowledgeFiles}
        onUploadKnowledge={async (e) => {
             if (e.target.files) {
                 const files: File[] = Array.from(e.target.files);
                 let count = 0;
                 for (const file of files) {
                     const text = await file.text();
                     const newFile = { id: crypto.randomUUID(), name: file.name, content: text, size: file.size, timestamp: Date.now(), isActive: true };
                     setKnowledgeFiles(prev => {
                         const next = [...prev, newFile];
                         localStorage.setItem('gemini_knowledge_files', JSON.stringify(next));
                         return next;
                     });
                     count++;
                 }
                 if (count > 0) showToast(`成功上传 ${count} 个文件`, 'success');
             }
        }}
        onDeleteKnowledge={(id) => {
            setKnowledgeFiles(prev => { const next = prev.filter(f => f.id !== id); localStorage.setItem('gemini_knowledge_files', JSON.stringify(next)); return next; });
        }}
        onToggleKnowledge={(id) => {
            setKnowledgeFiles(prev => { const next = prev.map(f => f.id === id ? { ...f, isActive: !f.isActive } : f); localStorage.setItem('gemini_knowledge_files', JSON.stringify(next)); return next; });
        }}
        customPrompts={customPrompts}
        onSelectPreset={(c) => { 
            setLeftSystemInstruction(c); 
            setIsRightSidebarOpen(true); 
        }}
        allMessages={messages} 
        onJumpToMessage={() => {}}
        onAddCustomPrompt={(p) => {
             setCustomPrompts(prev => { const next = [...prev, p]; localStorage.setItem('gemini_custom_prompts', JSON.stringify(next)); return next; });
             showToast("角色已保存", 'success');
        }}
        onDeleteCustomPrompt={(id) => {
             setCustomPrompts(prev => { const next = prev.filter(p => p.id !== id); localStorage.setItem('gemini_custom_prompts', JSON.stringify(next)); return next; });
        }}
      />

      <div 
        onClick={() => setIsRightSidebarOpen(false)} 
        className={`flex-1 flex flex-col h-full relative transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-[280px]' : ''} max-w-full`}
      >
        {renderHeader()}

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative w-full min-h-0">
            <div 
                className={`flex flex-col overflow-hidden transition-all duration-500 ease-in-out ${isSplitScreen ? 'border-b md:border-b-0 md:border-r border-gray-200 dark:border-[#333]' : ''}`}
                style={{ flex: isSplitScreen ? (activePane === 'left' ? 3 : activePane === 'right' ? 0.001 : 1) : 1 }}
                onClick={() => { if (!isRightSidebarOpen && isSplitScreen) setActivePane(activePane === 'left' ? 'equal' : 'left'); }}
            >
                <div className={`h-full w-full flex flex-col ${isSplitScreen && activePane === 'right' ? 'opacity-30 pointer-events-none' : 'opacity-100'} transition-opacity duration-300`}>
                    <ChatInterface 
                        messages={messages} 
                        isLoading={leftEngine.isLoading} 
                        onRegenerate={() => leftEngine.regenerate(messages, currentModelId, setMessages)}
                        onEditMessage={(id, text) => handleSendMessage(text, [], 'left')} 
                        onBookmark={(id) => setMessages(m => m.map(msg => msg.id === id ? { ...msg, isBookmarked: !msg.isBookmarked } : msg))}
                        isMirrored={false}
                        modelName={getModelName(currentModelId)}
                        isSplitScreen={isSplitScreen}
                    />
                </div>
            </div>

            <div 
                className={`flex flex-col overflow-hidden transition-all duration-500 ease-in-out ${isSplitScreen ? 'opacity-100' : 'w-0 h-0 opacity-0'}`}
                style={{ flex: isSplitScreen ? (activePane === 'right' ? 3 : activePane === 'left' ? 0.001 : 1) : 0 }}
                onClick={() => { if (!isRightSidebarOpen && isSplitScreen) setActivePane(activePane === 'right' ? 'equal' : 'right'); }}
            >
                 <div className={`h-full w-full flex flex-col ${activePane === 'left' ? 'opacity-30 pointer-events-none' : 'opacity-100'} transition-opacity duration-300`}>
                    {isSplitScreen && (
                        <ChatInterface 
                            messages={rightMessages} 
                            isLoading={rightEngine.isLoading} 
                            onRegenerate={() => rightEngine.regenerate(rightMessages, rightModelId, setRightMessages)}
                            onEditMessage={(id, text) => handleSendMessage(text, [], 'right')}
                            onBookmark={() => {}}
                            isMirrored={true} 
                            modelName={getModelName(rightModelId)}
                            isSplitScreen={isSplitScreen}
                        />
                    )}
                </div>
            </div>
        </div>

        <InputArea 
          onSendMessage={handleSendMessage} 
          onStop={handleStop}
          isLeftLoading={leftEngine.isLoading}
          isRightLoading={rightEngine.isLoading}
          supportsImages={true}
          supportsAudio={true}
          isIncognito={isIncognito}
          onToggleIncognito={() => setIsIncognito(!isIncognito)}
          isSplitScreen={isSplitScreen}
          isAutoBattle={isAutoBattle}
          onToggleAutoBattle={toggleAutoBattle}
          onManualRelay={handleManualRelay}
          leftMessages={messages}
          rightMessages={rightMessages}
        />
        
        {!isRightSidebarOpen && (
            <button
                onClick={(e) => { e.stopPropagation(); setIsRightSidebarOpen(true); }}
                className={`absolute top-1/2 transform -translate-y-1/2 z-30 w-5 h-24 
                    rounded-l-xl flex items-center justify-center 
                    transition-all duration-300 ease-out
                    text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 
                    hover:w-8 hover:bg-black/5 dark:hover:bg-white/5
                    animate-bounce-x right-0
                `}
            >
                <div className="transition-transform duration-300">
                    <ChevronLeftIcon className="w-6 h-6" />
                </div>
            </button>
        )}

      </div>

      <RightSidebar 
        isOpen={isRightSidebarOpen}
        onClose={() => setIsRightSidebarOpen(false)}
        currentModelId={currentModelId}
        availableModels={availableModels}
        
        systemInstruction={leftSystemInstruction} 
        onSystemInstructionChange={setLeftSystemInstruction}
        
        leftSystemInstruction={leftSystemInstruction}
        rightSystemInstruction={rightSystemInstruction}
        setLeftSystemInstruction={setLeftSystemInstruction}
        setRightSystemInstruction={setRightSystemInstruction}
        isSplitScreen={isSplitScreen}

        config={generationConfig}
        onConfigChange={(c) => { setGenerationConfig(c); localStorage.setItem('gemini_gen_config', JSON.stringify(c)); }}
        storedKeys={storedKeys}
        onAddKey={(k) => {
             setStoredKeys(prev => { const next = [...prev, k]; localStorage.setItem('gemini_stored_keys', JSON.stringify(next)); return next; });
             showToast("密钥已添加", 'success');
        }}
        onToggleKey={(id) => {
             setStoredKeys(prev => { const next = prev.map(k => k.id === id ? { ...k, isEnabled: !k.isEnabled } : k); localStorage.setItem('gemini_stored_keys', JSON.stringify(next)); return next; });
        }}
        onDeleteKey={(id) => {
             setStoredKeys(prev => { const next = prev.filter(k => k.id !== id); localStorage.setItem('gemini_stored_keys', JSON.stringify(next)); return next; });
             showToast("密钥已删除", 'info');
        }}
        onExport={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessions));
              const downloadAnchorNode = document.createElement('a');
              downloadAnchorNode.setAttribute("href", dataStr);
              downloadAnchorNode.setAttribute("download", "chat_history.json");
              document.body.appendChild(downloadAnchorNode);
              downloadAnchorNode.click();
              downloadAnchorNode.remove();
              showToast("导出成功", 'success');
        }}
        onImport={(e) => {
             if (e.target.files && e.target.files[0]) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                      try {
                          const imported = JSON.parse(event.target?.result as string);
                          if (Array.isArray(imported)) {
                              setSessions(prev => { const combined = [...imported, ...prev]; imported.forEach(s => DB.saveSession(s)); return combined; });
                              showToast("导入成功", 'success');
                          }
                      } catch (e) { showToast("导入失败：文件格式错误", 'error'); }
                  };
                  reader.readAsText(e.target.files[0]);
              }
        }}
        targetSectionTrigger={targetRightSidebarTrigger}
        isIncognito={isIncognito}
        onToggleIncognito={() => setIsIncognito(!isIncognito)}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
      />
    </div>
  );
}
