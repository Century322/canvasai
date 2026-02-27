import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatSession, Message, MessageRole } from '../types';
import { DB } from '../utils/db';
import { INITIAL_SYSTEM_INSTRUCTION } from '../constants';

interface UseSessionManagerProps {
  isIncognitoRef: React.MutableRefObject<boolean>;
  leftSystemInstructionRef: React.MutableRefObject<string>;
  rightSystemInstructionRef: React.MutableRefObject<string>;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const useSessionManager = ({
  isIncognitoRef,
  leftSystemInstructionRef,
  rightSystemInstructionRef,
  showToast
}: UseSessionManagerProps) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [rightMessages, setRightMessages] = useState<Message[]>([]);
  const [hasUnsavedContent, setHasUnsavedContent] = useState(false);

  const sessionsRef = useRef<ChatSession[]>([]);
  const currentSessionIdRef = useRef<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const rightMessagesRef = useRef<Message[]>([]);

  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);
  useEffect(() => { currentSessionIdRef.current = currentSessionId; }, [currentSessionId]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { rightMessagesRef.current = rightMessages; }, [rightMessages]);

  const getLastMessageTimestamp = useCallback((msgs: Message[], rightMsgs: Message[]): number => {
    const allMsgs = [...msgs, ...rightMsgs];
    if (allMsgs.length === 0) return Date.now();
    return Math.max(...allMsgs.map(m => m.timestamp));
  }, []);

  const saveCurrentChatToHistory = useCallback(async (
    msgs: Message[] = messagesRef.current,
    rightMsgs: Message[] = rightMessagesRef.current
  ): Promise<string | null> => {
    if (msgs.length === 0 && rightMsgs.length === 0) {
      return null;
    }
    
    if (isIncognitoRef.current) {
      return null;
    }

    let title = '新对话';
    const firstUserMsg = msgs.find(m => m.role === MessageRole.USER);
    if (firstUserMsg) {
      title = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '');
    }

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
    
    await DB.saveSession(newSession);
    
    setSessions(prev => {
      const updated = [{
        ...newSession,
        messages: new Array(msgs.length).fill({} as Message),
        rightMessages: new Array(rightMsgs.length).fill({} as Message)
      }, ...prev];
      updated.sort((a, b) => b.timestamp - a.timestamp);
      return updated;
    });
    
    return newSession.id;
  }, [getLastMessageTimestamp, isIncognitoRef, leftSystemInstructionRef, rightSystemInstructionRef]);

  const updateExistingSession = useCallback(async (
    sessionId: string,
    msgs: Message[] = messagesRef.current,
    rightMsgs: Message[] = rightMessagesRef.current
  ): Promise<void> => {
    if (!sessionId) return;
    
    if (isIncognitoRef.current) return;

    let title = '新对话';
    const firstUserMsg = msgs.find(m => m.role === MessageRole.USER);
    if (firstUserMsg) {
      title = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '');
    }

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
    
    await DB.saveSession(updatedSession);
    
    setSessions(prev => {
      const updated = prev.map(s => s.id === sessionId ? {
        ...updatedSession,
        messages: new Array(msgs.length).fill({} as Message),
        rightMessages: new Array(rightMsgs.length).fill({} as Message)
      } : s);
      updated.sort((a, b) => b.timestamp - a.timestamp);
      return updated;
    });
  }, [getLastMessageTimestamp, isIncognitoRef, leftSystemInstructionRef, rightSystemInstructionRef]);

  const loadSessions = useCallback(async () => {
    try {
      const loadedSessions = await DB.getAllSessions();
      const summaries = loadedSessions.map(s => ({
        ...s,
        messages: [],
        rightMessages: []
      }));
      setSessions(summaries);
      setCurrentSessionId(null);
      setMessages([]);
      setRightMessages([]);
      setHasUnsavedContent(false);
    } catch {
      setSessions([]);
      setCurrentSessionId(null);
      setMessages([]);
      setRightMessages([]);
      setHasUnsavedContent(false);
    }
  }, []);

  const createNewSession = useCallback(async (
    setLeftSystemInstruction: (val: string) => void,
    setRightSystemInstruction: (val: string) => void
  ) => {
    const currentSid = currentSessionIdRef.current;
    const currentMsgs = messagesRef.current;
    const currentRightMsgs = rightMessagesRef.current;
    
    if (currentSid === null) {
      if (currentMsgs.length > 0 || currentRightMsgs.length > 0) {
        await saveCurrentChatToHistory(currentMsgs, currentRightMsgs);
      }
    } else {
      await updateExistingSession(currentSid, currentMsgs, currentRightMsgs);
    }

    setMessages([]);
    setRightMessages([]);
    setLeftSystemInstruction(INITIAL_SYSTEM_INSTRUCTION);
    setRightSystemInstruction(INITIAL_SYSTEM_INSTRUCTION);
    setCurrentSessionId(null);
    setHasUnsavedContent(false);
    
    showToast("已创建新对话", 'info');
  }, [saveCurrentChatToHistory, updateExistingSession, showToast]);

  const switchSession = useCallback(async (sid: string) => {
    const currentSid = currentSessionIdRef.current;
    const currentMsgs = messagesRef.current;
    const currentRightMsgs = rightMessagesRef.current;
    
    if (currentSid === null) {
      if (currentMsgs.length > 0 || currentRightMsgs.length > 0) {
        await saveCurrentChatToHistory(currentMsgs, currentRightMsgs);
      }
    } else {
      await updateExistingSession(currentSid, currentMsgs, currentRightMsgs);
    }

    setMessages([]);
    setRightMessages([]);
    setCurrentSessionId(sid);
    setHasUnsavedContent(false);

    const session = await DB.getSession(sid);
    if (session) {
      setMessages(session.messages);
      setRightMessages(session.rightMessages || []);
      return {
        leftSystemInstruction: session.leftSystemInstruction || INITIAL_SYSTEM_INSTRUCTION,
        rightSystemInstruction: session.rightSystemInstruction || INITIAL_SYSTEM_INSTRUCTION
      };
    } else {
      showToast("加载会话失败", "error");
      setCurrentSessionId(null);
      return null;
    }
  }, [saveCurrentChatToHistory, updateExistingSession, showToast]);

  const deleteSession = useCallback(async (id: string) => {
    const currentSid = currentSessionIdRef.current;
    
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
  }, [showToast]);

  const clearAllHistory = useCallback(async () => {
    if (window.confirm("确定要删除所有历史记录吗？")) {
      await DB.clearAllSessions();
      setSessions([]);
      setMessages([]);
      setRightMessages([]);
      setCurrentSessionId(null);
      setHasUnsavedContent(false);
      showToast("历史记录已清空", 'success');
    }
  }, [showToast]);

  const realtimeUpdateSession = useCallback(async () => {
    const currentSid = currentSessionIdRef.current;
    const currentMsgs = messagesRef.current;
    const currentRightMsgs = rightMessagesRef.current;
    
    if (currentSid !== null && !isIncognitoRef.current) {
      if (currentMsgs.length > 0 || currentRightMsgs.length > 0) {
        let title = '新对话';
        const firstUserMsg = currentMsgs.find(m => m.role === MessageRole.USER);
        if (firstUserMsg) {
          title = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '');
        }

        const lastTimestamp = getLastMessageTimestamp(currentMsgs, currentRightMsgs);

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
        
        setSessions(prev => {
          const updated = prev.map(s => s.id === currentSid ? {
            ...updatedSession,
            messages: new Array(currentMsgs.length).fill({} as Message),
            rightMessages: new Array(currentRightMsgs.length).fill({} as Message)
          } : s);
          updated.sort((a, b) => b.timestamp - a.timestamp);
          return updated;
        });
      }
    }
  }, [getLastMessageTimestamp, isIncognitoRef, leftSystemInstructionRef, rightSystemInstructionRef]);

  return {
    sessions,
    setSessions,
    currentSessionId,
    setCurrentSessionId,
    messages,
    setMessages,
    rightMessages,
    setRightMessages,
    hasUnsavedContent,
    setHasUnsavedContent,
    sessionsRef,
    currentSessionIdRef,
    messagesRef,
    rightMessagesRef,
    loadSessions,
    createNewSession,
    switchSession,
    deleteSession,
    clearAllHistory,
    saveCurrentChatToHistory,
    updateExistingSession,
    realtimeUpdateSession,
    getLastMessageTimestamp
  };
};
