
import React, { useState } from 'react';
import { AVAILABLE_MODELS } from '../constants';
import { SettingsIcon } from './Icons';

interface Props {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  currentModelId: string;
  onModelChange: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const ModelSelector: React.FC<Props> = ({ 
  apiKey, 
  onApiKeyChange, 
  currentModelId, 
  onModelChange,
  isOpen,
  onToggle
}) => {
  const [tempKey, setTempKey] = useState(apiKey);

  const handleKeySave = () => {
    onApiKeyChange(tempKey);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" /> 设置
          </h2>
          <button onClick={onToggle} className="text-slate-500 hover:text-slate-700">关闭</button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* API Key Section */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Gemini API Key
            </label>
            <div className="flex gap-2">
              <input 
                type="password" 
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="AIza..."
                className="flex-1 p-3 rounded-lg border border-slate-300 focus:outline-none focus:border-gray-400 bg-slate-50 text-sm"
              />
              <button 
                onClick={handleKeySave}
                className="bg-gray-800 text-white px-4 rounded-lg font-medium text-sm hover:bg-gray-900"
              >
                保存
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              密钥仅保存在您的浏览器本地。
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              选择模型
            </label>
            <div className="space-y-2">
              {AVAILABLE_MODELS.map(model => (
                <button
                  key={model.id}
                  onClick={() => onModelChange(model.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    currentModelId === model.id 
                      ? 'border-gray-400 bg-gray-50 ring-1 ring-gray-400' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-semibold text-sm">{model.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{model.description}</div>
                  <div className="flex gap-2 mt-2">
                    {model.supportsImages && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">图片</span>}
                    {model.supportsVideoGen && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">视频</span>}
                    {model.supportsAudio && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">音频</span>}
                    {model.isThinking && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">推理</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelSelector;
