
import React, { useState, useEffect } from 'react';
import { SettingsIcon, ChevronDownIcon, ChevronUpIcon, KeyIcon, GoogleIcon, TrashIcon, OpenAIIcon, AnthropicIcon, ApiIcon, EditIcon, EyeIcon, EyeOffIcon, SunIcon, MoonIcon, AlertTriangleIcon, GlobeIcon, FileTextIcon, ComputerIcon } from './Icons';
import { StoredKey, ModelProvider, ModelCapability, GenerationConfig } from '../types';
import { API_PROVIDERS } from '../constants';
import { GeminiService } from '../services/geminiService';
import { DB } from '../utils/db';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentModelId: string;
  availableModels: ModelCapability[]; 
  systemInstruction: string;
  onSystemInstructionChange: (text: string) => void;
  config: GenerationConfig;
  onConfigChange: (config: GenerationConfig) => void;
  storedKeys: StoredKey[];
  onAddKey: (key: StoredKey) => void;
  onToggleKey: (id: string) => void;
  onDeleteKey: (id: string) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  targetSectionTrigger?: { section: string, timestamp: number } | null;
  isIncognito: boolean;
  onToggleIncognito: () => void;
  theme: 'light' | 'dark';
  isSplitScreen?: boolean;
  leftSystemInstruction?: string;
  rightSystemInstruction?: string;
  setLeftSystemInstruction?: (t: string) => void;
  setRightSystemInstruction?: (t: string) => void;
}

