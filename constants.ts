
import { GenerationConfig, ModelProvider } from './types';

export const API_PROVIDERS: { id: ModelProvider; name: string; baseUrl: string; description?: string }[] = [
    { id: 'vercel', name: 'Vercel AI Gateway', baseUrl: 'https://gateway.ai.vercel.com/v1', description: '一个密钥访问所有平台' },
    { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
    { id: 'anthropic', name: 'Anthropic (Claude)', baseUrl: 'https://api.anthropic.com/v1' },
    { id: 'google', name: 'Google (Gemini)', baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
    { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
    { id: 'alibaba', name: 'Alibaba (通义千问)', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
    { id: 'moonshot', name: 'Moonshot AI (Kimi)', baseUrl: 'https://api.moonshot.cn/v1' },
    { id: 'zhipu', name: 'Z.AI (智谱)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
    { id: 'xai', name: 'xAI (Grok)', baseUrl: 'https://api.x.ai/v1' },
    { id: 'mistral', name: 'Mistral', baseUrl: 'https://api.mistral.ai/v1' },
    { id: 'meta', name: 'Meta (Llama)', baseUrl: 'https://api.llama.com/compat/v1' },
    { id: 'amazon', name: 'Amazon (Nova)', baseUrl: 'https://bedrock-runtime.us-east-1.amazonaws.com' },
    { id: 'perplexity', name: 'Perplexity', baseUrl: 'https://api.perplexity.ai' },
    { id: 'cohere', name: 'Cohere', baseUrl: 'https://api.cohere.ai/compatibility/v1' },
    { id: 'minimax', name: 'MiniMax', baseUrl: 'https://api.minimax.chat/v1' },
    { id: 'nvidia', name: 'NVIDIA', baseUrl: 'https://integrate.api.nvidia.com/v1' },
    { id: 'arcee-ai', name: 'Arcee AI', baseUrl: 'https://api.arcee.ai/v1' },
    { id: 'bytedance', name: 'ByteDance', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3' },
    { id: 'inception', name: 'Inception', baseUrl: 'https://api.inception.ai/v1' },
    { id: 'kwaipilot', name: 'KwaiPilot', baseUrl: 'https://api.kwaipilot.com/v1' },
    { id: 'meituan', name: 'Meituan', baseUrl: 'https://api.meituan.com/v1' },
    { id: 'morph', name: 'Morph', baseUrl: 'https://api.morph.ai/v1' },
    { id: 'prime-intellect', name: 'Prime Intellect', baseUrl: 'https://api.primeintellect.ai/v1' },
    { id: 'vercel-models', name: 'Vercel Models', baseUrl: 'https://api.vercel.ai/v1' },
    { id: 'xiaomi', name: 'Xiaomi', baseUrl: 'https://api.xiaomi.com/v1' },
    { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
    { id: 'custom', name: 'OneAPI / 自定义', baseUrl: '' },
];

export const INITIAL_SYSTEM_INSTRUCTION = "你是一个乐于助人的 AI 助手。请用中文回答。使用 Markdown 格式排版。";

export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  temperature: 0.7,
  topP: 0.95,
  maxOutputTokens: 8192,
  historyLimit: 20,
  enableSearch: false
};

export const BUILT_IN_TOOLS = [
  { id: 'weather', name: '天气查询', description: '获取指定地点的天气信息' },
  { id: 'calculator', name: '计算器', description: '执行数学计算' },
  { id: 'search', name: '网页搜索', description: '搜索互联网获取信息' },
  { id: 'datetime', name: '日期时间', description: '获取当前日期和时间' },
  { id: 'translate', name: '翻译', description: '翻译文本到指定语言' },
];
