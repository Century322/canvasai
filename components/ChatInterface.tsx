
import React, { useRef, useEffect, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'; // Virtualization
import { Message, MessageRole, ContentType } from '../types';
import { BotIcon, UserIcon, CheckIcon, CopyIcon, RefreshIcon, EditIcon, SpeakerIcon, CodeIcon, StarIcon, EyeIcon, MobiusIcon, AlertTriangleIcon, BrainIcon, ChevronDownIcon, ChevronUpIcon, ArrowCollapseIcon, ArrowDownIcon, GlobeIcon, SearchIcon } from './Icons';

interface Props {
  messages: Message[];
  isLoading: boolean;
  onRegenerate: () => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onBookmark: (messageId: string) => void; 
  isMirrored?: boolean;
  modelName?: string;
  isSplitScreen?: boolean;
}

const CodeArtifact = ({ code, language }: { code: string, language: string }) => {
    const [showPreview, setShowPreview] = useState(false);
    const isPreviewable = language === 'html' || language === 'svg';
    if (!isPreviewable) return null;

    return (
        <div className="mt-2 mb-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-[#2a2a2a] border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-500">Artifact Preview</span>
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowPreview(!showPreview); }}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:underline"
                >
                    <EyeIcon className="w-3 h-3" />
                    {showPreview ? "Hide Preview" : "Show Preview"}
                </button>
            </div>
            {showPreview && (
                <div 
                    className="p-4 bg-white pattern-grid-lg"
                    onClick={(e) => e.stopPropagation()} 
                >
                    {language === 'html' || language === 'svg' ? (
                        <div dangerouslySetInnerHTML={{ __html: code }} />
                    ) : null}
                </div>
            )}
        </div>
    );
}

const CodeCopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button 
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            className="absolute top-2 right-2 p-1.5 bg-[#2d2d2d] hover:bg-[#404040] rounded-md transition-colors border border-[#404040] opacity-0 group-hover/code:opacity-100 transition-opacity z-10"
            title="复制"
        >
            {copied ? <CheckIcon className="w-3.5 h-3.5 text-green-400" /> : <CopyIcon className="w-3.5 h-3.5 text-gray-400" />}
        </button>
    );
};

