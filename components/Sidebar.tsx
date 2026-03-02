
import React, { useState, useRef, useEffect } from 'react';
import { ChatSession, KnowledgeFile, PromptPreset, Message, MessageRole } from '../types';
import { 
    NewChatIcon, TrashIcon, BotIcon, 
    FileTextIcon, UploadIcon,
    ChevronLeftIcon, ChevronRightIcon,
    XIcon, PlusIcon, DownloadIcon, EditIcon, SplitScreenIcon, PinIcon
} from './Icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSwitchSession: (id: string) => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  onClearAllHistory: () => void;
  isNewChatDisabled?: boolean; // 当当前已经是空的新会话时禁用
  
  // Knowledge Base Props
  knowledgeFiles: KnowledgeFile[];
  onUploadKnowledge: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteKnowledge: (id: string) => void;
  onToggleKnowledge: (id: string) => void;
  onToggleKnowledgeSide?: (id: string, side: 'left' | 'right') => void; // Toggle knowledge for left/right side

  // Agent Props
  customPrompts: PromptPreset[];
  isSplitScreen?: boolean; // Whether in split screen mode
  onSelectPreset: (content: string) => void;
  onAddCustomPrompt: (preset: PromptPreset) => void; // Moved from RightSidebar
  onDeleteCustomPrompt: (id: string) => void; // Moved from RightSidebar
  onEditCustomPrompt?: (preset: PromptPreset) => void; // Edit custom prompt
  onTogglePrompt?: (id: string) => void; // Toggle prompt active state
  onTogglePromptSide?: (id: string, side: 'left' | 'right') => void; // Toggle prompt for left/right side

  // Gallery Props (derived from all sessions) - Kept in interface to match App.tsx but unused
  allMessages: Message[];
  onJumpToMessage: (sessionId: string, messageId: string) => void;
  
  // Full width change callback
  onFullWidthChange?: (isFullWidth: boolean) => void;
}

