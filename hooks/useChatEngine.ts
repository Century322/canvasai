
import { useState, useRef, useCallback } from 'react';
import { GeminiService } from '../services/geminiService';
import { AISDKService } from '../services/aiSdkService';
import { Message, MessageRole, Attachment, GenerationConfig, KnowledgeFile, UserTool, ModelProvider } from '../types';

interface UseChatEngineProps {
  geminiService: GeminiService;
  aiSdkService: AISDKService;
  generationConfig: GenerationConfig;
  systemInstruction: string;
  knowledgeFiles: KnowledgeFile[];
  enabledTools: string[];
  userTools: UserTool[];
  activeProvider: ModelProvider;
}

const retrieveRelevantContext = (query: string, files: KnowledgeFile[], maxChars: number = 30000): string => {
    if (files.length === 0) return "";

    const CHUNK_SIZE = 800;
    const OVERLAP = 100;
    
    const keywords = query.toLowerCase()
        .replace(/[^\w\s\u4e00-\u9fa5]/g, '')
        .split(/\s+/)
        .filter(k => k.length > 1);

    if (keywords.length === 0) return files.map(f => f.content.slice(0, 2000)).join('\n\n');

    interface ScoredChunk {
        fileName: string;
        content: string;
        score: number;
    }

    const allChunks: ScoredChunk[] = [];

    files.forEach(file => {
        let start = 0;
        while (start < file.content.length) {
            const end = Math.min(start + CHUNK_SIZE, file.content.length);
            const chunkText = file.content.slice(start, end);
            const lowerChunk = chunkText.toLowerCase();
            
            let score = 0;
            keywords.forEach(k => {
                if (lowerChunk.includes(k)) score += 1;
            });

            if (score > 0) {
                allChunks.push({
                    fileName: file.name,
                    content: chunkText,
                    score: score
                });
            }

            start += (CHUNK_SIZE - OVERLAP);
        }
    });

    allChunks.sort((a, b) => b.score - a.score);

    let contextBuffer = "";
    let usedChars = 0;
    const topChunks = allChunks.slice(0, 15);

    for (const chunk of topChunks) {
        const entry = `\n--- Fragment from ${chunk.fileName} (Relevance: ${chunk.score}) ---\n${chunk.content}\n`;
        if (usedChars + entry.length > maxChars) break;
        contextBuffer += entry;
        usedChars += entry.length;
    }

    if (!contextBuffer) return "";
    return `[Smart Context Retrieval]\nThe following are relevant document fragments found for the user's query:\n${contextBuffer}\n\n`;
};

export const useChatEngine = ({
  geminiService,
  aiSdkService,
  generationConfig,
  systemInstruction,
  knowledgeFiles,
  enabledTools,
  userTools,
  activeProvider
}: UseChatEngineProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (
    text: string,
    attachments: Attachment[],
    history: Message[],
    modelId: string,
    modelName: string,
    onUpdateMessages: (updatedMessages: Message[]) => void,
    isHidden: boolean = false
  ) => {
    if (!modelId) throw new Error("未选择模型");

    const userMsgId = crypto.randomUUID();
    const userMsg: Message = {
      id: userMsgId,
      role: MessageRole.USER,
      content: text,
      attachments,
      timestamp: Date.now(),
      isHidden
    };

    const newHistory = [...history, userMsg];
    
    let finalSystemInstruction = systemInstruction;
    const activeFiles = knowledgeFiles.filter(f => f.isActive);
    
    if (activeFiles.length > 0) {
        const ragContext = retrieveRelevantContext(text, activeFiles);
        if (ragContext) {
            finalSystemInstruction += `\n\n${ragContext}\nUser Question: ${text}`;
        }
    }

    const botMsgId = crypto.randomUUID();
    const botMsg: Message = {
      id: botMsgId,
      role: MessageRole.MODEL,
      content: '',
      timestamp: Date.now(),
      modelId: modelId,
      modelName: modelName
    };

    const messagesWithBot = [...newHistory, botMsg];
    onUpdateMessages(messagesWithBot);
    
    setIsLoading(true);

    const prevController = abortControllerRef.current;
    abortControllerRef.current = new AbortController();
    if (prevController) {
      prevController.abort();
    }

    const useAiSdk = activeProvider !== 'google';

    try {
      if (useAiSdk) {
        await aiSdkService.sendMessageStream(
          modelId,
          text,
          attachments,
          newHistory,
          finalSystemInstruction,
          generationConfig,
          enabledTools,
          userTools,
          (content) => {
            onUpdateMessages(messagesWithBot.map(m => 
              m.id === botMsgId ? { ...m, content } : m
            ));
          },
          abortControllerRef.current.signal
        );
      } else {
        await geminiService.sendMessageStream(
          modelId,
          text,
          attachments,
          newHistory,
          finalSystemInstruction,
          generationConfig,
          (content, metadata) => {
            onUpdateMessages(messagesWithBot.map(m => 
              m.id === botMsgId ? { 
                  ...m, 
                  content, 
                  groundingMetadata: metadata || m.groundingMetadata 
              } : m
            ));
          },
          abortControllerRef.current.signal
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
         onUpdateMessages(messagesWithBot.map(m => 
            m.id === botMsgId ? { ...m, isError: true, content: error.message || "生成出错" } : m
         ));
         throw error; 
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [geminiService, aiSdkService, generationConfig, systemInstruction, knowledgeFiles, enabledTools, userTools, activeProvider]);

  const regenerate = useCallback(async (
      history: Message[], 
      modelId: string, 
      modelName: string,
      onUpdateMessages: (updatedMessages: Message[]) => void
  ) => {
      const lastMsg = history[history.length - 1];
      if (!lastMsg || lastMsg.role !== MessageRole.MODEL) return;

      const historyWithoutLastBot = history.slice(0, -1);
      const lastUserMsg = historyWithoutLastBot[historyWithoutLastBot.length - 1];
      
      if (!lastUserMsg || lastUserMsg.role !== MessageRole.USER) return;

      onUpdateMessages(historyWithoutLastBot);

      await sendMessage(
          lastUserMsg.content, 
          lastUserMsg.attachments || [], 
          historyWithoutLastBot.slice(0, -1), 
          modelId, 
          modelName,
          onUpdateMessages,
          lastUserMsg.isHidden
      );

  }, [sendMessage]);

  return {
    sendMessage,
    regenerate,
    stopGeneration,
    isLoading
  };
};
