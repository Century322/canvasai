import React, { useState, useRef, useCallback, useMemo } from 'react';
import { ModelCapability, Message } from '../types';
import { ChevronDownIcon } from './Icons';

interface ModelSelectorProps {
  side: 'left' | 'right';
  selectedId: string;
  onSelect: (id: string) => void;
  availableModels: ModelCapability[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  side,
  selectedId,
  onSelect,
  availableModels,
  messages,
  setMessages,
  showToast
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inheritContext, setInheritContext] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedModel = useMemo(() => {
    return availableModels.find(m => m.id === selectedId);
  }, [availableModels, selectedId]);

  const filteredModels = useMemo(() => {
    return availableModels
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
        if (a.isAvailable !== false && b.isAvailable === false) return -1;
        if (a.isAvailable === false && b.isAvailable !== false) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [availableModels, searchTerm]);

  const handleSelect = useCallback((modelId: string) => {
    if (inheritContext && selectedId !== modelId) {
      if (messages.length > 0) {
        const newMessages = messages.map(msg => ({
          ...msg,
          modelId: modelId
        }));
        setMessages(newMessages);
        showToast('已继承对话历史', 'info');
      }
    }
    onSelect(modelId);
    setIsOpen(false);
    
    if (side === 'left') {
      localStorage.setItem('gemini_model_id', modelId);
    } else {
      localStorage.setItem('gemini_right_model_id', modelId);
    }
  }, [inheritContext, selectedId, messages, setMessages, showToast, onSelect, side]);

  const handleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
    setTimeout(() => {
      if (!isOpen && selectedId && dropdownRef.current) {
        const selectedModel = dropdownRef.current.querySelector(`[data-model-id="${selectedId}"]`);
        if (selectedModel) {
          selectedModel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 100);
  }, [isOpen, selectedId]);

  if (availableModels.length === 0) {
    return (
      <button 
        className="text-sm font-semibold text-gray-400 dark:text-gray-500 cursor-pointer whitespace-nowrap hover:text-gray-700 dark:hover:text-gray-200 transition-all animate-pulse"
      >
        暂无模型
      </button>
    );
  }

  return (
    <div className="relative w-full">
      <button 
        onClick={handleOpen}
        className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg transition-colors group hover:bg-gray-100 dark:hover:bg-[#2f2f2f]"
      >
        <span className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
          {selectedModel?.name || "选择模型"}
        </span>
        <ChevronDownIcon className={`w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
      )}

      {isOpen && (
        <div 
          ref={dropdownRef} 
          className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-white dark:bg-[#2f2f2f] rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 py-1 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[400px] overflow-y-auto custom-scrollbar"
        >
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索模型..."
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#383838] text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
          
          {filteredModels.length > 0 ? (
            <>
              {filteredModels.map(model => (
                <button
                  key={model.id}
                  data-model-id={model.id}
                  onClick={() => model.isAvailable !== false && handleSelect(model.id)}
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
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">视频</span>
                      )}
                      {model.supportsAudio && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">音频</span>
                      )}
                      {model.isThinking && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400">推理</span>
                      )}
                      {model.isOnline && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300">联网</span>
                      )}
                      {model.contextWindow && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400">{model.contextWindow}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 truncate">{model.description}</span>
                  </div>
                  {selectedId === model.id && <div className="w-1.5 h-1.5 rounded-full bg-gray-700 dark:bg-gray-300 shrink-0"></div>}
                </button>
              ))}
              
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inheritContext}
                    onChange={(e) => setInheritContext(e.target.checked)}
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
};

export default ModelSelector;
