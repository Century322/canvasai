
import React, { useState, useRef } from 'react';
import { ChatSession, KnowledgeFile, PromptPreset, Message, MessageRole } from '../types';
import { 
    NewChatIcon, TrashIcon, BookIcon, BotIcon, 
    FileTextIcon, UploadIcon,
    ChevronLeftIcon, ChevronRightIcon,
    XIcon, PlusIcon, MobiusIcon, DownloadIcon
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
  
  // Knowledge Base Props
  knowledgeFiles: KnowledgeFile[];
  onUploadKnowledge: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteKnowledge: (id: string) => void;
  onToggleKnowledge: (id: string) => void;

  // Agent Props
  customPrompts: PromptPreset[];
  onSelectPreset: (content: string) => void;
  onAddCustomPrompt: (preset: PromptPreset) => void; // Moved from RightSidebar
  onDeleteCustomPrompt: (id: string) => void; // Moved from RightSidebar

  // Gallery Props (derived from all sessions) - Kept in interface to match App.tsx but unused
  allMessages: Message[];
  onJumpToMessage: (sessionId: string, messageId: string) => void;
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
  knowledgeFiles,
  onUploadKnowledge,
  onDeleteKnowledge,
  onToggleKnowledge,
  customPrompts,
  onSelectPreset,
  onAddCustomPrompt,
  onDeleteCustomPrompt
}) => {
  const [currentView, setCurrentView] = useState<number>(0);
  const [isFullWidth, setIsFullWidth] = useState(false);
  
  // Custom Role Modal State
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptDesc, setNewPromptDesc] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const TOTAL_VIEWS = 3; // Reduced views

  // Filter sessions to only show those with messages
  const visibleSessions = sessions.filter(s => s.messages.length > 0);

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
          content: newPromptContent
      });
      setNewPromptName('');
      setNewPromptDesc('');
      setNewPromptContent('');
      setIsCreatorOpen(false);
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

  const widthClass = isFullWidth ? 'w-full max-w-5xl' : 'w-[280px]';

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

      <div className={`fixed top-0 left-0 h-full ${widthClass} bg-[#f9f9f9] dark:bg-[#171717] border-r border-gray-200 dark:border-[#2f2f2f] z-50 transform transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl md:shadow-xl`}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-[#2f2f2f] bg-white dark:bg-[#1a1a1a] flex-shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
                 <div className="font-bold text-lg text-gray-800 dark:text-gray-100 tracking-tight flex items-center gap-2 flex-shrink-0">
                    {/* Changed from text-blue-500 to text-gray-600 */}
                    <MobiusIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
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
                onClick={() => setIsFullWidth(!isFullWidth)}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shrink-0"
                title={isFullWidth ? "收缩侧边栏" : "展开侧边栏"}
            >
                {isFullWidth ? <ChevronLeftIcon className="w-5 h-5" /> : <ChevronRightIcon className="w-5 h-5" />}
            </button>
        </div>

        {/* Dynamic Content Area with Animation */}
        <div className={`flex-1 overflow-hidden bg-[#f9f9f9] dark:bg-[#171717] flex flex-col`}>
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
                                onNewChat();
                                if (window.innerWidth < 768) onClose();
                            }}
                            className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-[#212121] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] hover:border-gray-300 dark:hover:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 transition-all border border-gray-200 dark:border-[#333] shadow-sm group"
                        >
                            <NewChatIcon className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
                            <span>开启新对话</span>
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
                                    className={`group relative flex items-start justify-between p-3.5 rounded-xl cursor-pointer transition-all border 
                                        ${currentSessionId === session.id 
                                            ? 'bg-white dark:bg-[#212121] border-gray-400/50 shadow-md ring-1 ring-gray-400/20' 
                                            : 'bg-white/50 dark:bg-[#212121]/50 border-transparent hover:bg-white dark:hover:bg-[#212121] hover:shadow-sm'
                                        }`}
                                >
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className={`text-sm font-medium truncate mb-1 ${currentSessionId === session.id ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {session.title}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-mono">
                                            {new Date(session.timestamp).toLocaleString(undefined, {month:'numeric', day:'numeric', hour:'numeric', minute:'numeric'})}
                                        </div>
                                    </div>
                                    <div className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all z-10 bg-white dark:bg-[#212121] rounded-lg shadow-sm border border-gray-100 dark:border-[#333]">
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
                              className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-[#212121] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] hover:border-gray-300 dark:hover:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 transition-all border border-gray-200 dark:border-[#333] shadow-sm group"
                          >
                              <UploadIcon className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
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
                                  knowledgeFiles.map(file => (
                                      <div key={file.id} className="p-3 bg-white dark:bg-[#212121] border border-gray-100 dark:border-[#333] rounded-xl shadow-sm hover:shadow-md transition-shadow group h-fit">
                                          <div className="flex items-start justify-between mb-3">
                                              <div className="flex items-center gap-2 overflow-hidden">
                                                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                                      <FileTextIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                  </div>
                                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate" title={file.name}>{file.name}</span>
                                              </div>
                                              <button onClick={(e) => { e.stopPropagation(); onDeleteKnowledge(file.id); }} className="text-gray-300 hover:text-red-500 transition-colors"><XIcon className="w-3.5 h-3.5" /></button>
                                          </div>
                                          <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-800 pt-2 mt-1">
                                              <span className="text-[10px] text-gray-400 font-mono">{(file.size / 1024).toFixed(1)} KB</span>
                                              <button 
                                                  onClick={() => onToggleKnowledge(file.id)}
                                                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${file.isActive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100'}`}
                                              >
                                                  {file.isActive ? '已启用' : '未启用'}
                                              </button>
                                          </div>
                                      </div>
                                  ))
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
                              className="w-full mb-6 flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-[#212121] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] hover:border-gray-300 dark:hover:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 transition-all border border-gray-200 dark:border-[#333] shadow-sm group"
                          >
                              <PlusIcon className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
                              <span>新建角色</span>
                          </button>

                          <div className={`grid ${gridClass} transition-all duration-300 content-start`}>
                               {customPrompts.length === 0 && (
                                   <div className="col-span-full flex flex-col items-center justify-center h-40 text-gray-400 text-center px-4">
                                       <BotIcon className="w-10 h-10 mb-3 opacity-20" />
                                       <span className="text-xs">暂无自定义角色</span>
                                   </div>
                               )}
                               {customPrompts.map(prompt => (
                                   <div 
                                       key={prompt.id} 
                                       onClick={() => {
                                           onSelectPreset(prompt.content);
                                           onNewChat();
                                           if (window.innerWidth < 768) onClose();
                                       }}
                                       className="relative flex flex-col p-4 bg-white dark:bg-[#212121] border border-gray-100 dark:border-[#333] rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-all group"
                                   >
                                       <div className="flex items-center gap-3 mb-2">
                                           <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                                <BotIcon className="w-4 h-4" />
                                           </div>
                                           <span className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate flex-1">{prompt.name}</span>
                                       </div>
                                       <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed mb-1 pr-6">
                                           {prompt.description}
                                       </p>
                                       <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteCustomPrompt(prompt.id); }}
                                            className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all rounded-md"
                                            title="删除角色"
                                       >
                                           <TrashIcon className="w-3.5 h-3.5" />
                                       </button>
                                   </div>
                               ))}
                          </div>
                      </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-[#2f2f2f] bg-white dark:bg-[#1a1a1a] flex flex-col gap-3 flex-shrink-0">
             
             {/* Dynamic Top Button in Footer: Clear History only on Page 1 */}
             {currentView === 0 ? (
                 <button 
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClearAllHistory();
                    }}
                    disabled={sessions.length === 0}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                        sessions.length === 0 
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed bg-transparent' 
                        : 'text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-900/10 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20'
                    }`}
                 >
                    <TrashIcon className="w-3.5 h-3.5" />
                    清除所有历史
                 </button>
             ) : (
                 <div className="h-8 w-full flex items-center justify-center text-gray-300 text-[10px] italic">
                     {/* Placeholder or Info text */}
                     {isFullWidth ? "已展开更多列" : "点击右上角展开更多列"}
                 </div> 
             )}

             {/* View Switcher Controls */}
             <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-[#2a2a2a]">
                 <button 
                    type="button"
                    onClick={handlePrevView}
                    disabled={currentView === 0}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${currentView === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] hover:text-gray-800'}`}
                 >
                    <ChevronLeftIcon className="w-3.5 h-3.5" />
                    上一页
                 </button>
                 
                 <div className="flex gap-1.5">
                     {Array.from({length: TOTAL_VIEWS}).map((_, i) => (
                         <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentView ? 'bg-gray-600 scale-125' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                     ))}
                 </div>

                 <button 
                    type="button"
                    onClick={handleNextView}
                    disabled={currentView === TOTAL_VIEWS - 1}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${currentView === TOTAL_VIEWS - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] hover:text-gray-800'}`}
                 >
                    下一页
                    <ChevronRightIcon className="w-3.5 h-3.5" />
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
    </>
  );
};

export default Sidebar;
