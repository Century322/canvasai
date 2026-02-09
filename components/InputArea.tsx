
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { SendIcon, PlusIcon, MicIcon, StopIcon, ColumnsIcon, SwordsIcon, XIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, ArrowDownIcon, FileIcon } from './Icons';
import { Attachment, ContentType, Message, MessageRole } from '../types';

interface Props {
  onSendMessage: (text: string, attachments: Attachment[], target: 'left' | 'right' | 'both') => void;
  onStop: (target: 'left' | 'right') => void;
  isLeftLoading: boolean;
  isRightLoading: boolean;
  supportsImages: boolean;
  supportsAudio: boolean;
  isIncognito: boolean;
  onToggleIncognito: () => void;
  isSplitScreen: boolean;
  isAutoBattle: boolean;
  onToggleAutoBattle: () => void;
  onManualRelay: (direction: 'left_to_right' | 'right_to_left') => void;
  leftMessages?: Message[];
  rightMessages?: Message[];
}

const InputArea: React.FC<Props> = ({ 
    onSendMessage,
    onStop,
    isLeftLoading,
    isRightLoading,
    supportsImages, 
    isIncognito,
    onToggleIncognito,
    isSplitScreen,
    isAutoBattle,
    onToggleAutoBattle,
    onManualRelay,
    leftMessages = [],
    rightMessages = []
}) => {
  // Left / Main State
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [leftIncognito, setLeftIncognito] = useState(isIncognito);

  // Right State (for Split Input)
  const [textRight, setTextRight] = useState('');
  const [attachmentsRight, setAttachmentsRight] = useState<Attachment[]>([]);
  const [isRecordingRight, setIsRecordingRight] = useState(false);
  const [rightIncognito, setRightIncognito] = useState(isIncognito);

  const [isSplitInput, setIsSplitInput] = useState(false);
  const [focusedSide, setFocusedSide] = useState<'left' | 'right'>('left'); 
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Optimized Token Estimator
  const estimateTokens = (str: string) => {
      if (!str) return 0;
      let total = 0;
      for (let i = 0; i < str.length; i++) {
          const code = str.charCodeAt(i);
          // High precision weighting
          if (code <= 128) {
              total += 0.25; // Basic Latin (avg ~4 chars/token)
          } else if (code > 128 && code < 2048) {
              total += 0.5; // Extended Latin/Symbols
          } else {
              // CJK characters are often 0.6 - 1.5 tokens depending on the tokenizer
              // Averaging to 1.1 for safety against limits
              total += 1.1; 
          }
      }
      return Math.ceil(total);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRightRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRightRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
      setLeftIncognito(isIncognito);
      setRightIncognito(isIncognito);
  }, [isIncognito]);

  useEffect(() => {
      if (!isSplitScreen && isSplitInput) {
          setIsSplitInput(false);
      }
  }, [isSplitScreen]);

  const adjustHeight = (el: HTMLTextAreaElement | null, val: string) => {
      if (el) {
          el.style.height = 'auto'; 
          el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
      }
  };
  useLayoutEffect(() => adjustHeight(textareaRef.current, text), [text]);
  useLayoutEffect(() => adjustHeight(textareaRightRef.current, textRight), [textRight]);

  const handleKeyDown = (e: React.KeyboardEvent, side: 'left' | 'right') => {
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setFocusedSide(side);
      
      const isUnified = !isSplitInput || !isSplitScreen;

      if (isUnified) {
          if (isLeftLoading || isRightLoading) return;
          if (!text.trim() && attachments.length === 0) return;
          onSendMessage(text, attachments, 'both');
          setText(''); setAttachments([]);
      } else {
          if (side === 'left') {
               if (isLeftLoading) return;
               if (text.trim() || attachments.length > 0) {
                   onSendMessage(text, attachments, 'left');
                   setText(''); setAttachments([]);
               }
          } else {
               if (isRightLoading) return;
               if (textRight.trim() || attachmentsRight.length > 0) {
                   onSendMessage(textRight, attachmentsRight, 'right');
                   setTextRight(''); setAttachmentsRight([]);
               }
          }
      }
    }
  };

  const handleCenterSend = () => {
      if (isLeftLoading || isRightLoading) return;

      if (text.trim() || attachments.length > 0) {
          onSendMessage(text, attachments, 'left');
          setText(''); setAttachments([]);
      }
      if (textRight.trim() || attachmentsRight.length > 0) {
          onSendMessage(textRight, attachmentsRight, 'right');
          setTextRight(''); setAttachmentsRight([]);
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isRight: boolean = false) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      files.forEach((file: File) => {
          const reader = new FileReader();
          reader.onload = (readerEvent) => {
              if (readerEvent.target?.result) {
                  const base64 = readerEvent.target.result as string;
                  let type = ContentType.TEXT;
                  if (file.type.startsWith('image/')) type = ContentType.IMAGE;
                  else if (file.type.startsWith('video/')) type = ContentType.VIDEO;
                  else if (file.type.startsWith('audio/')) type = ContentType.AUDIO;
                  
                  // For Gemini, we pass mimetype. 
                  const newAtt: Attachment = { 
                      type: type, 
                      mimeType: file.type || 'application/octet-stream', 
                      data: base64,
                      preview: type === ContentType.IMAGE ? base64 : undefined
                  };
                  
                  if (isRight) setAttachmentsRight(prev => [...prev, newAtt]);
                  else setAttachments(prev => [...prev, newAtt]);
              }
          };
          reader.readAsDataURL(file);
      });
      // Reset input
      if (isRight && fileInputRightRef.current) fileInputRightRef.current.value = '';
      else if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleRecording = (isRight: boolean = false) => {
     // Enhanced Browser Support Check
     const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
     if (!SpeechRecognition) { 
         alert("您的浏览器不支持语音转文字功能。请使用 Chrome, Edge, Safari 或支持 Web Speech API 的浏览器。"); 
         return; 
     }
     
     if ((isRecording && !isRight) || (isRecordingRight && isRight)) {
         recognitionRef.current?.stop();
         setIsRecording(false);
         setIsRecordingRight(false);
         return;
     }

     try {
         const recognition = new SpeechRecognition();
         recognitionRef.current = recognition;
         recognition.continuous = true;
         recognition.lang = 'zh-CN'; // Default language
         recognition.interimResults = true; 
         
         recognition.onstart = () => isRight ? setIsRecordingRight(true) : setIsRecording(true);
         recognition.onend = () => { setIsRecording(false); setIsRecordingRight(false); };
         recognition.onerror = (event: any) => {
             console.warn("Speech Recognition Error", event.error);
             if (event.error === 'not-allowed') {
                 alert("无法访问麦克风，请检查浏览器权限设置。");
             }
             setIsRecording(false);
             setIsRecordingRight(false);
         };
         
         const textBefore = isRight ? textRight : text;
         recognition.onresult = (event: any) => {
             const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('');
             // Simple logic: append to existing text
             const newText = textBefore + (textBefore && transcript ? ' ' : '') + transcript;
             if (isRight) setTextRight(newText);
             else setText(newText);
         };
         recognition.start();
     } catch (e) {
         console.error(e);
         alert("语音识别启动失败，请检查麦克风权限。");
         setIsRecording(false);
         setIsRecordingRight(false);
     }
  };

  const canRelay = (direction: 'left_to_right' | 'right_to_left') => {
      if (isLeftLoading || isRightLoading) return false;
      
      if (direction === 'left_to_right') {
          const lastMsg = leftMessages[leftMessages.length - 1];
          return lastMsg && lastMsg.role === MessageRole.MODEL && !lastMsg.isError;
      } else {
          const lastMsg = rightMessages[rightMessages.length - 1];
          return lastMsg && lastMsg.role === MessageRole.MODEL && !lastMsg.isError;
      }
  };

  const renderAttachments = (atts: Attachment[], setAtts: React.Dispatch<React.SetStateAction<Attachment[]>>) => {
      if (atts.length === 0) return null;
      return (
          <div className="flex gap-2 overflow-x-auto py-2 px-1">
            {atts.map((att, idx) => (
              <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 shadow-sm shrink-0 group bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {att.type === ContentType.IMAGE ? (
                    <img src={att.data} alt="preview" className="w-full h-full object-cover" />
                ) : (
                    <div className="flex flex-col items-center justify-center">
                        <FileIcon className="w-6 h-6 text-gray-500" />
                        <span className="text-[8px] text-gray-500 uppercase mt-0.5 max-w-full px-1 truncate">{att.mimeType.split('/')[1]}</span>
                    </div>
                )}
                
                <button 
                  onClick={(e) => { e.stopPropagation(); setAtts(atts.filter((_, i) => i !== idx)); }}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
      );
  };

  const renderToolbar = (isRight: boolean = false) => {
      const activeRecording = isRight ? isRecordingRight : isRecording;
      const fileRef = isRight ? fileInputRightRef : fileInputRef;

      const isMirrored = isRight && isSplitInput && isSplitScreen;

      return (
          <div className={`flex items-center gap-1 w-full ${isMirrored ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex items-center gap-1">
                  
                  {/* Right Side: Voice, Image */}
                  {isRight && (
                      <button 
                          onClick={() => toggleRecording(isRight)}
                          className={`p-2 transition-all ${activeRecording ? 'text-red-500 animate-pulse' : 'text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400'}`}
                          title="语音输入"
                      >
                          <MicIcon className="w-5 h-5" active={activeRecording} />
                      </button>
                  )}

                  <button 
                      onClick={() => fileRef.current?.click()}
                      disabled={!supportsImages}
                      className={`p-2 transition-colors ${!supportsImages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}
                      title="上传文件 (图片/音频/视频/文档)"
                  >
                      <PlusIcon className="w-5 h-5" />
                  </button>
                  <input type="file" ref={fileRef} className="hidden" multiple onChange={(e) => handleFileChange(e, isRight)} />
                  
                  {/* Left Side: Image, Voice (Original order, swapped for Right above) */}
                  {!isRight && (
                      <button 
                          onClick={() => toggleRecording(isRight)}
                          className={`p-2 transition-all ${activeRecording ? 'text-red-500 animate-pulse' : 'text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400'}`}
                          title="语音输入"
                      >
                          <MicIcon className="w-5 h-5" active={activeRecording} />
                      </button>
                  )}

                  {/* Moved Split Input Toggle Here (Left Only) */}
                  {isSplitScreen && !isRight && (
                      <button 
                          onClick={() => setIsSplitInput(!isSplitInput)}
                          className={`p-2 transition-all ${isSplitInput ? 'text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}
                          title={isSplitInput ? "合并输入框" : "独立输入框"}
                      >
                          <ColumnsIcon className="w-5 h-5" />
                      </button>
                  )}

                  {/* Auto Battle Button (Left Only) - Moved Next to Columns */}
                  {isSplitScreen && !isRight && isSplitInput && (
                      <button 
                          onClick={onToggleAutoBattle}
                          className={`p-2 transition-all ${isAutoBattle ? 'text-orange-500 animate-pulse' : 'text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400'}`}
                          title={isAutoBattle ? "停止对战" : "AI 对战"}
                      >
                          {isAutoBattle ? <StopIcon className="w-5 h-5" /> : <SwordsIcon className="w-5 h-5" />}
                      </button>
                  )}
              </div>

              {/* Spacer */}
              <div className="flex-1"></div>

              {/* Token Count Removed from Toolbar */}

              {isSplitScreen && isRight && isSplitInput && (
                   <div className="flex items-center gap-1">
                       <button 
                          onClick={() => onManualRelay('right_to_left')}
                          disabled={!canRelay('right_to_left')}
                          className={`p-2 transition-all ${
                              !canRelay('right_to_left')
                              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                          }`}
                          title={isMobile ? "将下方最新回复发送给上方" : "将右侧最新回复发送给左侧"}
                      >
                          {isMobile ? <ArrowUpIcon className="w-5 h-5" /> : <ArrowLeftIcon className="w-5 h-5" />}
                      </button>

                      <button 
                          onClick={() => onManualRelay('left_to_right')}
                          disabled={!canRelay('left_to_right')}
                          className={`p-2 transition-all ${
                              !canRelay('left_to_right')
                              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
                          }`}
                          title={isMobile ? "将上方最新回复发送给下方" : "将左侧最新回复发送给右侧"}
                      >
                          {isMobile ? <ArrowDownIcon className="w-5 h-5" /> : <ArrowRightIcon className="w-5 h-5" />}
                      </button>
                   </div>
              )}
          </div>
      );
  };

  const renderSendButton = (side: 'left' | 'right') => {
       const isUnified = !isSplitInput || !isSplitScreen;
       
       const currentText = side === 'left' ? text : textRight;
       const currentAtts = side === 'left' ? attachments : attachmentsRight;
       const isLoading = side === 'left' ? isLeftLoading : isRightLoading;
       
       if (!isUnified) return null;

       if (isLoading && !isAutoBattle) {
           return (
               <button 
                    onClick={() => onStop(side)}
                    className="p-2 flex items-center justify-center transition-transform hover:scale-110 text-gray-800 dark:text-white"
                    title="停止生成"
                >
                    <StopIcon className="w-5 h-5" />
                </button>
           );
       }
       
       const disabled = !currentText.trim() && currentAtts.length === 0;
       
       return (
            <button 
                onClick={() => {
                     onSendMessage(text, attachments, 'both');
                     setText(''); setAttachments([]);
                }}
                disabled={disabled}
                className={`p-2 flex items-center justify-center transition-transform hover:scale-110 ${
                    disabled
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
                title="发送"
            >
                <SendIcon className="w-5 h-5" />
            </button>
       );
  };

  const renderInputBox = (side: 'left' | 'right') => {
      const isRight = side === 'right';
      const isUnified = !isSplitInput || !isSplitScreen;
      
      const currentText = isRight ? textRight : text;
      const currentSetText = isRight ? setTextRight : setText;
      const currentAttachments = isRight ? attachmentsRight : attachments;
      const currentSetAttachments = isRight ? setAttachmentsRight : setAttachments;
      const currentIncognito = isRight ? rightIncognito : leftIncognito;
      const ref = isRight ? textareaRightRef : textareaRef;

      let placeholder = "发消息...";
      if (isUnified && isSplitScreen) placeholder = "同时发送给两边...";
      else if (!isUnified) {
          if (isRight) {
              placeholder = isMobile ? "输入给下方..." : "输入给右侧...";
          } else {
              placeholder = isMobile ? "输入给上方..." : "输入给左侧...";
          }
      }

      return (
          <div className="flex flex-col w-full h-full">
              <div 
                 className={`relative w-full rounded-[26px] p-2 shadow-sm border transition-colors duration-300 flex flex-col flex-1
                    ${currentIncognito ? 'bg-purple-50/30 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800' : 'bg-[#f4f4f4] dark:bg-[#2f2f2f] border-gray-200 dark:border-gray-700'}
                    ${!isUnified && focusedSide === side ? 'ring-1 ring-gray-400/30' : ''}
                 `}
                 onClick={() => !isUnified && setFocusedSide(side)}
              >
                  {renderAttachments(currentAttachments, currentSetAttachments)}
                  
                  <textarea
                      ref={ref}
                      value={currentText}
                      onChange={(e) => currentSetText(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, side)}
                      placeholder={placeholder}
                      className="w-full bg-transparent border-none focus:ring-0 outline-none ring-0 resize-none py-3 px-3 text-gray-800 dark:text-gray-100 placeholder-gray-400 text-[16px] leading-relaxed min-h-[48px] max-h-[200px] custom-scrollbar mb-10 flex-1"
                      rows={1}
                  />

                  <div className={`absolute bottom-2 left-2 right-2 flex items-end ${!isUnified && isRight ? 'justify-end' : 'justify-between'}`}>
                       <div className="flex w-full items-center">
                           {renderToolbar(isRight)}
                       </div>
                       
                       {isUnified && (
                           <div className="flex items-center ml-2">
                               {renderSendButton(side)}
                           </div>
                       )}
                  </div>
              </div>

              {/* Token Count Row - Displayed below the module using current space */}
              <div className="h-4 min-h-[16px] text-[10px] text-gray-400 font-mono px-3 mt-1 flex justify-end items-end">
                   {estimateTokens(currentText) > 0 && <span>~{estimateTokens(currentText)} tokens</span>}
              </div>
          </div>
      );
  };

  const renderCentralButton = () => {
      const isSending = isLeftLoading || isRightLoading;
      const hasContent = (text.trim() || attachments.length > 0) || (textRight.trim() || attachmentsRight.length > 0);
      
      return (
          <div className="flex items-end animate-in zoom-in duration-300">
               {isSending && !isAutoBattle ? (
                   <button 
                        onClick={() => { onStop('left'); onStop('right'); }}
                        className="p-2 text-red-500 flex items-center justify-center hover:text-red-600 transition-all"
                        title="停止生成"
                   >
                        <StopIcon className="w-5 h-5" />
                   </button>
               ) : (
                   <button 
                        onClick={handleCenterSend}
                        disabled={!hasContent}
                        className={`p-2 flex items-center justify-center transition-all ${
                             hasContent 
                             ? 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white' 
                             : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        }`}
                        title="发送"
                   >
                        <SendIcon className="w-5 h-5" />
                   </button>
               )}
          </div>
      );
  };

  return (
    <div className="w-full bg-white dark:bg-[#212121] pt-8 pb-2 px-2 sm:px-4 md:px-0 z-30 flex-shrink-0 flex flex-col gap-2 border-t border-transparent mt-auto">
        <div className={`mx-auto w-full ${isSplitInput && isSplitScreen ? 'max-w-full md:max-w-[95vw] lg:max-w-[90vw]' : 'max-w-3xl'}`}>
            
            <div className={`flex items-end justify-center gap-2 md:gap-3 transition-all duration-500 ease-in-out relative ${isSplitInput && isSplitScreen ? 'w-full px-0 md:px-4' : ''}`}>
                
                <div className={`flex-1 min-w-0 transition-all duration-500 ${isSplitInput && isSplitScreen ? '' : ''}`}>
                    {renderInputBox('left')}
                </div>

                <div className={`transition-all duration-500 ease-in-out overflow-hidden flex justify-center items-end pb-6 ${
                    isSplitInput && isSplitScreen ? 'w-8 md:w-10 opacity-100' : 'w-0 opacity-0 px-0'
                }`}>
                    {isSplitInput && isSplitScreen && renderCentralButton()}
                </div>

                <div className={`flex-1 min-w-0 transition-all duration-500 ease-in-out ${
                    isSplitInput && isSplitScreen ? 'opacity-100' : 'w-0 opacity-0 flex-[0] overflow-hidden'
                }`}>
                    {renderInputBox('right')}
                </div>

            </div>
        </div>
    </div>
  );
};

export default InputArea;