const AccordionItem: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
}> = ({ title, icon, children, isOpen, onToggle }) => {
    return (
        <div className="border border-gray-200 dark:border-[#2f2f2f] rounded-xl overflow-hidden bg-white dark:bg-[#212121] transition-all">
            <button 
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-[#2a2a2a] hover:bg-gray-100 dark:hover:bg-[#333] transition-colors"
            >
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {icon}
                    {title}
                </div>
                {isOpen ? <ChevronUpIcon className="w-4 h-4 text-gray-400" /> : <ChevronDownIcon className="w-4 h-4 text-gray-400" />}
            </button>
            <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-3 border-t border-gray-100 dark:border-[#333]">
                    {children}
                </div>
            </div>
        </div>
    );
};

const ProviderBadge: React.FC<{ provider: ModelProvider }> = ({ provider }) => {
    switch(provider) {
        case 'google': return <span className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"><GoogleIcon className="w-3 h-3"/> Gemini</span>;
        case 'openai': return <span className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full"><OpenAIIcon className="w-3 h-3"/> OpenAI</span>;
        case 'anthropic': return <span className="flex items-center gap-1 text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full"><AnthropicIcon className="w-3 h-3"/> Claude</span>;
        case 'deepseek': return <span className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">DeepSeek</span>;
        case 'siliconflow': return <span className="flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">SiliconFlow</span>;
        case 'zhipu': return <span className="flex items-center gap-1 text-[10px] bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">GLM</span>;
        case 'custom': return <span className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"><ApiIcon className="w-3 h-3"/> Custom</span>;
        default: return <span className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full uppercase">{provider}</span>;
    }
}

const RightSidebar: React.FC<Props> = ({
  isOpen,
  onClose,
  currentModelId,
  availableModels,
  systemInstruction,
  onSystemInstructionChange,
  config,
  onConfigChange,
  storedKeys,
  onAddKey,
  onToggleKey,
  onDeleteKey,
  targetSectionTrigger,
  isIncognito,
  onToggleIncognito,
  theme,
  isSplitScreen,
  leftSystemInstruction,
  rightSystemInstruction,
  setLeftSystemInstruction,
  setRightSystemInstruction
}) => {
  const modelDef = availableModels.find(m => m.id === currentModelId);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
      'keys': false,
      'model': false,
      'prompts': false,
      'app': false
  });

  const [activePromptTab, setActivePromptTab] = useState<'left' | 'right'>('left');
  const [storageUsage, setStorageUsage] = useState<{ usage: number, quota: number } | null>(null);

  useEffect(() => {
      if (isOpen && 'storage' in navigator && 'estimate' in navigator.storage) {
          navigator.storage.estimate().then(estimate => {
              setStorageUsage({
                  usage: estimate.usage || 0,
                  quota: estimate.quota || 0
              });
          });
      }
  }, [isOpen]);

  const formatBytes = (bytes: number, decimals = 2) => {
      if (!+bytes) return '0 Bytes';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  useEffect(() => {
      if (!isOpen) {
          const timer = setTimeout(() => {
              setOpenSections({ 'keys': false, 'model': false, 'prompts': false, 'app': false });
          }, 300); 
          return () => clearTimeout(timer);
      }
  }, [isOpen]);

  useEffect(() => {
      if (isOpen && targetSectionTrigger) {
          setOpenSections(prev => ({ ...prev, [targetSectionTrigger.section]: true }));
      }
  }, [targetSectionTrigger]);

  const [inputKey, setInputKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ModelProvider>('google');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [showBaseUrlInput, setShowBaseUrlInput] = useState(false);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
      const providerDef = API_PROVIDERS.find(p => p.id === selectedProvider);
      if (providerDef) {
          setCustomBaseUrl(providerDef.baseUrl);
          setShowBaseUrlInput(selectedProvider === 'custom' || selectedProvider === 'openrouter');
      }
  }, [selectedProvider]);

  const toggleSection = (key: string) => {
      setOpenSections(prev => ({...prev, [key]: !prev[key]}));
  };

  const handleEditKey = (key: StoredKey) => {
      setInputKey(key.key);
      setSelectedProvider(key.provider);
      setCustomBaseUrl(key.baseUrl || '');
      setShowBaseUrlInput(true);
      setEditingKeyId(key.id);
      setVerifyError('');
      setSuccessMsg('');
  };

  const handleCancelEdit = () => {
      setInputKey('');
      setSelectedProvider('google');
      setCustomBaseUrl('');
      setEditingKeyId(null);
      setVerifyError('');
      setShowBaseUrlInput(false);
  };

  const handleVerifyAndAdd = async () => {
      const cleanedKey = inputKey.replace(/[^\x00-\x7F]/g, "").trim();

      if (!cleanedKey) {
          setVerifyError("请输入有效的 API Key (仅支持 ASCII 字符)");
          return;
      }

      setIsVerifying(true);
      setVerifyError('');
      setSuccessMsg('');

      try {
          const service = new GeminiService(cleanedKey, selectedProvider, customBaseUrl);
          const { models, platform, balance } = await service.getAvailableModels();

          if (models.length > 0) {
              const providerName = API_PROVIDERS.find(p => p.id === selectedProvider)?.name || platform;
              const newKey: StoredKey = {
                  id: editingKeyId || crypto.randomUUID(), 
                  alias: `${providerName}`,
                  key: cleanedKey,
                  provider: selectedProvider,
                  baseUrl: customBaseUrl,
                  isEnabled: true, 
                  timestamp: Date.now(),
                  balance: balance 
              };
              onAddKey(newKey);
              
              setInputKey('');
              setEditingKeyId(null);
              setSuccessMsg(`验证成功! 已发现 ${models.length} 个模型。`);
              setTimeout(() => setSuccessMsg(''), 3000);
          } else {
              setVerifyError('验证成功，但未发现可用模型。请检查 Key 权限或 Base URL。');
          }
      } catch (e: any) {
          console.error(e);
          setVerifyError(`验证出错: ${e.message}`);
      } finally {
          setIsVerifying(false);
      }
  };

  return (
    <>
        <div 
            className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        />

        <div className={`fixed inset-y-0 right-0 z-50 w-[340px] bg-white dark:bg-[#212121] border-l border-gray-200 dark:border-[#2f2f2f] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#2f2f2f] bg-white dark:bg-[#212121]">
            <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100 tracking-tight">
                配置与服务
            </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-white dark:bg-[#212121]">
            
            <AccordionItem
                title={editingKeyId ? "编辑密钥" : "添加密钥 (OneAPI / 厂商)"}
                icon={<KeyIcon className="w-4 h-4" />}
                isOpen={openSections['keys']}
                onToggle={() => toggleSection('keys')}
            >
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider ml-1">选择平台 / 厂商</label>
                        <select 
                            value={selectedProvider}
                            onChange={(e) => setSelectedProvider(e.target.value as ModelProvider)}
                            className="w-full bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gray-400 appearance-none"
                        >
                            {API_PROVIDERS.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider ml-1">API Key</label>
                        <div className="relative">
                            <input 
                                type="password"
                                value={inputKey}
                                onChange={(e) => setInputKey(e.target.value)}
                                placeholder={selectedProvider === 'google' ? "AIza..." : "sk-..."}
                                className="w-full bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#333] rounded-lg pl-3 pr-8 py-2 text-xs focus:outline-none focus:border-gray-400"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center px-1">
                             <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">代理 / Base URL</label>
                             <button 
                                type="button" 
                                onClick={() => setShowBaseUrlInput(!showBaseUrlInput)} 
                                className="text-[9px] text-gray-600 hover:underline"
                             >
                                 {showBaseUrlInput ? '隐藏' : '修改'}
                             </button>
                        </div>
                        
                        {(showBaseUrlInput || !customBaseUrl) && (
                            <input 
                                type="text"
                                value={customBaseUrl}
                                onChange={(e) => setCustomBaseUrl(e.target.value)}
                                placeholder="https://api.example.com/v1"
                                className="w-full bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gray-400 font-mono text-[10px]"
                            />
                        )}
                        {!showBaseUrlInput && customBaseUrl && (
                            <div className="w-full px-3 py-1.5 bg-gray-50 dark:bg-[#222] rounded-lg border border-transparent text-[10px] text-gray-400 truncate">
                                {customBaseUrl}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 pt-2">
                        {editingKeyId && (
                            <button 
                                type="button"
                                onClick={handleCancelEdit}
                                className="flex-1 py-2 rounded-lg text-xs font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                取消
                            </button>
                        )}
                        <button 
                            type="button"
                            onClick={handleVerifyAndAdd}
                            disabled={isVerifying || !inputKey}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium text-white transition-colors ${isVerifying ? 'bg-gray-400 cursor-not-allowed' : editingKeyId ? 'bg-gray-700 hover:bg-gray-800' : 'bg-black dark:bg-gray-700 hover:opacity-80'}`}
                        >
                            {isVerifying ? '正在探测模型...' : (editingKeyId ? '更新密钥' : '验证并添加')}
                        </button>
                    </div>
                        
                    {verifyError && <div className="text-[10px] text-red-500 bg-red-50 dark:bg-red-900/10 p-2 rounded break-all">{verifyError}</div>}
                    {successMsg && <div className="text-[10px] text-green-600 bg-green-50 dark:bg-green-900/10 p-2 rounded">{successMsg}</div>}

                    <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-[#333]">
                        {storedKeys.length === 0 && <div className="text-center text-gray-400 text-xs py-2">暂无已验证的密钥</div>}
                        {storedKeys.map(key => (
                            <div key={key.id} className={`flex items-center justify-between p-2 border rounded-lg shadow-sm transition-all ${key.isEnabled ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700' : 'bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-[#333]'}`}>
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <ProviderBadge provider={key.provider} />
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate max-w-[100px]">{key.alias}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {key.balance && <span className="text-[9px] text-green-600 bg-green-50 dark:bg-green-900/20 px-1 rounded">{key.balance}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button 
                                        type="button"
                                        onClick={() => onToggleKey(key.id)}
                                        className={`scale-75 w-8 h-4 rounded-full p-0.5 transition-colors ${key.isEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                    >
                                        <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${key.isEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleEditKey(key)}
                                        className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                                        title="编辑"
                                    >
                                        <EditIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={(e) => { 
                                            e.preventDefault();
                                            e.stopPropagation(); 
                                            onDeleteKey(key.id); 
                                        }}
                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                        title="删除"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </AccordionItem>

            <AccordionItem 
                title="当前模型信息" 
                icon={<SettingsIcon className="w-4 h-4" />}
                isOpen={openSections['model']}
                onToggle={() => toggleSection('model')}
            >
                {modelDef ? (
                    <>
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate pr-2" title={modelDef.id}>{modelDef.name}</span>
                            <div className="flex gap-1">
                                {modelDef.supportsImages && <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded">视觉</span>}
                                {modelDef.isThinking && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 rounded">推理</span>}
                            </div>
                        </div>
                        
                        <div className="mb-3 p-2 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg border border-gray-100 dark:border-[#333]">
                            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                <span>Token 上限</span>
                                <span>{config.maxOutputTokens} Output</span>
                            </div>
                            <div className="text-[9px] text-gray-400">
                                {modelDef.contextWindow ? `上下文: ${modelDef.contextWindow}` : '自动检测上下文长度'}
                            </div>
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3 break-all">
                            {modelDef.description}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                        <span className="text-xs text-gray-400 dark:text-gray-500 mb-1">暂无模型信息</span>
                        <span className="text-[10px] text-gray-300 dark:text-gray-600">请添加 Key 并进行验证</span>
                    </div>
                )}
            </AccordionItem>

            <AccordionItem 
                title={isSplitScreen ? "分屏提示词设置" : "系统提示词 (Persona)"}
                icon={<FileTextIcon className="w-4 h-4" />}
                isOpen={openSections['prompts']}
                onToggle={() => toggleSection('prompts')}
            >
                {isSplitScreen ? (
                    <div className="space-y-3">
                        <div className="flex p-1 bg-gray-100 dark:bg-[#333] rounded-lg">
                            <button
                                onClick={() => setActivePromptTab('left')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activePromptTab === 'left' ? 'bg-white dark:bg-[#212121] shadow-sm text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                左屏 (正方)
                            </button>
                            <button
                                onClick={() => setActivePromptTab('right')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activePromptTab === 'right' ? 'bg-white dark:bg-[#212121] shadow-sm text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                右屏 (反方)
                            </button>
                        </div>
                        
                        <textarea 
                            value={activePromptTab === 'left' ? leftSystemInstruction : rightSystemInstruction}
                            onChange={(e) => {
                                if (activePromptTab === 'left' && setLeftSystemInstruction) setLeftSystemInstruction(e.target.value);
                                if (activePromptTab === 'right' && setRightSystemInstruction) setRightSystemInstruction(e.target.value);
                            }}
                            placeholder={activePromptTab === 'left' ? "设置左侧 AI 的人设..." : "设置右侧 AI 的人设..."}
                            className="w-full h-40 px-3 py-2 bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#333] rounded-lg text-xs focus:outline-none focus:border-gray-400 resize-none custom-scrollbar"
                        />
                        <p className="text-[10px] text-gray-400">
                            在 AI 对战模式下，不同的提示词可以让两个 AI 扮演不同的立场进行辩论。
                        </p>
                    </div>
                ) : (
                    <textarea 
                        value={systemInstruction}
                        onChange={(e) => onSystemInstructionChange(e.target.value)}
                        placeholder="你是一个..."
                        className="w-full h-40 px-3 py-2 bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#333] rounded-lg text-xs focus:outline-none focus:border-gray-400 resize-none custom-scrollbar"
                    />
                )}
            </AccordionItem>

            <AccordionItem
                title="应用设置"
                icon={<SettingsIcon className="w-4 h-4" />}
                isOpen={openSections['app']}
                onToggle={() => toggleSection('app')}
            >
                <div className="space-y-3">
                    {modelDef?.provider === 'google' && (
                        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg border border-gray-100 dark:border-[#333] animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2">
                                <GlobeIcon className="w-4 h-4 text-blue-500" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200">联网搜索 (Google)</span>
                                    <span className="text-[9px] text-gray-400">实时检索网络信息</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => onConfigChange({ ...config, enableSearch: !config.enableSearch })}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${config.enableSearch ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                            >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${config.enableSearch ? 'translate-x-4' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg border border-gray-100 dark:border-[#333]">
                        <div className="flex items-center gap-2">
                            {isIncognito ? <EyeOffIcon className="w-4 h-4 text-purple-500" /> : <EyeIcon className="w-4 h-4 text-gray-400" />}
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">无痕模式</span>
                                <span className="text-[9px] text-gray-400">不保存任何对话记录</span>
                            </div>
                        </div>
                        <button 
                            onClick={onToggleIncognito}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isIncognito ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                        >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isIncognito ? 'translate-x-4' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div className="p-2 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg border border-gray-100 dark:border-[#333]">
                        <div className="flex items-center gap-2">
                            {theme === 'light' ? <SunIcon className="w-4 h-4 text-amber-500" /> : <MoonIcon className="w-4 h-4 text-gray-500" />}
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">界面主题</span>
                                <span className="text-[9px] text-gray-400">
                                    跟随系统 (切换系统，切换主题)
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-[#333] pt-3 mt-3">
                        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg border border-gray-100 dark:border-[#333] mb-3">
                            <div className="flex flex-col">
                                 <span className="text-xs font-medium text-gray-700 dark:text-gray-200">已用空间</span>
                                 <span className="text-[9px] text-gray-400 font-mono">
                                     {storageUsage ? formatBytes(storageUsage.usage) : '计算中...'}
                                 </span>
                            </div>
                            <div className="text-right">
                                 <span className="text-xs font-medium text-gray-700 dark:text-gray-200">剩余配额</span>
                                 <span className="text-[9px] text-gray-400 font-mono block">
                                     {storageUsage ? formatBytes(storageUsage.quota - storageUsage.usage) : '...'}
                                 </span>
                            </div>
                        </div>
                        
                        <button 
                            onClick={async () => {
                                if (window.confirm("确定要清空所有聊天记录吗？这将删除所有对话记录、图片缓存和自动保存数据，无法恢复。\n\n保留的数据：\n- API Key\n- 主题设置\n- 模型选择\n- 生成参数\n- 知识库文档\n- 自定义角色")) {
                                    try {
                                        await DB.clearAllSessions();
                                        alert("所有聊天记录已清空，页面将刷新。");
                                        window.location.reload();
                                    } catch (e) {
                                        alert("清空失败，请重试。");
                                    }
                                }
                            }}
                            className="w-full py-2 flex items-center justify-center gap-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20 text-xs font-medium border border-red-100 dark:border-red-900/30 transition-colors"
                        >
                            <TrashIcon className="w-3.5 h-3.5" />
                            清空所有聊天记录
                        </button>
                        
                        <p className="text-[9px] text-gray-400 leading-relaxed text-center mt-2">
                            所有数据均存储在浏览器的 IndexedDB 中。
                        </p>
                    </div>
                </div>
            </AccordionItem>
            
        </div>
        </div>
    </>
  );
};

export default RightSidebar;
