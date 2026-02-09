
export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio'
}

export interface Attachment {
  type: ContentType;
  mimeType: string;
  data: string; // Base64 or URL
  preview?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  attachments?: Attachment[];
  timestamp: number;
  isError?: boolean;
  isBookmarked?: boolean; 
  isHidden?: boolean; // New: For auto-battle silent relay
  modelName?: string; // New: Persist the display name of the model
  modelId?: string;   // New: Persist the ID of the model
  groundingMetadata?: any; // New: Store Google Search grounding data
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  rightMessages?: Message[]; // New: Store right pane messages
  timestamp: number;
  // Per-session System Instructions
  leftSystemInstruction?: string;
  rightSystemInstruction?: string;
}

// Expanded Provider List
export type ModelProvider = 
  | 'google' 
  | 'openai' 
  | 'anthropic' 
  | 'deepseek'
  | 'alibaba' // Dashscope
  | 'tencent' // Hunyuan
  | 'moonshot' // Kimi
  | 'zhipu' // BigModel
  | 'minimax'
  | 'baichuan'
  | 'yi' // 01.ai
  | 'siliconflow' // SiliconFlow
  | 'grok' // xAI
  | 'openrouter'
  | 'custom'; // OneAPI / Other

export interface StoredKey {
  id: string;
  alias: string;
  key: string;
  provider: ModelProvider;
  baseUrl?: string; 
  isEnabled: boolean;
  timestamp: number;
  balance?: string; 
}

export interface ModelCapability {
  id: string;
  name: string;
  provider: ModelProvider;
  description?: string;
  supportsImages: boolean;
  supportsVideoGen: boolean;
  supportsAudio: boolean;
  isThinking?: boolean;
  isOnline?: boolean; 
  contextWindow?: string; 
}

export interface VoiceConfig {
  autoRead: boolean;
  speed: number;
}

export interface GenerationConfig {
  temperature: number;
  topP: number;
  maxOutputTokens: number;
  historyLimit: number;
  voiceConfig?: VoiceConfig; 
  enableSearch?: boolean; // New: Google Grounding
}

export interface PromptPreset {
  id: string;
  name: string;
  description: string;
  content: string;
}

export interface KnowledgeFile {
  id: string;
  name: string;
  content: string; // Text content
  size: number;
  timestamp: number;
  isActive: boolean; // Whether to include in current context
}

export interface AppState {
  apiKey: string;
  currentModelId: string;
  messages: Message[];
  isLoading: boolean;
  isSettingsOpen: boolean;
}

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
