import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, TrashIcon, EditIcon, WrenchIcon } from './Icons';
import { UserTool } from '../types';
import { BUILT_IN_TOOLS } from '../constants';

interface Props {
  userTools: UserTool[];
  setUserTools: React.Dispatch<React.SetStateAction<UserTool[]>>;
  enabledTools: string[];
  setEnabledTools: React.Dispatch<React.SetStateAction<string[]>>;
  builtInToolNames: string[];
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

const ToolsPanel: React.FC<Props> = ({
  userTools,
  setUserTools,
  enabledTools,
  setEnabledTools,
  builtInToolNames
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTool, setEditingTool] = useState<UserTool | null>(null);
  
  const [newTool, setNewTool] = useState({
    name: '',
    description: '',
    url: '',
    method: 'GET',
  });

  const toggleTool = (toolId: string) => {
    setEnabledTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };

  const handleAddTool = () => {
    if (!newTool.name || !newTool.description) return;
    
    const tool: UserTool = {
      id: crypto.randomUUID(),
      name: newTool.name,
      description: newTool.description,
      inputSchema: {},
      executeType: 'http',
      executeConfig: {
        url: newTool.url,
        method: newTool.method,
      },
      isEnabled: true,
      timestamp: Date.now(),
    };
    
    setUserTools(prev => {
      const updated = [...prev, tool];
      localStorage.setItem('gemini_user_tools', JSON.stringify(updated));
      return updated;
    });
    
    setNewTool({ name: '', description: '', url: '', method: 'GET' });
    setShowAddForm(false);
  };

  const handleDeleteTool = (id: string) => {
    setUserTools(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem('gemini_user_tools', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AccordionItem
      title="工具调用"
      icon={<WrenchIcon className="w-4 h-4" />}
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
    >
      <div className="space-y-3">
        <div className="text-xs text-gray-500 mb-2">
          启用后，AI 可以自主决定调用这些工具来完成任务
        </div>

        <div className="space-y-2">
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider ml-1">内置工具</div>
          {BUILT_IN_TOOLS.map(tool => (
            <div 
              key={tool.id}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg border border-gray-100 dark:border-[#333]"
            >
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{tool.name}</span>
                <span className="text-[9px] text-gray-400">{tool.description}</span>
              </div>
              <button
                type="button"
                onClick={() => toggleTool(tool.id)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                  enabledTools.includes(tool.id) ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  enabledTools.includes(tool.id) ? 'translate-x-4' : 'translate-x-1'
                }`} />
              </button>
            </div>
          ))}
        </div>

        {userTools.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-[#333]">
            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider ml-1">自定义工具</div>
            {userTools.map(tool => (
              <div 
                key={tool.id}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg border border-gray-100 dark:border-[#333]"
              >
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{tool.name}</span>
                  <span className="text-[9px] text-gray-400 truncate">{tool.description}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleTool(tool.id)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                      enabledTools.includes(tool.id) ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      enabledTools.includes(tool.id) ? 'translate-x-4' : 'translate-x-1'
                    }`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTool(tool.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showAddForm ? (
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-[#333]">
            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider ml-1">添加自定义工具</div>
            <input
              type="text"
              value={newTool.name}
              onChange={(e) => setNewTool(prev => ({ ...prev, name: e.target.value }))}
              placeholder="工具名称"
              className="w-full bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gray-400"
            />
            <input
              type="text"
              value={newTool.description}
              onChange={(e) => setNewTool(prev => ({ ...prev, description: e.target.value }))}
              placeholder="工具描述（AI 会根据描述决定何时调用）"
              className="w-full bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gray-400"
            />
            <input
              type="text"
              value={newTool.url}
              onChange={(e) => setNewTool(prev => ({ ...prev, url: e.target.value }))}
              placeholder="API URL (可选，如 https://api.example.com/data)"
              className="w-full bg-white dark:bg-[#171717] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-gray-400"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAddTool}
                disabled={!newTool.name || !newTool.description}
                className="flex-1 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="w-full py-2 flex items-center justify-center gap-2 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] text-xs font-medium text-gray-700 dark:text-gray-200 transition-colors border border-gray-200 dark:border-[#333]"
          >
            <PlusIcon className="w-4 h-4" />
            添加自定义工具
          </button>
        )}

        <div className="text-[9px] text-gray-400 leading-relaxed pt-2 border-t border-gray-100 dark:border-[#333]">
          提示：自定义工具目前支持 HTTP 请求。配置 URL 后，AI 会自动调用该接口获取数据。
        </div>
      </div>
    </AccordionItem>
  );
};

export default ToolsPanel;
