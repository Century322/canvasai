
import { GenerationConfig, PromptPreset, ModelProvider, ModelCapability } from './types';

// Provider Definitions for UI Dropdown and Auto-fill
// Base URLs must point to the root of the OpenAI compatible endpoint (usually without /chat/completions)
export const API_PROVIDERS: { id: ModelProvider; name: string; baseUrl: string; icon?: string }[] = [
    { id: 'google', name: 'Google Gemini', baseUrl: '' }, // Empty defaults to official SDK/REST
    { id: 'openai', name: 'OpenAI (官方)', baseUrl: 'https://api.openai.com/v1' },
    { id: 'anthropic', name: 'Anthropic Claude', baseUrl: 'https://api.anthropic.com/v1' },
    { id: 'deepseek', name: 'DeepSeek (深度求索)', baseUrl: 'https://api.deepseek.com' },
    { id: 'siliconflow', name: 'SiliconFlow (硅基流动)', baseUrl: 'https://api.siliconflow.cn/v1' },
    { id: 'alibaba', name: '阿里通义千问 (Dashscope)', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
    { id: 'zhipu', name: '智谱 AI (BigModel)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
    { id: 'moonshot', name: '月之暗面 (Kimi)', baseUrl: 'https://api.moonshot.cn/v1' },
    { id: 'yi', name: '零一万物 (Yi)', baseUrl: 'https://api.lingyiwanwu.com/v1' },
    { id: 'tencent', name: '腾讯混元 (Hunyuan)', baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1' },
    { id: 'minimax', name: 'MiniMax (海螺)', baseUrl: 'https://api.minimax.chat/v1' },
    { id: 'baichuan', name: '百川智能 (Baichuan)', baseUrl: 'https://api.baichuan-ai.com/v1' },
    { id: 'grok', name: 'Grok (xAI)', baseUrl: 'https://api.x.ai/v1' },
    { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
    { id: 'custom', name: 'OneAPI / 自定义', baseUrl: '' },
];

export const AVAILABLE_MODELS: ModelCapability[] = [
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    provider: 'google',
    description: '高速、低延迟，适合大多数任务',
    supportsImages: true,
    supportsVideoGen: false,
    supportsAudio: true,
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    provider: 'google',
    description: '高智商，适合复杂推理',
    supportsImages: true,
    supportsVideoGen: false,
    supportsAudio: true,
    isThinking: true
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    provider: 'google',
    description: '图像生成专用模型',
    supportsImages: true,
    supportsVideoGen: false,
    supportsAudio: false
  },
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Gemini 3 Pro Image',
    provider: 'google',
    description: '高质量图像生成',
    supportsImages: true,
    supportsVideoGen: false,
    supportsAudio: false
  },
  {
    id: 'veo-3.1-fast-generate-preview',
    name: 'Veo 3.1 Fast',
    provider: 'google',
    description: '快速视频生成',
    supportsImages: false,
    supportsVideoGen: true,
    supportsAudio: false
  },
  {
    id: 'veo-3.1-generate-preview',
    name: 'Veo 3.1',
    provider: 'google',
    description: '高质量视频生成',
    supportsImages: false,
    supportsVideoGen: true,
    supportsAudio: false
  }
];

export const INITIAL_SYSTEM_INSTRUCTION = "你是一个乐于助人的 AI 助手。请用中文回答。使用 Markdown 格式排版。";

export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  temperature: 0.7,
  topP: 0.95,
  maxOutputTokens: 8192,
  historyLimit: 20,
  enableSearch: false
};

export const PRESET_PROMPTS: PromptPreset[] = [
  {
    id: 'default',
    name: '默认助手',
    description: '通用的 AI 助手',
    content: INITIAL_SYSTEM_INSTRUCTION
  },
  {
    id: 'translator',
    name: '中英翻译官',
    description: '专业的翻译人员',
    content: "你是一位精通简体中文和英语的专业翻译。我发送给你的任何内容，如果是中文请翻译成英文，如果是英文请翻译成中文。保持语言优美流畅，信达雅。"
  },
  {
    id: 'coder',
    name: '代码专家',
    description: '精通各类编程语言',
    content: "你是一位资深的全栈工程师和架构师。请提供高效、健壮、可读性强的代码。在解释代码时要清晰明了。如果代码有潜在 bug 或优化空间，请指出。"
  },
  {
    id: 'writer',
    name: '文案写手',
    description: '擅长小红书/营销文案',
    content: "你是一位资深的新媒体文案写手。擅长使用 emoji，语气活泼有趣，能够吸引读者眼球。请帮助我撰写吸引人的标题和正文。"
  },
  {
    id: 'academic',
    name: '学术润色',
    description: '论文写作与润色',
    content: "你是一位学术论文编辑。请帮助我润色以下文本，使其更符合学术规范，用词更加严谨、客观。请指出语法错误和逻辑漏洞。"
  }
];
