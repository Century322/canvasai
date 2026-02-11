
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
  
  // --- Model Selector State ---
  const [modelSearch, setModelSearch] = useState<string>('');
  const [rightModelSearch, setRightModelSearch] = useState<string>('');
  const [inheritContext, setInheritContext] = useState<boolean>(false);
  const [rightInheritContext, setRightInheritContext] = useState<boolean>(false);
  const leftDropdownRef = useRef<HTMLDivElement>(null);
  const rightDropdownRef = useRef<HTMLDivElement>(null);

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
      setToasts(prev => {
          // 添加新消息到数组开头
          const newToasts = [{ id: crypto.randomUUID(), message, type }, ...prev];
          // 只保留最新的3条消息
          return newToasts.slice(0, 3);
      });
  };
  const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  // --- Theme Management (完全跟随系统) ---
  
  // 应用系统主题到 DOM
  const applySystemTheme = () => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setTheme(isDark ? 'dark' : 'light');
  };

  // 初始化：应用系统主题
  useEffect(() => {
    applySystemTheme();
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applySystemTheme();
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

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
      const searchTerm = side === 'left' ? modelSearch : rightModelSearch;
      const setSearchTerm = side === 'left' ? setModelSearch : setRightModelSearch;
      const inheritCtx = side === 'left' ? inheritContext : rightInheritContext;
      const setInheritCtx = side === 'left' ? setInheritContext : setRightInheritContext;
      const dropdownRef = side === 'left' ? leftDropdownRef : rightDropdownRef;

      const handleModelSelect = (modelId: string) => {
          if (inheritCtx && selectedId !== modelId) {
              // 继承上下文逻辑
              const currentMessages = side === 'left' ? messages : rightMessages;
              if (currentMessages.length > 0) {
                  // 实际的上下文转换逻辑
                  const newMessages = currentMessages.map(msg => ({
                      ...msg,
                      modelId: modelId
                  }));
                  
                  // 更新消息列表，保持对话历史
                  if (side === 'left') {
                      setMessages(newMessages);
                  } else {
                      setRightMessages(newMessages);
                  }
                  
                  showToast('已继承对话历史', 'info');
              }
          }
          setSelected(modelId);
          setIsModelMenuOpen(null);
          // 保存到 localStorage
          if (side === 'left') {
              localStorage.setItem('gemini_model_id', modelId);
          } else {
              localStorage.setItem('gemini_right_model_id', modelId);
          }
      };

      const handleDropdownOpen = () => {
          setIsModelMenuOpen(isModelMenuOpen === side ? null : side);
          // 自动滚动到选中的模型
          setTimeout(() => {
              if (isModelMenuOpen !== side && selectedId && dropdownRef.current) {
                  const selectedModel = dropdownRef.current.querySelector(`[data-model-id="${selectedId}"]`);
                  if (selectedModel) {
                      selectedModel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
              }
          }, 100);
      };

      // 过滤模型
      const filteredModels = availableModels
          .filter(model => {
              if (!searchTerm) return true;
              const searchLower = searchTerm.toLowerCase();
              return (
                  model.name.toLowerCase().includes(searchLower) ||
                  model.id.toLowerCase().includes(searchLower) ||
                  (model.description && model.description.toLowerCase().includes(searchLower))
              );
          })
          .sort((a, b) => {
              // 可用的模型排在前面，不可用的排在后面
              if (a.isAvailable !== false && b.isAvailable === false) return -1;
              if (a.isAvailable === false && b.isAvailable !== false) return 1;
              // 可用模型内部按名称排序
              return a.name.localeCompare(b.name);
          });

      return (
        <div className="relative w-full">
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    handleDropdownOpen();
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
                <div ref={dropdownRef} className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-white dark:bg-[#2f2f2f] rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 py-1 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {/* 搜索框 */}
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="搜索模型..."
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#383838] text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400"
                        />
                    </div>
                    
                    {/* 模型列表 */}
                    {filteredModels.length > 0 ? (
                        <>
                            {filteredModels.map(model => (
                                <button
                                    key={model.id}
                                    data-model-id={model.id}
                                    onClick={() => model.isAvailable !== false && handleModelSelect(model.id)}
                                    disabled={model.isAvailable === false}
                                    className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                                        model.isAvailable === false 
                                            ? 'opacity-50 cursor-not-allowed' 
                                            : selectedId === model.id 
                                            ? 'bg-gray-50 dark:bg-[#383838] hover:bg-gray-50 dark:hover:bg-[#383838]' 
                                            : 'hover:bg-gray-50 dark:hover:bg-[#383838]'
                                    }`}
                                >
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-sm font-medium truncate ${model.isAvailable === false ? 'text-gray-400 dark:text-gray-500' : selectedId === model.id ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}>{model.name}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {model.supportsImages && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 flex items-center gap-0.5">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    视觉
                                                </span>
                                            )}
                                            {model.supportsVideoGen && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 flex items-center gap-0.5">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    视频
                                                </span>
                                            )}
                                            {model.supportsAudio && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 flex items-center gap-0.5">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                                    </svg>
                                                    音频
                                                </span>
                                            )}
                                            {model.isThinking && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400 flex items-center gap-0.5">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                    </svg>
                                                    推理
                                                </span>
                                            )}
                                            {model.isOnline && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300 flex items-center gap-0.5">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                                                    </svg>
                                                    联网
                                                </span>
                                            )}
                                            {model.contextWindow && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 flex items-center gap-0.5">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                                    </svg>
                                                    {model.contextWindow}
                                                </span>
                                            )}
                                            {model.isPaid === true && (
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${model.paymentTier === 'pro' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                                    {model.paymentTier === 'pro' ? 'Pro' : '付费'}
                                                </span>
                                            )}
                                            {model.isPaid === false && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                                    免费
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-400 truncate">{model.description}</span>
                                        {model.isAvailable === false && (
                                            <span className="text-[9px] text-gray-500 dark:text-gray-600">不可用</span>
                                        )}
                                    </div>
                                    {selectedId === model.id && <div className="w-1.5 h-1.5 rounded-full bg-gray-700 dark:bg-gray-300 shrink-0"></div>}
                                </button>
                            ))}
                            
                            {/* 继承上下文选项 */}
                            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={inheritCtx}
                                        onChange={(e) => setInheritCtx(e.target.checked)}
                                        className="w-3.5 h-3.5 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                                    />
                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                        切换模型时继承对话历史
                                    </span>
                                </label>
                            </div>
                        </>
                    ) : (
                        <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                            没有找到匹配的模型
                        </div>
                    )}
                </div>
            )}
        </div>
      );
  }, [currentModelId, rightModelId, availableModels, isModelMenuOpen, modelSearch, rightModelSearch, setModelSearch, setRightModelSearch, inheritContext, rightInheritContext, setInheritContext, setRightInheritContext, messages, rightMessages, showToast, leftDropdownRef, rightDropdownRef]);

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
                                // 使用新的对象引用确保 useEffect 触发
                                const newTrigger = { section: 'keys', timestamp: Date.now() };
                                setTargetRightSidebarTrigger(newTrigger);
                                // 强制重新渲染后再打开侧边栏
                                setTimeout(() => {
                                    setIsRightSidebarOpen(true);
                                }, 0);
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
        targetSectionTrigger={targetRightSidebarTrigger}
        isIncognito={isIncognito}
        onToggleIncognito={() => setIsIncognito(!isIncognito)}
        theme={theme}
      />
    </div>
  );
}
