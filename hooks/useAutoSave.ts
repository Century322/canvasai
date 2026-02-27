import { useEffect, useCallback } from 'react';
import { ChatSession, Message, MessageRole } from '../types';
import { DB } from '../utils/db';

interface UseAutoSaveProps {
  currentSessionIdRef: React.MutableRefObject<string | null>;
  messagesRef: React.MutableRefObject<Message[]>;
  rightMessagesRef: React.MutableRefObject<Message[]>;
  isIncognitoRef: React.MutableRefObject<boolean>;
  leftSystemInstructionRef: React.MutableRefObject<string>;
  rightSystemInstructionRef: React.MutableRefObject<string>;
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
}

const AUTO_SAVE_KEY = 'gemini_auto_save';

export const useAutoSave = ({
  currentSessionIdRef,
  messagesRef,
  rightMessagesRef,
  isIncognitoRef,
  leftSystemInstructionRef,
  rightSystemInstructionRef,
  setSessions
}: UseAutoSaveProps) => {

  const getLastMessageTimestamp = useCallback((msgs: Message[], rightMsgs: Message[]): number => {
    const allMsgs = [...msgs, ...rightMsgs];
    if (allMsgs.length === 0) return Date.now();
    return Math.max(...allMsgs.map(m => m.timestamp));
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentSid = currentSessionIdRef.current;
      const currentMsgs = messagesRef.current;
      const currentRightMsgs = rightMessagesRef.current;
      
      if ((currentMsgs.length > 0 || currentRightMsgs.length > 0) && !isIncognitoRef.current) {
        let title = '新对话';
        const firstUserMsg = currentMsgs.find(m => m.role === MessageRole.USER);
        if (firstUserMsg) {
          title = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '');
        }

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
        
        const existingData = localStorage.getItem(AUTO_SAVE_KEY);
        let autoSaveList: ChatSession[] = [];
        if (existingData) {
          try {
            autoSaveList = JSON.parse(existingData);
          } catch { /* ignore */ }
        }
        
        const existingIndex = autoSaveList.findIndex(s => s.id === sessionToSave.id);
        if (existingIndex >= 0) {
          autoSaveList[existingIndex] = sessionToSave;
        } else {
          autoSaveList.push(sessionToSave);
        }
        
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(autoSaveList));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentSessionIdRef, messagesRef, rightMessagesRef, isIncognitoRef, leftSystemInstructionRef, rightSystemInstructionRef]);

  const restoreAutoSave = useCallback(async () => {
    const autoSaveData = localStorage.getItem(AUTO_SAVE_KEY);
    if (autoSaveData) {
      try {
        const autoSaveList: ChatSession[] = JSON.parse(autoSaveData);
        if (autoSaveList.length > 0) {
          for (const session of autoSaveList) {
            await DB.saveSession(session);
          }
          
          setSessions(prev => {
            const updated = [...prev];
            for (const session of autoSaveList) {
              const existingIndex = updated.findIndex(s => s.id === session.id);
              if (existingIndex >= 0) {
                updated[existingIndex] = {
                  ...session,
                  messages: new Array(session.messages.length).fill({} as Message),
                  rightMessages: new Array(session.rightMessages.length).fill({} as Message)
                };
              } else {
                updated.push({
                  ...session,
                  messages: new Array(session.messages.length).fill({} as Message),
                  rightMessages: new Array(session.rightMessages.length).fill({} as Message)
                });
              }
            }
            updated.sort((a, b) => b.timestamp - a.timestamp);
            return updated;
          });
          
          localStorage.removeItem(AUTO_SAVE_KEY);
        }
      } catch { /* ignore */ }
    }
  }, [setSessions]);

  return {
    restoreAutoSave,
    getLastMessageTimestamp
  };
};