const Sidebar: React.FC<Props> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onNewChat,
  onSwitchSession,
  onDeleteSession,
  onClearAllHistory,
  isNewChatDisabled,
  knowledgeFiles,
  onUploadKnowledge,
  onDeleteKnowledge,
  onToggleKnowledge,
  onToggleKnowledgeSide,
  customPrompts,
  isSplitScreen,
  onSelectPreset,
  onAddCustomPrompt,
  onDeleteCustomPrompt,
  onEditCustomPrompt,
  onTogglePrompt,
  onTogglePromptSide,
  onFullWidthChange
}) => {
  const [currentView, setCurrentView] = useState<number>(0);
  const [isFullWidth, setIsFullWidth] = useState(false);
  
  // Custom Role Modal State
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptPreset | null>(null);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptDesc, setNewPromptDesc] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');

  // Mobile long press menu state
  const [contextMenuSession, setContextMenuSession] = useState<ChatSession | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Knowledge & Prompt context menu
  const [contextMenuKnowledge, setContextMenuKnowledge] = useState<KnowledgeFile | null>(null);
  const [contextMenuPrompt, setContextMenuPrompt] = useState<PromptPreset | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTouchStart = (e: React.TouchEvent, session: ChatSession) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    longPressTimerRef.current = setTimeout(() => {
      setContextMenuSession(session);
      setContextMenuPosition({ x: touch.clientX, y: touch.clientY });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCloseContextMenu = () => {
    setContextMenuSession(null);
    setContextMenuKnowledge(null);
    setContextMenuPrompt(null);
  };

  // Knowledge long press
  const handleKnowledgeTouchStart = (e: React.TouchEvent, file: KnowledgeFile) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    longPressTimerRef.current = setTimeout(() => {
      setContextMenuKnowledge(file);
      setContextMenuPosition({ x: touch.clientX, y: touch.clientY });
    }, 500);
  };

  // Prompt long press
  const handlePromptTouchStart = (e: React.TouchEvent, prompt: PromptPreset) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    longPressTimerRef.current = setTimeout(() => {
      setContextMenuPrompt(prompt);
      setContextMenuPosition({ x: touch.clientX, y: touch.clientY });
    }, 500);
  };

  const handlePinSession = (session: ChatSession) => {
    console.log('Pin session:', session.id);
    setContextMenuSession(null);
  };

  const handlePinKnowledge = (file: KnowledgeFile) => {
    console.log('Pin knowledge:', file.id);
    setContextMenuKnowledge(null);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const TOTAL_VIEWS = 3; // Reduced views

  // Show all sessions (they are kept in memory after creation)
  const visibleSessions = sessions;

  const handlePrevView = () => {
      setCurrentView(prev => Math.max(0, prev - 1));
  };

  const handleNextView = () => {
      setCurrentView(prev => Math.min(TOTAL_VIEWS - 1, prev + 1));
  };

  const getViewTitle = () => {
      switch(currentView) {
          case 0: return "历史记录";
          case 1: return "知识库";
          case 2: return "助手市场";
          default: return "";
      }
  };

  const handleSaveRole = () => {
      if (!newPromptName || !newPromptContent) return;
      onAddCustomPrompt({
          id: crypto.randomUUID(),
          name: newPromptName,
          description: newPromptDesc || '暂无描述',
          content: newPromptContent,
          isActive: true,
          leftEnabled: false,
          rightEnabled: false
      });
      setNewPromptName('');
      setNewPromptDesc('');
      setNewPromptContent('');
      setIsCreatorOpen(false);
  };

  const handleEditRole = (prompt: PromptPreset) => {
      setEditingPrompt(prompt);
      setNewPromptName(prompt.name);
      setNewPromptDesc(prompt.description);
      setNewPromptContent(prompt.content);
      setIsEditorOpen(true);
  };

  const handleUpdateRole = () => {
      if (!editingPrompt || !newPromptName || !newPromptContent) return;
      if (onEditCustomPrompt) {
          onEditCustomPrompt({
              ...editingPrompt,
              name: newPromptName,
              description: newPromptDesc || '暂无描述',
              content: newPromptContent
          });
      }
      setNewPromptName('');
      setNewPromptDesc('');
      setNewPromptContent('');
      setEditingPrompt(null);
      setIsEditorOpen(false);
  };

  const handleCloseEditor = () => {
      setNewPromptName('');
      setNewPromptDesc('');
      setNewPromptContent('');
      setEditingPrompt(null);
      setIsEditorOpen(false);
  };

  const handleExportMarkdown = (e: React.MouseEvent, session: ChatSession) => {
      e.stopPropagation();
      let mdContent = `# ${session.title}\n\n`;
      session.messages.forEach(msg => {
          const role = msg.role === MessageRole.USER ? 'User' : (msg.modelName || 'AI');
          mdContent += `### ${role}:\n\n${msg.content}\n\n`;
      });
      
      const blob = new Blob([mdContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const widthClass = isFullWidth ? 'w-full max-w-5xl' : 'w-[280px] max-w-[85vw]';

  // Dynamic grid classes based on expansion state
  const gridClass = isFullWidth 
    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3' 
    : 'grid-cols-1 gap-2';

  return (
    <>
      {/* Backdrop for mobile sidebar */}
      <div 
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Backdrop for full width sidebar on PC */}
      <div 
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300 hidden md:block ${isOpen && isFullWidth ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <div className={`fixed top-0 left-0 h-full ${widthClass} bg-white dark:bg-[#212121] border-r border-gray-200 dark:border-[#2f2f2f] z-50 transform transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl md:shadow-xl`}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-[#2f2f2f] bg-white dark:bg-[#212121] flex-shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
                 <div className="font-bold text-lg text-gray-800 dark:text-gray-100 tracking-tight flex-shrink-0">
                    Canvas
                 </div>
                 
                 {/* Divider */}
                 <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-700 flex-shrink-0"></div>

                 {/* View Indicator (Icon removed as requested) */}
                 <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider min-w-0">
                    <span className="truncate">{getViewTitle()}</span>
                 </div>
            </div>

            <button 
                onClick={() => {
                    const newFullWidth = !isFullWidth;
                    setIsFullWidth(newFullWidth);
                    if (onFullWidthChange) {
                        onFullWidthChange(newFullWidth);
                    }
                }}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors shrink-0"
                title={isFullWidth ? "收缩侧边栏" : "展开侧边栏"}
            >
                {isFullWidth ? <ChevronLeftIcon className="w-5 h-5" /> : <ChevronRightIcon className="w-5 h-5" />}
            </button>
        </div>

        {/* Dynamic Content Area with Animation */}
        <div className={`flex-1 overflow-hidden bg-white dark:bg-[#212121] flex flex-col`}>
            <div 
                key={currentView} 
                className="animate-in fade-in slide-in-from-right-4 duration-300 ease-out h-full flex flex-col overflow-hidden"
            >
                {/* View 0: Chat History */}
                {currentView === 0 && (
                    <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
                        <button 
                            type="button"
                            onClick={() => {
                                if (!isNewChatDisabled) {
                                    onNewChat();
                                    if (window.innerWidth < 768) onClose();
                                }
                            }}
                            disabled={isNewChatDisabled}
                            className={`w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all group ${
                                isNewChatDisabled 
                                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            <NewChatIcon className={`w-4 h-4 transition-colors ${
                                isNewChatDisabled 
                                    ? 'text-gray-300 dark:text-gray-600' 
                                    : 'text-gray-400 group-hover:text-gray-700 dark:text-gray-500 dark:group-hover:text-gray-200'
                            }`} />
                            <span>{isNewChatDisabled ? '当前已是新对话' : '开启新对话'}</span>
                        </button>

                        {visibleSessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                <span className="text-4xl mb-2 opacity-20">💬</span>
                                <span className="text-xs italic">暂无历史记录</span>
                                <span className="text-[10px] text-gray-300 mt-1">开始对话后将自动保存</span>
                            </div>
                        ) : (
                            <div className={`grid ${gridClass} transition-all duration-300`}>
                            {visibleSessions.map(session => (
                                <div 
                                    key={session.id}
                                    onClick={() => {
                                        onSwitchSession(session.id);
                                        if (window.innerWidth < 768) onClose();
                                    }}
                                    onTouchStart={(e) => handleTouchStart(e, session)}
                                    onTouchEnd={handleTouchEnd}
                                    onTouchMove={handleTouchEnd}
                                    className={`group relative flex items-start justify-between p-3.5 rounded-xl cursor-pointer transition-all border 
                                        ${currentSessionId === session.id 
                                            ? 'bg-white dark:bg-[#212121] border-gray-400/50 shadow-md ring-1 ring-gray-400/20' 
                                            : 'bg-white/50 dark:bg-[#212121]/50 border-transparent hover:bg-white dark:hover:bg-[#212121] hover:shadow-sm'
                                        }`}
                                >
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className={`text-sm font-medium truncate mb-0.5 ${currentSessionId === session.id ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {session.title}
                                            {/* Show split screen indicator if has right messages */}
                                            {session.rightMessages && session.rightMessages.length > 0 && (
                                                <SplitScreenIcon className="inline-block w-3 h-3 ml-1.5 text-orange-500" />
                                            )}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-mono">
                                            {new Date(session.timestamp).toLocaleString(undefined, {month:'numeric', day:'numeric', hour:'numeric', minute:'numeric'})}
                                        </div>
                                    </div>
                                    {/* Desktop: show on hover, Mobile: hidden (use long press menu) */}
                                    <div className="absolute right-2 top-3 flex items-center gap-1 transition-all z-10 bg-white dark:bg-[#212121] rounded-lg shadow-sm border border-gray-100 dark:border-[#333] md:opacity-0 md:group-hover:opacity-100 opacity-0">
                                        <button 
                                            type="button"
                                            onClick={(e) => handleExportMarkdown(e, session)}
                                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"
                                            title="导出为 Markdown"
                                        >
                                            <DownloadIcon className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                onDeleteSession(e, session.id);
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                                            title="删除"
                                        >
                                            <TrashIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            </div>
                        )}
                    </div>
                )}

                {/* View 1: Knowledge Base */}
                {currentView === 1 && (
                    <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
                          {/* Updated Upload Button to match New Chat style */}
                          <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-400 dark:text-gray-500 transition-all group hover:text-gray-700 dark:hover:text-gray-200"
                          >
                              <UploadIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-700 dark:text-gray-500 dark:group-hover:text-gray-200 transition-colors" />
                              <span>上传文档</span>
                          </button>
                          
                          <input 
                              type="file" 
                              ref={fileInputRef} 
                              className="hidden" 
                              accept=".txt,.md,.json,.csv" 
                              multiple 
                              onChange={onUploadKnowledge}
                          />

                          <div className={`grid ${gridClass} transition-all duration-300`}>
                              {knowledgeFiles.length === 0 ? (
                                  <div className="col-span-full flex flex-col items-center justify-center h-32 text-gray-400">
                                      <FileTextIcon className="w-8 h-8 mb-2 opacity-20" />
                                      <span className="text-xs">暂无文件</span>
                                      <span className="text-[10px] text-gray-300 mt-1 text-center px-4">支持 .txt, .md, .json (RAG Lite)</span>
                                  </div>
                              ) : (
                                  knowledgeFiles.map(file => {
                                      // 分屏模式下根据左右启用状态判断是否高亮，单窗口模式根据isActive
                                      const isHighlighted = isSplitScreen 
                                          ? (file.leftEnabled || file.rightEnabled)
                                          : file.isActive;
                                      return (
                                      <div 
                                          key={file.id} 
                                          onClick={() => !isSplitScreen && isMobile && onToggleKnowledge(file.id)}
                                          onTouchStart={(e) => handleKnowledgeTouchStart(e, file)}
                                          onTouchEnd={handleTouchEnd}
                                          onTouchMove={handleTouchEnd}
                                          className={`p-3 bg-white dark:bg-[#212121] border rounded-xl shadow-sm transition-all h-fit ${isHighlighted ? 'border-gray-100 dark:border-[#333]' : 'border-gray-200 dark:border-[#2a2a2a] opacity-70'} ${isMobile && !isSplitScreen ? 'cursor-pointer' : ''}`}
                                      >
                                          <div className="flex items-start justify-between mb-3">
                                              <div className="flex items-center gap-2 overflow-hidden">
                                                  <div 
                                                      onClick={() => !isSplitScreen && !isMobile && onToggleKnowledge(file.id)}
                                                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform ${!isSplitScreen && !isMobile ? 'cursor-pointer hover:scale-110' : ''} ${isHighlighted ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}
                                                  >
                                                      <FileTextIcon className={`w-4 h-4 ${isHighlighted ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`} />
                                                  </div>
                                                  <span 
                                                      onClick={() => !isSplitScreen && !isMobile && onToggleKnowledge(file.id)}
                                                      className={`text-sm font-medium truncate ${!isSplitScreen && !isMobile ? 'cursor-pointer' : ''} ${isHighlighted ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-600'}`} 
                                                      title={file.name}
                                                  >{file.name}</span>
                                              </div>
                                              {/* Desktop only: X button */}
                                              {!isMobile && (
                                                  <button onClick={(e) => { e.stopPropagation(); onDeleteKnowledge(file.id); }} className="text-gray-300 hover:text-red-500 transition-colors"><XIcon className="w-3.5 h-3.5" /></button>
                                              )}
                                          </div>
                                          {/* Toggle Section - Hidden on mobile single window mode */}
                                          {!(isMobile && !isSplitScreen) && (
                                              <div className="border-t border-gray-50 dark:border-gray-800 pt-2 mt-1">
                                                  {!isSplitScreen ? (
                                                      /* Single Window Mode: Simple on/off toggle */
                                                      <div className="flex gap-1">
                                                          <button
                                                              onClick={(e) => { e.stopPropagation(); onToggleKnowledge(file.id); }}
                                                              className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-medium transition-all ${file.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                                          >
                                                              启用
                                                          </button>
                                                          <button
                                                              onClick={(e) => { e.stopPropagation(); onToggleKnowledge(file.id); }}
                                                              className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-medium transition-all ${!file.isActive ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                                          >
                                                              关闭
                                                          </button>
                                                      </div>
                                                  ) : (
                                                      /* Split Screen Mode: Left/Right toggles */
                                                      <div className="flex items-center gap-2">
                                                          <span className="text-[10px] text-gray-400 flex-shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
                                                          <div className="flex gap-2 flex-1">
                                                              <button
                                                                  onClick={(e) => { e.stopPropagation(); onToggleKnowledgeSide?.(file.id, 'left'); }}
                                                                  className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${file.leftEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                                                  title="左侧/上方启用"
                                                              >
                                                                  <span className="hidden md:inline">左</span>
                                                                  <span className="md:hidden">上</span>
                                                              </button>
                                                              <button
                                                                  onClick={(e) => { e.stopPropagation(); onToggleKnowledgeSide?.(file.id, 'right'); }}
                                                                  className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${file.rightEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                                                  title="右侧/下方启用"
                                                              >
                                                                  <span className="hidden md:inline">右</span>
                                                                  <span className="md:hidden">下</span>
                                                              </button>
                                                          </div>
                                                      </div>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                      );
                                  })
                              )}
                          </div>
                      </div>
                )}

                {/* View 2: Agents */}
                {currentView === 2 && (
                    <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
                          {/* Create Role Button - Opens Internal Modal */}
                          <button 
                              onClick={() => setIsCreatorOpen(true)}
                              className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-400 dark:text-gray-500 transition-all group hover:text-gray-700 dark:hover:text-gray-200"
                          >
                              <PlusIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-700 dark:text-gray-500 dark:group-hover:text-gray-200 transition-colors" />
                              <span>新建角色</span>
                          </button>

                          <div className={`grid ${gridClass} transition-all duration-300 content-start`}>
                               {customPrompts.length === 0 && (
                                   <div className="col-span-full flex flex-col items-center justify-center h-40 text-gray-400 text-center px-4">
                                       <BotIcon className="w-10 h-10 mb-3 opacity-20" />
                                       <span className="text-xs">暂无自定义角色</span>
                                   </div>
                               )}
                               {customPrompts.map(prompt => {
                                   // 分屏模式下根据左右启用状态判断是否高亮，单窗口模式根据isActive
                                   const isHighlighted = isSplitScreen 
                                       ? (prompt.leftEnabled || prompt.rightEnabled)
                                       : prompt.isActive !== false;
                                   return (
                                   <div 
                                       key={prompt.id}
                                       onClick={() => !isSplitScreen && isMobile && onTogglePrompt?.(prompt.id)}
                                       onTouchStart={(e) => handlePromptTouchStart(e, prompt)}
                                       onTouchEnd={handleTouchEnd}
                                       onTouchMove={handleTouchEnd}
                                       className={`p-3 bg-white dark:bg-[#212121] border rounded-xl shadow-sm transition-all ${isHighlighted ? 'border-gray-100 dark:border-[#333]' : 'border-gray-200 dark:border-[#2a2a2a] opacity-60'} ${isMobile && !isSplitScreen ? 'cursor-pointer' : ''}`}
                                   >
                                       <div className="flex items-start justify-between mb-1">
                                           <div className="flex items-center gap-2 overflow-hidden">
                                               <div 
                                                   onClick={() => !isSplitScreen && !isMobile && onTogglePrompt?.(prompt.id)}
                                                   className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform ${!isSplitScreen && !isMobile ? 'cursor-pointer hover:scale-110' : ''} ${isHighlighted ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}
                                               >
                                                    <BotIcon className={`w-4 h-4 ${isHighlighted ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                                               </div>
                                               <div className="flex-1 min-w-0">
                                                   <span 
                                                       onClick={() => !isSplitScreen && !isMobile && onTogglePrompt?.(prompt.id)}
                                                       className={`text-sm font-medium truncate block ${!isSplitScreen && !isMobile ? 'cursor-pointer' : ''} ${isHighlighted ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-600'}`}
                                                   >{prompt.name}</span>
                                                   <p 
                                                       className={`text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5`}
                                                   >
                                                       {prompt.description}
                                                   </p>
                                               </div>
                                           </div>
                                           {/* Desktop only: Action buttons */}
                                           {!isMobile && (
                                               <div className="flex items-center gap-1">
                                                   <button 
                                                        onClick={(e) => { e.stopPropagation(); handleEditRole(prompt); }}
                                                        className="p-1.5 text-gray-400 hover:text-blue-500 transition-all rounded-md"
                                                        title="编辑角色"
                                                   >
                                                       <EditIcon className="w-3.5 h-3.5" />
                                                   </button>
                                                   <button 
                                                        onClick={(e) => { e.stopPropagation(); onDeleteCustomPrompt(prompt.id); }}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 transition-all rounded-md"
                                                        title="删除角色"
                                                   >
                                                       <TrashIcon className="w-3.5 h-3.5" />
                                                   </button>
                                               </div>
                                           )}
                                       </div>
                                       
                                       {/* Toggle Section - Hidden on mobile single window mode */}
                                       {!(isMobile && !isSplitScreen) && (
                                           <div className="border-t border-gray-50 dark:border-gray-800 pt-2 mt-1">
                                               {!isSplitScreen ? (
                                                   <div className="flex gap-1">
                                                       <button
                                                           onClick={(e) => { e.stopPropagation(); onTogglePrompt?.(prompt.id); }}
                                                           className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-medium transition-all ${prompt.isActive !== false ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                                       >
                                                           启用
                                                       </button>
                                                       <button
                                                           onClick={(e) => { e.stopPropagation(); onTogglePrompt?.(prompt.id); }}
                                                           className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-medium transition-all ${prompt.isActive === false ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                                       >
                                                           关闭
                                                       </button>
                                                   </div>
                                               ) : (
                                                   <div className="flex items-center gap-2">
                                                       <span className="text-[10px] text-gray-400 flex-shrink-0">应用至:</span>
                                                       <div className="flex gap-2 flex-1">
                                                           <button
                                                               onClick={(e) => { e.stopPropagation(); onTogglePromptSide?.(prompt.id, 'left'); }}
                                                               className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-medium transition-all ${prompt.leftEnabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                                           >
                                                               <span className="hidden md:inline">左</span>
                                                               <span className="md:hidden">上</span>
                                                           </button>
                                                           <button
                                                               onClick={(e) => { e.stopPropagation(); onTogglePromptSide?.(prompt.id, 'right'); }}
                                                               className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-medium transition-all ${prompt.rightEnabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                                           >
                                                               <span className="hidden md:inline">右</span>
                                                               <span className="md:hidden">下</span>
                                                           </button>
                                                       </div>
                                                   </div>
                                               )}
                                           </div>
                                       )}
                                   </div>
                                   );
                               })}
                          </div>
                      </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:border-t border-gray-200 dark:border-[#2f2f2f] bg-white dark:bg-[#212121] flex flex-col gap-3 flex-shrink-0">
             
             {/* Dynamic Top Button in Footer: Clear History only on Page 1 */}
             {currentView === 0 ? (
                 <button 
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClearAllHistory();
                    }}
                    disabled={sessions.length === 0}
                    className={`hidden md:flex w-full items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-all duration-200 ${
                        sessions.length === 0 
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                        : 'text-red-600 hover:text-red-700 dark:text-red-400'
                    }`}
                 >
                    <TrashIcon className="w-3.5 h-3.5" />
                    清除所有历史
                 </button>
             ) : (
                 <div className="hidden md:flex h-8 w-full items-center justify-center text-gray-400 dark:text-gray-500 text-xs font-medium">
                     {isFullWidth ? "已展开更多列" : "点击右上角展开更多列"}
                 </div> 
             )}

             {/* View Switcher Controls */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-[#2a2a2a] md:border-t-0">
                <button 
                   type="button"
                   onClick={handlePrevView}
                   disabled={currentView === 0}
                   className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all ${currentView === 0 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'}`}
                >
                   <span className="md:hidden flex items-center">
                       <ChevronLeftIcon className="w-5 h-5" />
                       <ChevronLeftIcon className="w-3 h-3 -ml-2" />
                   </span>
                   <ChevronLeftIcon className="w-3.5 h-3.5 hidden md:block" />
                   <span className="hidden md:inline">上一页</span>
                </button>
                
                <div className="flex gap-1.5">
                    {Array.from({length: TOTAL_VIEWS}).map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentView ? 'bg-gray-600 dark:bg-gray-400 scale-125' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                    ))}
                </div>

                <button 
                   type="button"
                   onClick={handleNextView}
                   disabled={currentView === TOTAL_VIEWS - 1}
                   className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all ${currentView === TOTAL_VIEWS - 1 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'}`}
                >
                   <span className="hidden md:inline">下一页</span>
                   <ChevronRightIcon className="w-3.5 h-3.5 hidden md:block" />
                   <span className="md:hidden flex items-center">
                       <ChevronRightIcon className="w-3 h-3 -mr-2" />
                       <ChevronRightIcon className="w-5 h-5" />
                   </span>
                </button>
            </div>
        </div>
      </div>

      {/* Role Creation Modal */}
      {isCreatorOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#1f1f1f] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-[#333] transform scale-100 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#333] bg-gray-50/50 dark:bg-[#252525]">
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                          <BotIcon className="w-5 h-5 text-gray-600" />
                          创建自定义角色
                      </h3>
                      <button onClick={() => setIsCreatorOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                          <XIcon className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">角色名称</label>
                          <input 
                              type="text" 
                              value={newPromptName}
                              onChange={(e) => setNewPromptName(e.target.value)}
                              placeholder="例如：Python 专家"
                              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#444] rounded-xl text-sm focus:outline-none focus:border-gray-400 dark:text-white transition-colors"
                          />
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">简短描述</label>
                          <input 
                              type="text" 
                              value={newPromptDesc}
                              onChange={(e) => setNewPromptDesc(e.target.value)}
                              placeholder="显示在卡片上的简介"
                              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#444] rounded-xl text-sm focus:outline-none focus:border-gray-400 dark:text-white transition-colors"
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">系统提示词 (System Prompt)</label>
                          <textarea 
                              value={newPromptContent}
                              onChange={(e) => setNewPromptContent(e.target.value)}
                              placeholder="你是一个..."
                              className="w-full h-32 px-3 py-2.5 bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#444] rounded-xl text-sm focus:outline-none focus:border-gray-400 resize-none custom-scrollbar dark:text-white transition-colors"
                          />
                      </div>
                  </div>

                  <div className="p-4 border-t border-gray-100 dark:border-[#333] flex justify-end gap-3 bg-gray-50/50 dark:bg-[#252525]">
                      <button 
                          onClick={() => setIsCreatorOpen(false)}
                          className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333] transition-colors"
                      >
                          取消
                      </button>
                      <button 
                          onClick={handleSaveRole}
                          disabled={!newPromptName || !newPromptContent}
                          className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors shadow-sm ${!newPromptName || !newPromptContent ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-900'}`}
                      >
                          保存角色
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Role Edit Modal */}
      {isEditorOpen && editingPrompt && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#1f1f1f] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-[#333] transform scale-100 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#333] bg-gray-50/50 dark:bg-[#252525]">
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                          <EditIcon className="w-5 h-5 text-blue-600" />
                          编辑角色
                      </h3>
                      <button onClick={handleCloseEditor} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                          <XIcon className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">角色名称</label>
                          <input 
                              type="text" 
                              value={newPromptName}
                              onChange={(e) => setNewPromptName(e.target.value)}
                              placeholder="例如：Python 专家"
                              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#444] rounded-xl text-sm focus:outline-none focus:border-gray-400 dark:text-white transition-colors"
                          />
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">简短描述</label>
                          <input 
                              type="text" 
                              value={newPromptDesc}
                              onChange={(e) => setNewPromptDesc(e.target.value)}
                              placeholder="显示在卡片上的简介"
                              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#444] rounded-xl text-sm focus:outline-none focus:border-gray-400 dark:text-white transition-colors"
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">系统提示词 (System Prompt)</label>
                          <textarea 
                              value={newPromptContent}
                              onChange={(e) => setNewPromptContent(e.target.value)}
                              placeholder="你是一个..."
                              className="w-full h-32 px-3 py-2.5 bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#444] rounded-xl text-sm focus:outline-none focus:border-gray-400 resize-none custom-scrollbar dark:text-white transition-colors"
                          />
                      </div>
                  </div>

                  <div className="p-4 border-t border-gray-100 dark:border-[#333] flex justify-end gap-3 bg-gray-50/50 dark:bg-[#252525]">
                      <button 
                          onClick={handleCloseEditor}
                          className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333] transition-colors"
                      >
                          取消
                      </button>
                      <button 
                          onClick={handleUpdateRole}
                          disabled={!newPromptName || !newPromptContent}
                          className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors shadow-sm ${!newPromptName || !newPromptContent ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                      >
                          更新角色
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Mobile Context Menu for Session */}
      {contextMenuSession && (
          <div 
              className="fixed inset-0 z-[100]" 
              onClick={handleCloseContextMenu}
              onTouchStart={handleCloseContextMenu}
          >
              <div 
                  className="absolute bg-white dark:bg-[#212121] rounded-xl shadow-2xl border border-gray-200 dark:border-[#333] py-2 min-w-[140px]"
                  style={{
                      left: Math.min(contextMenuPosition.x, window.innerWidth - 160),
                      top: Math.min(contextMenuPosition.y, window.innerHeight - 200)
                  }}
                  onClick={(e) => e.stopPropagation()}
              >
                  <button
                      onClick={() => {
                          handlePinSession(contextMenuSession);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#333] flex items-center gap-3"
                  >
                      <PinIcon className="w-4 h-4" />
                      置顶会话
                  </button>
                  <button
                      onClick={(e) => {
                          handleExportMarkdown(e, contextMenuSession);
                          handleCloseContextMenu();
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#333] flex items-center gap-3"
                  >
                      <DownloadIcon className="w-4 h-4" />
                      导出 Markdown
                  </button>
                  <div className="border-t border-gray-200 dark:border-[#333] my-1"></div>
                  <button
                      onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(e, contextMenuSession.id);
                          handleCloseContextMenu();
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3"
                  >
                      <TrashIcon className="w-4 h-4" />
                      删除会话
                  </button>
              </div>
          </div>
      )}

      {/* Mobile Context Menu for Knowledge */}
      {contextMenuKnowledge && (
          <div 
              className="fixed inset-0 z-[100]" 
              onClick={handleCloseContextMenu}
              onTouchStart={handleCloseContextMenu}
          >
              <div 
                  className="absolute bg-white dark:bg-[#212121] rounded-xl shadow-2xl border border-gray-200 dark:border-[#333] py-2 min-w-[140px]"
                  style={{
                      left: Math.min(contextMenuPosition.x, window.innerWidth - 160),
                      top: Math.min(contextMenuPosition.y, window.innerHeight - 150)
                  }}
                  onClick={(e) => e.stopPropagation()}
              >
                  <button
                      onClick={() => handlePinKnowledge(contextMenuKnowledge)}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#333] flex items-center gap-3"
                  >
                      <PinIcon className="w-4 h-4" />
                      置顶
                  </button>
                  <div className="border-t border-gray-200 dark:border-[#333] my-1"></div>
                  <button
                      onClick={() => {
                          onDeleteKnowledge(contextMenuKnowledge.id);
                          handleCloseContextMenu();
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3"
                  >
                      <TrashIcon className="w-4 h-4" />
                      删除
                  </button>
              </div>
          </div>
      )}

      {/* Mobile Context Menu for Prompt */}
      {contextMenuPrompt && (
          <div 
              className="fixed inset-0 z-[100]" 
              onClick={handleCloseContextMenu}
              onTouchStart={handleCloseContextMenu}
          >
              <div 
                  className="absolute bg-white dark:bg-[#212121] rounded-xl shadow-2xl border border-gray-200 dark:border-[#333] py-2 min-w-[140px]"
                  style={{
                      left: Math.min(contextMenuPosition.x, window.innerWidth - 160),
                      top: Math.min(contextMenuPosition.y, window.innerHeight - 150)
                  }}
                  onClick={(e) => e.stopPropagation()}
              >
                  <button
                      onClick={() => {
                          handleEditRole(contextMenuPrompt);
                          handleCloseContextMenu();
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#333] flex items-center gap-3"
                  >
                      <EditIcon className="w-4 h-4" />
                      编辑
                  </button>
                  <div className="border-t border-gray-200 dark:border-[#333] my-1"></div>
                  <button
                      onClick={() => {
                          onDeleteCustomPrompt(contextMenuPrompt.id);
                          handleCloseContextMenu();
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3"
                  >
                      <TrashIcon className="w-4 h-4" />
                      删除
                  </button>
              </div>
          </div>
      )}
    </>
  );
};

export default Sidebar;
