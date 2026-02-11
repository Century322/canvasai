
import { GenerationConfig, PromptPreset, ModelProvider, ModelCapability } from './types';

// Provider Definitions for UI Dropdown and Auto-fill
// Base URLs must point to the root of the OpenAI compatible endpoint (usually without /chat/completions)
export const API_PROVIDERS: { id: ModelProvider; name: string; baseUrl: string; icon?: string }[] = [
    { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
    { id: 'custom', name: 'OneAPI / 自定义', baseUrl: '' },
];

// AVAILABLE_MODELS 已移除，现在使用 OpenRouter API 获取实时模型列表

export const INITIAL_SYSTEM_INSTRUCTION = "你是一个乐于助人的 AI 助手。请用中文回答。使用 Markdown 格式排版。";

export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  temperature: 0.7,
  topP: 0.95,
  maxOutputTokens: 8192,
  historyLimit: 20,
  enableSearch: false
};

// 预设角色已移除，用户可通过自定义角色功能创建
