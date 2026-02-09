
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
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
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
  // sessions: 历史记录列表中的会话（已保存的）
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  // currentSessionId: 当前正在查看的历史会话ID（null表示当前是临时新会话，不在历史记录中）
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  // 当前聊天内容（可能是历史会话的，也可能是临时新会话的）
  const [messages, setMessages] = useState<Message[]>([]); 
  const [rightMessages, setRightMessages] = useState<Message[]>([]); 
  // 标记当前是否有未保存的聊天内容
  const [hasUnsavedContent, setHasUnsavedContent] = useState(false);

  // --- Refs for avoiding closure issues ---
  const sessionsRef = useRef<ChatSession[]>([]);
  const currentSessionIdRef = useRef<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const rightMessagesRef = useRef<Message[]>([]);
  const leftSystemInstructionRef = useRef<string>(INITIAL_SYSTEM_INSTRUCTION);
  const rightSystemInstructionRef = useRef<string>(INITIAL_SYSTEM_INSTRUCTION);
  const isIncognitoRef = useRef<boolean>(false);
  const hasUnsavedContentRef = useRef<boolean>(false);

  // Sync refs with state
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);
  useEffect(() => { currentSessionIdRef.current = currentSessionId; }, [currentSessionId]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { rightMessagesRef.current = rightMessages; }, [rightMessages]);
  useEffect(() => { leftSystemInstructionRef.current = leftSystemInstruction; }, [leftSystemInstruction]);
  useEffect(() => { rightSystemInstructionRef.current = rightSystemInstruction; }, [rightSystemInstruction]);
  useEffect(() => { isIncognitoRef.current = isIncognito; }, [isIncognito]);
  useEffect(() => { hasUnsavedContentRef.current = hasUnsavedContent; }, [hasUnsavedContent]);

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

  // 计算实际主题（system -> light/dark）
  const getEffectiveThemeValue = (currentTheme: 'light' | 'dark' | 'system') => {
    if (currentTheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return currentTheme;
  };

  // 应用主题到 DOM
  const applyTheme = (currentTheme: 'light' | 'dark' | 'system') => {
    const effectiveTheme = getEffectiveThemeValue(currentTheme);
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // 初始化：从 localStorage 读取主题
  useEffect(() => {
    const savedTheme = localStorage.getItem('gemini_theme') as 'light' | 'dark' | 'system' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // 主题变化时应用并保存
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('gemini_theme', theme);
  }, [theme]);

  // 监听系统主题变化（仅在 system 模式下）
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Load Data - 只加载历史记录列表
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
    
    const storedRightModel = localStorage.getItem('gemini_right_model_id');
    if (storedRightModel) setRightModelId(storedRightModel);
    
    const storedConfig = localStorage.getItem('gemini_gen_config');
    if (storedConfig) { try { setGenerationConfig(JSON.parse(storedConfig)); } catch {} }

    // 加载历史记录列表
    DB.getAllSessions().then(loadedSessions => {
        // 只保存会话列表（不包含消息内容）
        const summaries = loadedSessions.map(s => ({
            ...s,
            messages: [],
            rightMessages: []
        }));
        setSessions(summaries);
        
        // 开始时空状态，不加载任何会话
        setCurrentSessionId(null);
        setMessages([]);
        setRightMessages([]);
        setHasUnsavedContent(false);
    }).catch(e => {
        console.error("Failed to load sessions from DB", e);
        setSessions([]);
        setCurrentSessionId(null);
        setMessages([]);
        setRightMessages([]);
        setHasUnsavedContent(false);
    });

  }, []);

  // 页面关闭/刷新前自动保存当前聊天
  useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          const currentSid = currentSessionIdRef.current;
          const currentMsgs = messagesRef.current;
          const currentRightMsgs = rightMessagesRef.current;
          
          // 如果有内容且不是无痕模式，保存到历史记录
          if ((currentMsgs.length > 0 || currentRightMsgs.length > 0) && !isIncognitoRef.current) {
              // 使用同步的保存方式（localStorage）来确保数据被保存
              // IndexedDB 是异步的，可能在页面关闭前无法完成
              
              // 生成标题
              let title = '新对话';
              const firstUserMsg = currentMsgs.find(m => m.role === MessageRole.USER);
              if (firstUserMsg) {
                  title = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '');
              }

              // 计算最后消息时间戳（内联实现，避免依赖问题）
              const allMsgs = [...currentMsgs, ...currentRightMsgs];
              const lastTimestamp = allMsgs.length > 0 ? Math.max(...allMsgs.map(m => m.timestamp)) : Date.now();

              const sessionToSave: ChatSession = {
                  id: currentSid || crypto.randomUUID(),
                  title,
                  messages: currentMsgs,
                  rightMessages: currentRightMsgs,
                  timestamp: lastTimestamp,
                  leftSystemInstruction: leftSystemInstructionRef.current,
                  rightSystemInstruction: rightSystemInstructionRef.current
              };
              
              // 使用 localStorage 同步保存（确保页面关闭前保存完成）
              const existingData = localStorage.getItem('gemini_auto_save');
              let autoSaveList: ChatSession[] = [];
              if (existingData) {
                  try {
                      autoSaveList = JSON.parse(existingData);
                  } catch {}
              }
              
              // 如果已有相同ID的会话，更新它；否则添加新会话
              const existingIndex = autoSaveList.findIndex(s => s.id === sessionToSave.id);
              if (existingIndex >= 0) {
                  autoSaveList[existingIndex] = sessionToSave;
              } else {
                  autoSaveList.push(sessionToSave);
              }
              
              localStorage.setItem('gemini_auto_save', JSON.stringify(autoSaveList));
              
              // 提示浏览器有未保存的更改（可选）
              // e.preventDefault();
              // e.returnValue = '';
          }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // 页面加载时恢复自动保存的数据
  useEffect(() => {
      const restoreAutoSave = async () => {
          const autoSaveData = localStorage.getItem('gemini_auto_save');
          if (autoSaveData) {
              try {
                  const autoSaveList: ChatSession[] = JSON.parse(autoSaveData);
                  if (autoSaveList.length > 0) {
                      // 恢复所有自动保存的会话到 IndexedDB
                      for (const session of autoSaveList) {
                          await DB.saveSession(session);
                      }
                      
                      // 更新侧边栏列表
                      setSessions(prev => {
                          let updated = [...prev];
                          for (const session of autoSaveList) {
                              const existingIndex = updated.findIndex(s => s.id === session.id);
                              if (existingIndex >= 0) {
                                  updated[existingIndex] = {
                                      ...session,
                                      messages: new Array(session.messages.length).fill({} as any),
                                      rightMessages: new Array(session.rightMessages.length).fill({} as any)
                                  };
                              } else {
                                  updated.push({
                                      ...session,
                                      messages: new Array(session.messages.length).fill({} as any),
                                      rightMessages: new Array(session.rightMessages.length).fill({} as any)
                                  });
                              }
                          }
                          updated.sort((a, b) => b.timestamp - a.timestamp);
                          return updated;
                      });
                      
                      // 清空自动保存数据
                      localStorage.removeItem('gemini_auto_save');
                  }
              } catch (e) {
                  console.error('Failed to restore auto-saved data', e);
              }
          }
      };
      
      restoreAutoSave();
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
                  
                  // 只在当前没有选中模型时，才设置为默认模型
                  // 如果已经有选中模型且在新列表中，保持当前选择
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

  // --- Core Save Functions ---
  
  // 获取会话的最后消息时间戳
  const getLastMessageTimestamp = useCallback((msgs: Message[], rightMsgs: Message[]): number => {
      const allMsgs = [...msgs, ...rightMsgs];
      if (allMsgs.length === 0) return Date.now();
      return Math.max(...allMsgs.map(m => m.timestamp));
  }, []);
  
  // 保存临时新会话到历史记录（创建新会话）
  const saveCurrentChatToHistory = useCallback(async (
      msgs: Message[] = messagesRef.current,
      rightMsgs: Message[] = rightMessagesRef.current
  ): Promise<string | null> => {
      
      console.log('saveCurrentChatToHistory - msgs:', msgs.length, 'rightMsgs:', rightMsgs.length, 'isIncognito:', isIncognitoRef.current);
      
      // 如果没有内容，不保存
      if (msgs.length === 0 && rightMsgs.length === 0) {
          console.log('saveCurrentChatToHistory - no content to save');
          return null;
      }
      
      if (isIncognitoRef.current) {
          console.log('saveCurrentChatToHistory - incognito mode, not saving');
          return null;
      }

      // 生成标题
      let title = '新对话';
      const firstUserMsg = msgs.find(m => m.role === MessageRole.USER);
      if (firstUserMsg) {
          title = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '');
      }

      // 使用最后一条消息的时间戳
      const lastTimestamp = getLastMessageTimestamp(msgs, rightMsgs);

      const newSession: ChatSession = {
          id: crypto.randomUUID(),
          title,
          messages: msgs,
          rightMessages: rightMsgs,
          timestamp: lastTimestamp,
          leftSystemInstruction: leftSystemInstructionRef.current,
          rightSystemInstruction: rightSystemInstructionRef.current
      };
      
      console.log('saveCurrentChatToHistory - saving new session:', newSession.id, title, 'timestamp:', lastTimestamp);
      
      await DB.saveSession(newSession);
      
      console.log('saveCurrentChatToHistory - saved to DB');
      
      setSessions(prev => {
          const updated = [{
              ...newSession,
              messages: new Array(msgs.length).fill({} as any),
              rightMessages: new Array(rightMsgs.length).fill({} as any)
          }, ...prev];
          // 按时间戳排序，最新的在最上面
          updated.sort((a, b) => b.timestamp - a.timestamp);
          console.log('saveCurrentChatToHistory - updated sessions:', updated.length);
          return updated;
      });
      
      return newSession.id;
  }, [getLastMessageTimestamp]);
  
  // 更新已有的历史会话
  const updateExistingSession = useCallback(async (
      sessionId: string,
      msgs: Message[] = messagesRef.current,
      rightMsgs: Message[] = rightMessagesRef.current
  ): Promise<void> => {
      
      console.log('updateExistingSession - sessionId:', sessionId, 'msgs:', msgs.length, 'rightMsgs:', rightMsgs.length);
      
      if (!sessionId) {
          console.log('updateExistingSession - no sessionId');
          return;
      }
      
      if (isIncognitoRef.current) {
          console.log('updateExistingSession - incognito mode, not saving');
          return;
      }

      // 生成标题
      let title = '新对话';
      const firstUserMsg = msgs.find(m => m.role === MessageRole.USER);
      if (firstUserMsg) {
          title = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '');
      }

      // 使用最后一条消息的时间戳
      const lastTimestamp = getLastMessageTimestamp(msgs, rightMsgs);

      const updatedSession: ChatSession = {
          id: sessionId,
          title,
          messages: msgs,
          rightMessages: rightMsgs,
          timestamp: lastTimestamp,
          leftSystemInstruction: leftSystemInstructionRef.current,
          rightSystemInstruction: rightSystemInstructionRef.current
      };
      
      console.log('updateExistingSession - updating session:', sessionId, title, 'timestamp:', lastTimestamp);
      
      await DB.saveSession(updatedSession);
      
      console.log('updateExistingSession - saved to DB');
      
      setSessions(prev => {
          const updated = prev.map(s => s.id === sessionId ? {
              ...updatedSession,
              messages: new Array(msgs.length).fill({} as any),
              rightMessages: new Array(rightMsgs.length).fill({} as any)
          } : s);
          // 按时间戳排序，最新的在最上面
          updated.sort((a, b) => b.timestamp - a.timestamp);
          console.log('updateExistingSession - updated sessions list, sorted');
          return updated;
      });
  }, [getLastMessageTimestamp]);

  // --- Handlers ---

  // 点击"新对话"按钮
  const createNewSession = useCallback(async () => {
      const currentSid = currentSessionIdRef.current;
      const currentMsgs = messagesRef.current;
      const currentRightMsgs = rightMessagesRef.current;
      
      // 1. 保存当前会话的更改
      if (currentSid === null) {
          // 当前是临时新会话，保存为新的历史记录
          console.log('createNewSession - saving temp session, msgs:', currentMsgs.length, 'rightMsgs:', currentRightMsgs.length);
          
          if (currentMsgs.length > 0 || currentRightMsgs.length > 0) {
              const savedId = await saveCurrentChatToHistory(currentMsgs, currentRightMsgs);
              console.log('createNewSession - savedId:', savedId);
          }
      } else {
          // 当前是历史会话，更新原有的记录
          console.log('createNewSession - updating history session:', currentSid);
          await updateExistingSession(currentSid, currentMsgs, currentRightMsgs);
      }

      // 2. 清空当前聊天，开始新会话
      setMessages([]);
      setRightMessages([]);
      setLeftSystemInstruction(INITIAL_SYSTEM_INSTRUCTION);
      setRightSystemInstruction(INITIAL_SYSTEM_INSTRUCTION);
      setCurrentSessionId(null);  // null 表示当前是临时新会话，不在历史记录中
      setHasUnsavedContent(false);
      
      showToast("已创建新对话", 'info');
  }, [saveCurrentChatToHistory, updateExistingSession]);

  // 切换会话
  const handleSwitchSession = useCallback(async (sid: string) => {
      const currentSid = currentSessionIdRef.current;
      const currentMsgs = messagesRef.current;
      const currentRightMsgs = rightMessagesRef.current;
      
      // 0. 保存当前会话的更改
      if (currentSid === null) {
          // 当前是临时新会话，保存为新的历史记录
          if (currentMsgs.length > 0 || currentRightMsgs.length > 0) {
              await saveCurrentChatToHistory(currentMsgs, currentRightMsgs);
          }
      } else {
          // 当前是历史会话，更新原有的记录
          await updateExistingSession(currentSid, currentMsgs, currentRightMsgs);
      }

      // 1. 立即清空当前消息
      setMessages([]);
      setRightMessages([]);
      setCurrentSessionId(sid);
      setIsSidebarOpen(false);
      setHasUnsavedContent(false);

      // 2. 加载历史会话
      const session = await DB.getSession(sid);
      if (session) {
          setMessages(session.messages);
          setRightMessages(session.rightMessages || []);
          setLeftSystemInstruction(session.leftSystemInstruction || INITIAL_SYSTEM_INSTRUCTION);
          setRightSystemInstruction(session.rightSystemInstruction || INITIAL_SYSTEM_INSTRUCTION);
      } else {
          showToast("加载会话失败", "error");
          setCurrentSessionId(null);
      }
  }, [saveCurrentChatToHistory, updateExistingSession]);

  // 实时更新历史记录列表（用于在历史会话中发送消息时实时更新侧边栏）
  const realtimeUpdateSession = useCallback(async () => {
      const currentSid = currentSessionIdRef.current;
      const currentMsgs = messagesRef.current;
      const currentRightMsgs = rightMessagesRef.current;
      
      // 只有在查看历史会话时才需要实时更新
      if (currentSid !== null && !isIncognitoRef.current) {
          if (currentMsgs.length > 0 || currentRightMsgs.length > 0) {
              // 生成标题
              let title = '新对话';
              const firstUserMsg = currentMsgs.find(m => m.role === MessageRole.USER);
              if (firstUserMsg) {
                  title = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '');
              }

              const lastTimestamp = getLastMessageTimestamp(currentMsgs, currentRightMsgs);

              // 更新数据库
              const updatedSession: ChatSession = {
                  id: currentSid,
                  title,
                  messages: currentMsgs,
                  rightMessages: currentRightMsgs,
                  timestamp: lastTimestamp,
                  leftSystemInstruction: leftSystemInstructionRef.current,
                  rightSystemInstruction: rightSystemInstructionRef.current
              };
              
              await DB.saveSession(updatedSession);
              
              // 实时更新侧边栏列表
              setSessions(prev => {
                  const updated = prev.map(s => s.id === currentSid ? {
                      ...updatedSession,
                      messages: new Array(currentMsgs.length).fill({} as any),
                      rightMessages: new Array(currentRightMsgs.length).fill({} as any)
                  } : s);
                  // 按时间戳排序，最新的在最上面
                  updated.sort((a, b) => b.timestamp - a.timestamp);
                  return updated;
              });
          }
      }
  }, [getLastMessageTimestamp]);

  // 发送消息
  const handleSendMessage = useCallback(async (text: string, attachments: Attachment[], target: 'left' | 'right' | 'both', forceHidden?: boolean) => {
      const isLeft = target === 'left' || target === 'both';
      const isRight = target === 'right' || target === 'both';

      // 标记有未保存内容
      setHasUnsavedContent(true);

      // 获取模型名称
      const leftModelName = getModelName(currentModelId);
      const rightModelName = getModelName(rightModelId);

      // Send to both sides simultaneously
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
      
      // 消息发送完成后，实时更新历史记录列表
      await realtimeUpdateSession();
  }, [isSplitScreen, currentModelId, rightModelId, leftEngine, rightEngine, realtimeUpdateSession, getModelName]);

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
  }, [leftEngine.isLoading, rightEngine.isLoading, handleSendMessage]);

  const handleStop = useCallback((target: 'left' | 'right') => {
      if (target === 'left') leftEngine.stopGeneration();
      if (target === 'right') rightEngine.stopGeneration();
      if (isAutoBattle) setIsAutoBattle(false);
      showToast("已停止生成", 'info');
  }, [leftEngine, rightEngine, isAutoBattle]);

  const toggleAutoBattle = useCallback(() => {
      setIsAutoBattle(prev => {
          const newState = !prev;
          showToast(newState ? "AI 对战模式已开启" : "AI 对战模式已关闭", newState ? 'success' : 'info');
          return newState;
      });
  }, []);

  // --- Auto Battle Logic ---
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

  // --- Mobile Gestures ---
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

  // --- Render Helpers ---

  const renderModelSelector = useCallback((side: 'left' | 'right') => {
      const selectedId = side === 'left' ? currentModelId : rightModelId;
      const setSelected = side === 'left' ? setCurrentModelId : setRightModelId;
      const modelDef = availableModels.find(m => m.id === selectedId);

      const handleModelSelect = (modelId: string) => {
          setSelected(modelId);
          setIsModelMenuOpen(null);
          // 保存到 localStorage
          if (side === 'left') {
              localStorage.setItem('gemini_model_id', modelId);
          } else {
              localStorage.setItem('gemini_right_model_id', modelId);
          }
      };

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
                            onClick={() => handleModelSelect(model.id)}
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
  }, [currentModelId, rightModelId, availableModels, isModelMenuOpen]);

  const renderHeader = useCallback(() => {
    return (
        <header className="relative flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-[#212121]/90 backdrop-blur-md flex-shrink-0 z-20 border-b border-gray-100 dark:border-[#2f2f2f]">
            <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
                <button onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }} className="p-2 -ml-2 text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors shrink-0">
                    <PanelLeftIcon className="w-5 h-5" />
                </button>
                <div className="w-28 md:w-44 transition-all">
                    {activeKeyObject ? renderModelSelector('left') : (
                        <button 
                            onClick={() => {
                                setIsRightSidebarOpen(true);
                                setTargetRightSidebarTrigger({ section: 'keys', timestamp: Date.now() });
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
                    className={`p-2 -mr-2 transition-colors shrink-0 ${isSplitScreen ? 'text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}
                    title={isSplitScreen ? "关闭分屏" : "开启分屏"}
                >
                    <SplitScreenIcon className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
  }, [isSidebarOpen, isSplitScreen, activeKeyObject, renderModelSelector, leftEngine, rightEngine, currentModelId, rightModelId]);

  // --- Delete Session Handler ---
  const handleDeleteSession = useCallback(async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      
      const currentSid = currentSessionIdRef.current;
      
      // 如果删除的是当前正在查看的历史会话，清空界面
      if (id === currentSid) {
          setMessages([]);
          setRightMessages([]);
          setCurrentSessionId(null);
          setHasUnsavedContent(false);
      }
      
      const newSessions = sessionsRef.current.filter(s => s.id !== id);
      setSessions(newSessions);
      await DB.deleteSession(id);
      
      showToast("会话已删除", 'info');
  }, []);

  // --- Clear All History Handler ---
  const handleClearAllHistory = useCallback(async () => {
      if (window.confirm("确定要删除所有历史记录吗？")) {
          // 清空所有历史记录
          await DB.clearAllSessions();
          setSessions([]);
          
          // 清空当前界面
          setMessages([]);
          setRightMessages([]);
          setCurrentSessionId(null);
          setHasUnsavedContent(false);
          
          showToast("历史记录已清空", 'success');
      }
  }, []);

  // 判断"新对话"按钮是否应该禁用（当前已经是空的新会话）
  const isNewChatDisabled = !hasUnsavedContent && messages.length === 0 && rightMessages.length === 0 && currentSessionId === null;

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
        onDeleteSession={handleDeleteSession}
        onClearAllHistory={handleClearAllHistory}
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
            setKnowledgeFiles(prev => { const next = prev.filter(f => f.id !== id); localStorage.setItem('gemini_knowledge_files', JSON.stringify(next)); return next; });
        }}
        onToggleKnowledge={(id) => {
            setKnowledgeFiles(prev => { const next = prev.map(f => f.id === id ? { ...f, isActive: !f.isActive } : f); localStorage.setItem('gemini_knowledge_files', JSON.stringify(next)); return next; });
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
             setCustomPrompts(prev => { const next = [...prev, p]; localStorage.setItem('gemini_custom_prompts', JSON.stringify(next)); return next; });
             showToast("角色已保存", 'success');
        }}
        onDeleteCustomPrompt={(id) => {
             setCustomPrompts(prev => { const next = prev.filter(p => p.id !== id); localStorage.setItem('gemini_custom_prompts', JSON.stringify(next)); return next; });
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
                        onRegenerate={() => leftEngine.regenerate(messages, currentModelId, getModelName(currentModelId), setMessages)}
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
                            onRegenerate={() => rightEngine.regenerate(rightMessages, rightModelId, getModelName(rightModelId), setRightMessages)}
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
        onSetTheme={setTheme}
      />
    </div>
  );
}