const ThinkingProcess = ({ content, isFinished }: { content: string, isFinished: boolean }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    if (!isFinished) {
        return (
            <div className="mb-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4 py-1">
                <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400 animate-pulse">
                    <BrainIcon className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">深度思考中...</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-mono whitespace-pre-wrap break-words">
                    {content}
                </div>
            </div>
        );
    }

    return (
        <div className="mb-4 rounded-lg bg-gray-50 dark:bg-[#252525] border border-gray-100 dark:border-[#333] overflow-hidden">
            <button 
                onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#2f2f2f] transition-colors"
            >
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <BrainIcon className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">深度思考过程</span>
                </div>
                {isCollapsed ? <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" /> : <ChevronUpIcon className="w-3.5 h-3.5 text-gray-400" />}
            </button>
            
            {!isCollapsed && (
                <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-[#333]">
                    <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-mono whitespace-pre-wrap break-words">
                        {content}
                    </div>
                </div>
            )}
        </div>
    );
};

const GroundingSources = ({ metadata }: { metadata: any }) => {
    if (!metadata?.groundingChunks || metadata.groundingChunks.length === 0) return null;

    return (
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50">
             <div className="flex items-center gap-2 mb-2">
                 <SearchIcon className="w-3.5 h-3.5 text-gray-500" />
                 <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">参考来源</span>
             </div>
             <div className="flex flex-wrap gap-2">
                 {metadata.groundingChunks.map((chunk: any, idx: number) => {
                     if (chunk.web) {
                         return (
                             <a 
                                key={idx} 
                                href={chunk.web.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 dark:bg-[#2a2a2a] hover:bg-gray-100 dark:hover:bg-[#333] border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300 transition-colors max-w-full"
                             >
                                 <GlobeIcon className="w-3 h-3 shrink-0 text-blue-500" />
                                 <span className="truncate max-w-[150px]">{chunk.web.title || "网页来源"}</span>
                             </a>
                         );
                     }
                     return null;
                 })}
             </div>
        </div>
    );
};

// Robust Parser to separate <think> content from main content
// Handles cases where tags might be incomplete during streaming
const parseThinkingContent = (content: string) => {
    if (!content) return { think: null, main: "", isFinished: false };

    // Standard Case: Full tags
    const startTag = "<think>";
    const endTag = "</think>";
    
    const startIndex = content.indexOf(startTag);
    
    if (startIndex === -1) {
        return { think: null, main: content, isFinished: false };
    }

    const endIndex = content.indexOf(endTag);

    if (endIndex !== -1) {
        // Thinking is complete
        const think = content.substring(startIndex + startTag.length, endIndex);
        const main = content.substring(endIndex + endTag.length).trim();
        return { think, main, isFinished: true };
    } else {
        // Thinking is ongoing or stream cut off
        const think = content.substring(startIndex + startTag.length);
        return { think, main: "", isFinished: false };
    }
};

// Optimized Message Item with React.memo
const MessageItemRaw: React.FC<{ 
    message: Message, 
    isLast: boolean, 
    onRegenerate: () => void,
    onEdit: (id: string, text: string) => void,
    onBookmark: (id: string) => void,
    isMirrored?: boolean,
    modelName?: string
}> = ({ message, isLast, onRegenerate, onEdit, onBookmark, isMirrored, modelName }) => {
  const isUser = message.role === MessageRole.USER;
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);

  const handleCopyContent = () => {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleTTS = () => {
      if (!window.speechSynthesis) return;
      if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          return;
      }
      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.lang = 'zh-CN';
      window.speechSynthesis.speak(utterance);
  };

  const handleSaveEdit = () => {
      if (editText.trim() !== message.content) {
          onEdit(message.id, editText);
      }
      setIsEditing(false);
  };

  // Robust Parsing
  let thinkContent: string | null = null;
  let mainContent = message.content;
  let isThinkingFinished = false;

  if (!isUser && message.content) {
      const parsed = parseThinkingContent(message.content);
      thinkContent = parsed.think;
      mainContent = parsed.main;
      isThinkingFinished = parsed.isFinished;
  }

  if (isUser) {
      return (
        <div className={`flex w-full mb-4 group ${isMirrored ? 'justify-start pr-10' : 'justify-end pl-10'}`}>
            <div className={`flex flex-col gap-2 max-w-full md:max-w-[85%] ${isMirrored ? 'items-start' : 'items-end'}`}>
                {message.attachments && message.attachments.length > 0 && (
                    <div 
                        className={`flex flex-wrap gap-2 mb-1 ${isMirrored ? 'justify-start' : 'justify-end'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {message.attachments.map((att, idx) => (
                            <div key={idx} className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                                {att.type === ContentType.IMAGE && (
                                    <img src={att.data} alt="Upload" className="max-h-48 object-cover" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
                
                {isEditing ? (
                    <div 
                        className="w-full bg-[#f4f4f4] dark:bg-[#2f2f2f] rounded-3xl p-3 border border-gray-400"
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <textarea 
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onClick={(e) => e.stopPropagation()} 
                            className="w-full bg-transparent outline-none resize-none text-[15px] leading-relaxed dark:text-gray-100"
                            rows={Math.min(10, editText.split('\n').length + 1)}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsEditing(false); }} 
                                className="text-xs px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full"
                            >
                                取消
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }} 
                                className="text-xs px-3 py-1 bg-gray-700 text-white rounded-full hover:bg-gray-800"
                            >
                                发送
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="relative max-w-full">
                        <div className={`bg-[#f4f4f4] dark:bg-[#2f2f2f] text-gray-800 dark:text-gray-100 px-5 py-2.5 rounded-3xl text-[15px] leading-relaxed break-words whitespace-pre-wrap overflow-hidden`}>
                            {message.content}
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                            className={`absolute top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-white dark:bg-[#2f2f2f] rounded-full shadow-sm border border-gray-100 dark:border-gray-700 ${isMirrored ? '-right-8' : '-left-8'}`}
                            title="编辑"
                        >
                            <EditIcon className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>
        </div>
      );
  }

  return (
    <div className={`flex w-full mb-6 group ${isMirrored ? 'justify-end pl-10 flex-row-reverse' : 'justify-start pr-10'}`}>
      
      <div className={`w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden bg-white dark:bg-[#2f2f2f] ${isMirrored ? 'ml-4' : 'mr-4'}`}>
        <BotIcon className="w-5 h-5 text-gray-800 dark:text-gray-200" />
      </div>

      <div className={`flex flex-col gap-2 flex-1 min-w-0 pt-0.5 ${isMirrored ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-center gap-2 mb-1 ${isMirrored ? 'flex-row-reverse' : ''}`}>
             <span className="font-semibold text-sm text-gray-800 dark:text-white">{message.modelName || modelName || 'AI'}</span>
             {message.isBookmarked && <StarIcon className="w-3 h-3 text-amber-400" filled />}
        </div>
        
        {message.isError ? (
            <div className={`w-full max-w-full md:max-w-[90%] p-4 rounded-xl border flex items-start gap-3 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30 ${isMirrored ? 'flex-row-reverse text-right' : ''}`}>
                <AlertTriangleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-red-800 dark:text-red-300 mb-1">
                        生成遇到问题
                    </div>
                    <div className="text-sm text-red-700 dark:text-red-400 mb-2 leading-relaxed whitespace-pre-wrap break-words">
                        {message.content}
                    </div>
                    {isLast && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-xs font-medium text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors shadow-sm"
                        >
                            <RefreshIcon className="w-3.5 h-3.5" />
                            重试
                        </button>
                    )}
                </div>
            </div>
        ) : (
            <div className={`w-full max-w-full overflow-hidden ${isMirrored ? 'text-right' : 'text-left'}`}>
                
                {thinkContent && (
                    <ThinkingProcess content={thinkContent} isFinished={isThinkingFinished} />
                )}

                {mainContent && (
                    <div className="markdown-body text-gray-800 dark:text-gray-200">
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]} 
                            rehypePlugins={[rehypeKatex, rehypeHighlight]}
                            components={{
                                code({node, inline, className, children, ...props}: any) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const codeText = String(children).replace(/\n$/, '');
                                    const language = match ? match[1] : '';
                                    
                                    if (!inline && match) {
                                        return (
                                            <div 
                                                    className="relative group/code my-2 text-left max-w-full"
                                                    onClick={(e) => e.stopPropagation()} 
                                            >
                                                <div className="flex items-center justify-between px-3 py-1.5 bg-[#2d2d2d] rounded-t-md border-b border-[#404040]">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex gap-1.5">
                                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                                                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                                                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                                                            </div>
                                                            <span className="text-xs text-gray-400 font-mono ml-2">{language}</span>
                                                        </div>
                                                </div>
                                                <pre className={`!mt-0 !rounded-t-none overflow-x-auto ${className}`}>
                                                    <code {...props} className={className}>
                                                        {children}
                                                    </code>
                                                </pre>
                                                <CodeCopyButton text={codeText} />
                                                {(language === 'html' || language === 'svg') && (
                                                    <CodeArtifact code={codeText} language={language} />
                                                )}
                                            </div>
                                        );
                                    }
                                    return <code className={`break-words whitespace-pre-wrap ${className}`} {...props}>{children}</code>;
                                },
                                a: ({node, ...props}) => <a {...props} onClick={(e) => e.stopPropagation()} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:underline break-all" target="_blank" rel="noopener noreferrer" />,
                                p: ({node, ...props}) => <p {...props} className="break-words" />,
                                ul: ({node, ...props}) => <ul {...props} className={`list-disc ${isMirrored ? 'pr-5' : 'pl-5'}`} />,
                                ol: ({node, ...props}) => <ol {...props} className={`list-decimal ${isMirrored ? 'pr-5' : 'pl-5'}`} />,
                                table: ({node, ...props}) => <div className="overflow-x-auto mb-4 border border-gray-200 dark:border-gray-700 rounded-lg"><table {...props} className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" /></div>,
                            }}
                        >
                            {mainContent}
                        </ReactMarkdown>
                    </div>
                )}
            
                {(!message.content && !message.isError && !message.attachments?.length) && (
                    <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse align-middle ml-1"></span>
                )}
                
                {/* Grounding Sources */}
                {message.groundingMetadata && (
                    <GroundingSources metadata={message.groundingMetadata} />
                )}
            </div>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div 
            className={`flex flex-wrap gap-3 mt-3 ${isMirrored ? 'justify-end' : 'justify-start'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {message.attachments.map((att, idx) => {
              if (att.type === ContentType.IMAGE) {
                return (
                  <img 
                    key={idx} 
                    src={att.data} 
                    alt="Generated" 
                    className="max-w-full md:max-w-sm rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm" 
                  />
                );
              }
              if (att.type === ContentType.VIDEO) {
                return (
                  <video 
                    key={idx} 
                    src={att.data} 
                    controls 
                    className="max-w-full md:max-w-md rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm bg-black"
                  />
                );
              }
              return null;
            })}
          </div>
        )}

        {message.content && !message.isError && (
            <div className={`flex items-center gap-2 mt-2 ${isMirrored ? 'flex-row-reverse' : ''}`}>
                <button 
                    onClick={(e) => { e.stopPropagation(); handleTTS(); }}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    title="朗读"
                >
                    <SpeakerIcon className="w-4 h-4" />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); handleCopyContent(); }}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    title="复制全文"
                >
                    {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
                </button>
                
                <button 
                    onClick={(e) => { e.stopPropagation(); onBookmark(message.id); }}
                    className={`p-1 transition-colors ${message.isBookmarked ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'}`}
                    title={message.isBookmarked ? "取消收藏" : "收藏"}
                >
                    <StarIcon className="w-4 h-4" filled={message.isBookmarked} />
                </button>

                {isLast && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        title="重新生成"
                    >
                        <RefreshIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

// Memoized Wrapper
const MessageItem = React.memo(MessageItemRaw, (prev, next) => {
    // Return true if we should skip re-render
    
    // Always re-render if it's the last message (streaming updates, status changes)
    if (prev.isLast || next.isLast) return false;

    // Deep compare content
    return (
        prev.message.id === next.message.id &&
        prev.message.content === next.message.content &&
        prev.message.isBookmarked === next.message.isBookmarked &&
        prev.message.isError === next.message.isError &&
        prev.isMirrored === next.isMirrored &&
        prev.message.groundingMetadata === next.message.groundingMetadata
    );
});


const ChatInterface: React.FC<Props> = ({ 
  messages, 
  isLoading, 
  onRegenerate, 
  onEditMessage, 
  onBookmark, 
  isMirrored,
  modelName,
  isSplitScreen
}) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Auto-scroll logic with Virtuoso
  useEffect(() => {
      if (isAtBottom) {
          virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, align: 'end', behavior: 'smooth' });
      }
  }, [messages.length, messages[messages.length - 1]?.content, isLoading]); 

  // Empty State
  if (messages.length === 0) {
      return (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center opacity-20 select-none p-4">
            <BotIcon className="w-24 h-24 mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-500">
                有什么可以帮你的吗？
            </p>
        </div>
      );
  }

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
        <Virtuoso
            ref={virtuosoRef}
            data={messages}
            totalCount={messages.length}
            className="flex-1 custom-scrollbar"
            atBottomStateChange={(atBottom) => {
                setIsAtBottom(atBottom);
                setShowScrollButton(!atBottom);
            }}
            atBottomThreshold={50}
            initialTopMostItemIndex={messages.length - 1}
            itemContent={(index, msg) => (
                <div className="px-4 py-1">
                    <MessageItem 
                        key={msg.id} 
                        message={msg} 
                        isLast={index === messages.length - 1} 
                        onRegenerate={onRegenerate}
                        onEdit={onEditMessage}
                        onBookmark={onBookmark}
                        isMirrored={isMirrored}
                        modelName={modelName}
                    />
                </div>
            )}
            components={{
                Footer: () => (
                    isLoading ? (
                        <div className={`flex w-full mb-6 px-4 ${isMirrored ? 'justify-end pl-10 flex-row-reverse' : 'justify-start pr-10'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-white dark:bg-[#2f2f2f] border border-gray-200 dark:border-gray-700 ${isMirrored ? 'ml-4' : 'mr-4'}`}>
                                <BotIcon className="w-5 h-5 text-gray-400 animate-pulse" />
                            </div>
                            <div className="flex items-center gap-1 mt-3">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    ) : <div className="h-4" />
                )
            }}
        />
        
        {/* Floating Scroll Down Button */}
        {showScrollButton && (
            <div className="absolute bottom-6 right-6 z-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <button 
                    onClick={() => virtuosoRef.current?.scrollToIndex({ index: messages.length - 1, align: 'end', behavior: 'smooth' })}
                    className="p-2.5 rounded-full bg-white dark:bg-[#333] shadow-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#404040] transition-colors"
                >
                    <ArrowDownIcon className="w-5 h-5" />
                </button>
            </div>
        )}
    </div>
  );
};

export default ChatInterface;
