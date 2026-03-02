import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import ChatInterface from './components/ChatInterface';
import InputArea from './components/InputArea';
import Toast from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import { AppProvider, useAppContext } from './context/AppContext';
import { useSessionManager } from './hooks/useSessionManager';
import { useAutoSave } from './hooks/useAutoSave';
import { useTheme } from './hooks/useTheme';
import { MessageRole, Attachment, StoredKey, ModelCapability } from './types';
import { INITIAL_SYSTEM_INSTRUCTION, DEFAULT_GENERATION_CONFIG } from './constants';
import { PanelLeftIcon, SplitScreenIcon, ChevronLeftIcon } from './components/Icons';
import { DB } from './utils/db';
import ModelSelector from './components/ModelSelector';
import { getProviderById } from './constants/models';
import { aiSdkService } from './services/aiSdkService';

const Sidebar = lazy(() => import('./components/Sidebar'));
const RightSidebar = lazy(() => import('./components/RightSidebar'));

const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
  </div>
);

const AppContent: React.FC = () => {
  const {
    isIncognito, setIsIncognito, isIncognitoRef,
    leftSystemInstructionRef, setLeftSystemInstruction,
    rightSystemInstructionRef, setRightSystemInstruction,
    generationConfig, setGenerationConfig,
    customPrompts, setCustomPrompts,
    knowledgeFiles, setKnowledgeFiles,
    availableModels, setAvailableModels,
    currentModelId, setCurrentModelId,
    rightModelId, setRightModelId,
    storedKeys, setStoredKeys,
    geminiService,
    leftEngine, rightEngine,
    toasts, showToast, dismissToast,
    isSplitScreen, setIsSplitScreen,
    isAutoBattle, setIsAutoBattle,
    isSidebarOpen, setIsSidebarOpen,
    isRightSidebarOpen, setIsRightSidebarOpen,
    targetRightSidebarTrigger, setTargetRightSidebarTrigger,
    userTools, setUserTools,
    enabledTools, setEnabledTools
  } = useAppContext();

  const {
    sessions, setSessions,
    currentSessionId, setCurrentSessionId,
    messages, setMessages,
    rightMessages, setRightMessages,
    hasUnsavedContent, setHasUnsavedContent,
    sessionsRef, currentSessionIdRef, messagesRef, rightMessagesRef,
    loadSessions, createNewSession, switchSession, clearAllHistory,
    realtimeUpdateSession
  } = useSessionManager({
    isIncognitoRef,
    leftSystemInstructionRef,
    rightSystemInstructionRef,
    showToast
  });

  const { restoreAutoSave } = useAutoSave({
    currentSessionIdRef,
    messagesRef,
    rightMessagesRef,
    isIncognitoRef,
    leftSystemInstructionRef,
    rightSystemInstructionRef,
    setSessions
  });

  useTheme();

  const [expandedPanel, setExpandedPanel] = useState<'left' | 'right' | null>(null);

  const activeKeyObject = storedKeys.find(k => k.isEnabled);
  const getModelName = (id: string) => availableModels.find(m => m.id === id)?.name || "AI";

  useEffect(() => {
    const localKeys = localStorage.getItem('gemini_stored_keys');
    if (localKeys) {
      try {
        const parsedKeys = JSON.parse(localKeys) as Partial<StoredKey>[];
        const sanitizedKeys = parsedKeys.map((k) => ({
          ...k,
          key: (k.key || "").replace(/[^\x00-\x7F]/g, "").trim(),
          baseUrl: (k.baseUrl || "").replace(/[^\x00-\x7F]/g, "").trim()
        })) as StoredKey[];
        setStoredKeys(sanitizedKeys);
      } catch { /* ignore */ }
    }

    const storedPrompts = localStorage.getItem('gemini_custom_prompts');
    if (storedPrompts) {
      try { setCustomPrompts(JSON.parse(storedPrompts)); } catch { /* ignore */ }
    }

    const storedFiles = localStorage.getItem('gemini_knowledge_files');
    if (storedFiles) {
      try { setKnowledgeFiles(JSON.parse(storedFiles)); } catch { /* ignore */ }
    }

    const storedModel = localStorage.getItem('gemini_model_id');
    if (storedModel) setCurrentModelId(storedModel);
    
    const storedRightModel = localStorage.getItem('gemini_right_model_id');
    if (storedRightModel) setRightModelId(storedRightModel);
    
    const storedConfig = localStorage.getItem('gemini_gen_config');
    if (storedConfig) {
      try { setGenerationConfig(JSON.parse(storedConfig)); } catch { /* ignore */ }
    }

    loadSessions();
    restoreAutoSave();
  }, [restoreAutoSave]);

  useEffect(() => {
    if (activeKeyObject) {
      geminiService.updateApiKey(activeKeyObject.key, activeKeyObject.provider, activeKeyObject.baseUrl);
      aiSdkService.updateConfig(activeKeyObject.key, activeKeyObject.provider, activeKeyObject.baseUrl || undefined);
    } else {
      geminiService.updateApiKey('', 'google');
      aiSdkService.updateConfig('', 'vercel');
    }
    
    const syncModels = () => {
      if (activeKeyObject) {
        const providerConfig = getProviderById(activeKeyObject.provider);
        if (providerConfig && providerConfig.models.length > 0) {
          const models: ModelCapability[] = providerConfig.models.map(m => ({
            id: m.id,
            name: m.name,
            provider: activeKeyObject.provider,
            description: m.description || '',
            supportsImages: m.supportsImages || false,
            supportsVideoGen: m.supportsVideo || false,
            supportsAudio: m.supportsAudio || false,
            isThinking: m.isThinking || false,
            isOnline: false,
            contextWindow: m.contextWindow || '',
            isFree: !m.isPaid,
          }));
          setAvailableModels(models);
          
          if (!currentModelId || !models.find(m => m.id === currentModelId)) {
            const savedModel = localStorage.getItem('gemini_model_id');
            if (savedModel && models.find(m => m.id === savedModel)) {
              setCurrentModelId(savedModel);
            } else {
              setCurrentModelId(models.length > 0 ? models[0].id : "");
            }
          }
          if (!rightModelId || !models.find(m => m.id === rightModelId)) {
            const savedRightModel = localStorage.getItem('gemini_right_model_id');
            if (savedRightModel && models.find(m => m.id === savedRightModel)) {
              setRightModelId(savedRightModel);
            } else {
              setRightModelId(models.length > 0 ? (models[1]?.id || models[0].id) : "");
            }
          }
        } else {
          setAvailableModels([]);
          setCurrentModelId("");
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
    return undefined;
  }, [activeKeyObject]);

  const handleSendMessage = useCallback(async (text: string, attachments: Attachment[], target: 'left' | 'right' | 'both', forceHidden?: boolean) => {
    const isLeft = target === 'left' || target === 'both';
    const isRight = target === 'right' || target === 'both';

    setHasUnsavedContent(true);

    const leftModelName = getModelName(currentModelId);
    const rightModelName = getModelName(rightModelId);

    const promises: Promise<void>[] = [];

    if (isLeft) {
      promises.push(
        leftEngine.sendMessage(text, attachments, messagesRef.current, currentModelId, leftModelName, setMessages, forceHidden)
          .catch(() => { showToast(isSplitScreen ? "左侧发送失败" : "发送失败", 'error'); })
      );
    }

    if (isRight && isSplitScreen) {
      promises.push(
        rightEngine.sendMessage(text, attachments, rightMessagesRef.current, rightModelId, rightModelName, setRightMessages, forceHidden)
          .catch(() => { showToast("右侧发送失败", 'error'); })
      );
    }

    await Promise.all(promises);
    await realtimeUpdateSession();
  }, [isSplitScreen, currentModelId, rightModelId, leftEngine, rightEngine, realtimeUpdateSession, showToast, setHasUnsavedContent]);

  const handleManualRelay = useCallback((direction: 'left_to_right' | 'right_to_left') => {
    if (leftEngine.isLoading || rightEngine.isLoading) return;

    if (direction === 'left_to_right') {
      const lastMsg = messagesRef.current[messagesRef.current.length - 1];
      if (lastMsg && lastMsg.role === MessageRole.MODEL && !lastMsg.isError) {
        handleSendMessage(lastMsg.content, [], 'right', true);
      } else {
        showToast("左侧没有可转发的 AI 回复", 'info');
      }
    } else {
      const lastMsg = rightMessagesRef.current[rightMessagesRef.current.length - 1];
      if (lastMsg && lastMsg.role === MessageRole.MODEL && !lastMsg.isError) {
        handleSendMessage(lastMsg.content, [], 'left', true);
      } else {
        showToast("右侧没有可转发的 AI 回复", 'info');
      }
    }
  }, [leftEngine.isLoading, rightEngine.isLoading, handleSendMessage, showToast]);

  const handleStop = useCallback((target: 'left' | 'right') => {
    if (target === 'left') leftEngine.stopGeneration();
    if (target === 'right') rightEngine.stopGeneration();
    if (isAutoBattle) setIsAutoBattle(false);
    showToast("已停止生成", 'info');
  }, [leftEngine, rightEngine, isAutoBattle]);

  const toggleAutoBattle = useCallback(() => {
    setIsAutoBattle(!isAutoBattle);
    showToast(!isAutoBattle ? "AI 对战模式已开启" : "AI 对战模式已关闭", !isAutoBattle ? 'success' : 'info');
  }, [isAutoBattle]);

  useEffect(() => {
    if (!isAutoBattle) return;
    if (leftEngine.isLoading || rightEngine.isLoading) return;
    if (!currentModelId || !rightModelId) return;

    const lastLeftMsg = messagesRef.current[messagesRef.current.length - 1];
    const lastRightMsg = rightMessagesRef.current[rightMessagesRef.current.length - 1];

    const triggerBattleTurn = async () => {
      if (
        messagesRef.current.length > 0 &&
        lastLeftMsg?.role === MessageRole.MODEL &&
        !lastLeftMsg.isError &&
        (!lastRightMsg || lastRightMsg.timestamp < lastLeftMsg.timestamp)
      ) {
        await new Promise(r => setTimeout(r, 1000));
        handleSendMessage(lastLeftMsg.content, [], 'right');
      }
      else if (
        rightMessagesRef.current.length > 0 &&
        lastRightMsg?.role === MessageRole.MODEL &&
        !lastRightMsg.isError &&
        (!lastLeftMsg || lastLeftMsg.timestamp < lastRightMsg.timestamp)
      ) {
        await new Promise(r => setTimeout(r, 1000));
        handleSendMessage(lastRightMsg.content, [], 'left');
      }
    };
    triggerBattleTurn();
  }, [isAutoBattle, leftEngine.isLoading, rightEngine.isLoading, currentModelId, rightModelId, handleSendMessage]);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
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
  }, [isRightSidebarOpen, isSidebarOpen]);

  const handleDeleteSession = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    if (id === currentSessionId) {
      setMessages([]);
      setRightMessages([]);
      setCurrentSessionId(null);
      setHasUnsavedContent(false);
    }
    
    const newSessions = sessionsRef.current.filter(s => s.id !== id);
    setSessions(newSessions);
    await DB.deleteSession(id);
    
    showToast("会话已删除", 'info');
  }, [currentSessionId, setMessages, setRightMessages, setCurrentSessionId, setHasUnsavedContent, setSessions, showToast]);

  const isNewChatDisabled = !hasUnsavedContent && messages.length === 0 && rightMessages.length === 0 && currentSessionId === null;

  return (
    <div 
      className="flex h-full bg-white dark:bg-[#212121] text-gray-800 dark:text-gray-100 font-sans overflow-hidden relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Toast toasts={toasts} onDismiss={dismissToast} />
      
      <Suspense fallback={<LoadingFallback />}>
        <Sidebar 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onNewChat={() => createNewSession(setLeftSystemInstruction, setRightSystemInstruction)}
          onSwitchSession={async (id) => {
            const result = await switchSession(id);
            if (result) {
              setLeftSystemInstruction(result.leftSystemInstruction);
              setRightSystemInstruction(result.rightSystemInstruction);
            }
            setIsSidebarOpen(false);
          }}
          onDeleteSession={handleDeleteSession}
          onClearAllHistory={clearAllHistory}
          isNewChatDisabled={isNewChatDisabled}
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
          setKnowledgeFiles(prev => {
            const next = prev.filter(f => f.id !== id);
            localStorage.setItem('gemini_knowledge_files', JSON.stringify(next));
            return next;
          });
        }}
        onToggleKnowledge={(id) => {
          setKnowledgeFiles(prev => {
            const next = prev.map(f => f.id === id ? { ...f, isActive: !f.isActive } : f);
            localStorage.setItem('gemini_knowledge_files', JSON.stringify(next));
            return next;
          });
        }}
        onToggleKnowledgeSide={(id, side) => {
          setKnowledgeFiles(prev => {
            const next = prev.map(f => {
              if (f.id !== id) return f;
              if (side === 'left') {
                return { ...f, leftEnabled: !f.leftEnabled };
              } else {
                return { ...f, rightEnabled: !f.rightEnabled };
              }
            });
            localStorage.setItem('gemini_knowledge_files', JSON.stringify(next));
            return next;
          });
        }}
        customPrompts={customPrompts}
        isSplitScreen={isSplitScreen}
        onSelectPreset={(c) => {
          setLeftSystemInstruction(c);
          setIsRightSidebarOpen(true);
        }}
        allMessages={messages}
        onJumpToMessage={() => {}}
        onAddCustomPrompt={(p) => {
          setCustomPrompts(prev => {
            const next = [...prev, p];
            localStorage.setItem('gemini_custom_prompts', JSON.stringify(next));
            return next;
          });
          showToast("角色已保存", 'success');
        }}
        onDeleteCustomPrompt={(id) => {
          setCustomPrompts(prev => {
            const next = prev.filter(p => p.id !== id);
            localStorage.setItem('gemini_custom_prompts', JSON.stringify(next));
            return next;
          });
        }}
        onEditCustomPrompt={(preset) => {
          setCustomPrompts(prev => {
            const next = prev.map(p => p.id === preset.id ? preset : p);
            localStorage.setItem('gemini_custom_prompts', JSON.stringify(next));
            return next;
          });
          showToast("角色已更新", 'success');
        }}
        onTogglePrompt={(id) => {
          setCustomPrompts(prev => {
            const next = prev.map(p => {
              if (p.id !== id) {
                if (p.isActive !== false) {
                  return { ...p, isActive: false };
                }
                return p;
              }
              return { ...p, isActive: p.isActive === false ? true : false };
            });
            localStorage.setItem('gemini_custom_prompts', JSON.stringify(next));
            return next;
          });
        }}
        onTogglePromptSide={(id, side) => {
          setCustomPrompts(prev => {
            const next = prev.map(p => {
              if (p.id !== id) {
                if (side === 'left' && p.leftEnabled) {
                  return { ...p, leftEnabled: false };
                }
                if (side === 'right' && p.rightEnabled) {
                  return { ...p, rightEnabled: false };
                }
                return p;
              }
              if (side === 'left') {
                return { ...p, leftEnabled: !p.leftEnabled };
              } else {
                return { ...p, rightEnabled: !p.rightEnabled };
              }
            });
            localStorage.setItem('gemini_custom_prompts', JSON.stringify(next));
            return next;
          });
        }}
        onFullWidthChange={(isFullWidth) => {
          if (isFullWidth && isRightSidebarOpen) {
            setIsRightSidebarOpen(false);
          }
        }}
      />
      </Suspense>

      <div 
        onClick={() => setIsRightSidebarOpen(false)}
        className={`flex-1 flex flex-col h-full relative transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-[280px]' : ''} max-w-full`}
      >
        <header className="fixed top-0 left-0 right-0 md:left-auto flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-[#212121]/90 backdrop-blur-md flex-shrink-0 z-20">
          <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors shrink-0">
              <PanelLeftIcon className="w-5 h-5" />
            </button>
            <div className="w-28 md:w-44 transition-all">
              {activeKeyObject ? (
                <ModelSelector
                  side="left"
                  selectedId={currentModelId}
                  onSelect={setCurrentModelId}
                  availableModels={availableModels}
                  messages={messages}
                  setMessages={setMessages}
                  showToast={showToast}
                />
              ) : (
                <button 
                  onClick={() => {
                    setTargetRightSidebarTrigger({ section: 'keys', timestamp: Date.now() });
                    setTimeout(() => setIsRightSidebarOpen(true), 0);
                  }}
                  className="text-sm font-semibold text-gray-400 dark:text-gray-500 cursor-pointer whitespace-nowrap hover:text-gray-700 dark:hover:text-gray-200 transition-all animate-pulse"
                >
                  未配置密钥
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
            {isSplitScreen && (
              <div className="w-28 md:w-44 transition-all">
                {activeKeyObject ? (
                  <ModelSelector
                    side="right"
                    selectedId={rightModelId}
                    onSelect={setRightModelId}
                    availableModels={availableModels}
                    messages={rightMessages}
                    setMessages={setRightMessages}
                    showToast={showToast}
                  />
                ) : null}
              </div>
            )}
            
            <button 
              onClick={() => {
                if (isSplitScreen) {
                  setIsSplitScreen(false);
                  setExpandedPanel(null);
                  setIsAutoBattle(false);
                  leftEngine.stopGeneration();
                  rightEngine.stopGeneration();
                } else {
                  setIsSplitScreen(true);
                  if (!rightModelId) setRightModelId(currentModelId);
                }
              }}
              className={`p-2 -mr-2 transition-colors shrink-0 ${isSplitScreen ? 'text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}
              title={isSplitScreen ? "关闭分屏" : "开启分屏"}
            >
              <SplitScreenIcon className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative w-full min-h-0 pt-12 md:pt-0">
          <div 
            className={`flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isSplitScreen ? 'md:border-r border-gray-200 dark:border-[#333]' : ''}`}
            style={{ 
              flex: isSplitScreen 
                ? (expandedPanel === 'right' ? 0 : (expandedPanel === 'left' ? 2 : 1))
                : 1,
              display: isSplitScreen && expandedPanel === 'right' ? 'none' : 'flex'
            }}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('button, input, textarea, a, [role="button"]')) {
                return;
              }
              if (isSplitScreen) {
                if (expandedPanel === 'left') {
                  setExpandedPanel(null);
                } else {
                  setExpandedPanel('left');
                }
              }
            }}
          >
            <div className="h-full w-full flex flex-col">
              <ChatInterface 
                messages={messages} 
                isLoading={leftEngine.isLoading} 
                onRegenerate={() => leftEngine.regenerate(messages, currentModelId, getModelName(currentModelId), setMessages)}
                onEditMessage={(id, text) => handleSendMessage(text, [], 'left')} 
                onBookmark={(id) => setMessages(m => m.map(msg => msg.id === id ? { ...msg, isBookmarked: !msg.isBookmarked } : msg))}
                isMirrored={false}
                modelName={getModelName(currentModelId)}
                isSplitScreen={isSplitScreen}
              />
            </div>
          </div>

          {isSplitScreen && (
            <div 
              className={`flex flex-col overflow-hidden transition-all duration-300 ease-in-out`}
              style={{ 
                flex: expandedPanel === 'left' ? 0 : (expandedPanel === 'right' ? 2 : 1),
                display: expandedPanel === 'left' ? 'none' : 'flex'
              }}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button, input, textarea, a, [role="button"]')) {
                  return;
                }
                if (isSplitScreen) {
                  if (expandedPanel === 'right') {
                    setExpandedPanel(null);
                  } else {
                    setExpandedPanel('right');
                  }
                }
              }}
            >
              <div className="h-full w-full flex flex-col">
                <ChatInterface 
                  messages={rightMessages} 
                  isLoading={rightEngine.isLoading} 
                  onRegenerate={() => rightEngine.regenerate(rightMessages, rightModelId, getModelName(rightModelId), setRightMessages)}
                  onEditMessage={(id, text) => handleSendMessage(text, [], 'right')}
                  onBookmark={() => {}}
                  isMirrored={true}
                  modelName={getModelName(rightModelId)}
                  isSplitScreen={isSplitScreen}
                />
              </div>
            </div>
          )}
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
            onClick={(e) => {
              e.stopPropagation();
              setIsRightSidebarOpen(true);
            }}
            className="absolute top-1/2 transform -translate-y-1/2 z-30 w-5 h-24 rounded-l-xl flex items-center justify-center transition-all duration-300 ease-out text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:w-8 hover:bg-black/5 dark:hover:bg-white/5 animate-bounce-x right-0"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      <Suspense fallback={<LoadingFallback />}>
        <RightSidebar
          isOpen={isRightSidebarOpen}
          onClose={() => setIsRightSidebarOpen(false)}
          currentModelId={currentModelId}
          availableModels={availableModels}
          config={generationConfig}
          onConfigChange={(c) => { setGenerationConfig(c); localStorage.setItem('gemini_gen_config', JSON.stringify(c)); }}
          storedKeys={storedKeys}
          onAddKey={(k) => {
            setStoredKeys(prev => {
              const next = [...prev, k];
              localStorage.setItem('gemini_stored_keys', JSON.stringify(next));
              return next;
            });
            showToast("密钥已添加", 'success');
          }}
          onToggleKey={(id) => {
            setStoredKeys(prev => {
              const next = prev.map(k => k.id === id ? { ...k, isEnabled: !k.isEnabled } : k);
              localStorage.setItem('gemini_stored_keys', JSON.stringify(next));
              return next;
            });
          }}
          onDeleteKey={(id) => {
            setStoredKeys(prev => {
              const next = prev.filter(k => k.id !== id);
              localStorage.setItem('gemini_stored_keys', JSON.stringify(next));
              return next;
            });
            showToast("密钥已删除", 'info');
          }}
          targetSectionTrigger={targetRightSidebarTrigger}
          isIncognito={isIncognito}
          onToggleIncognito={() => setIsIncognito(!isIncognito)}
          theme={isIncognito ? 'dark' : 'light'}
          userTools={userTools}
          setUserTools={setUserTools}
          enabledTools={enabledTools}
          setEnabledTools={setEnabledTools}
        />
      </Suspense>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
