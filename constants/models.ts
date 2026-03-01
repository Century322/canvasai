export interface ModelProviderConfig {
  id: string;
  name: string;
  description: string;
  models: ModelConfig[];
  requiresApiKey: boolean;
  apiKeyPlaceholder?: string;
  baseUrl?: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  description?: string;
  supportsImages?: boolean;
  supportsAudio?: boolean;
  supportsVideo?: boolean;
  isThinking?: boolean;
  isPaid?: boolean;
  contextWindow?: string;
}

export const MODEL_PROVIDERS: ModelProviderConfig[] = [
  {
    id: 'vercel',
    name: 'Vercel AI Gateway',
    description: '一个密钥访问所有平台模型',
    requiresApiKey: true,
    apiKeyPlaceholder: 'AI Gateway API Key',
    models: []
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT 系列模型',
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-...',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'o4-mini', name: 'O4 Mini', description: '最新推理模型' },
      { id: 'o3-mini', name: 'O3 Mini', description: '高效推理模型' },
      { id: 'o3-deep-research', name: 'O3 Deep Research', description: '深度研究模型', isThinking: true },
      { id: 'o3-pro', name: 'O3 Pro', description: '专业推理模型', isPaid: true },
      { id: 'o3', name: 'O3', description: 'O3 推理模型' },
      { id: 'o1', name: 'O1', description: 'O1 推理模型', isThinking: true },
      { id: 'gpt-5.1-codex', name: 'GPT-5.1 Codex', description: '代码生成模型', isPaid: true },
      { id: 'gpt-5.1-instant', name: 'GPT-5.1 Instant', description: '快速响应模型' },
      { id: 'gpt-5-codex', name: 'GPT-5 Codex', description: '代码生成模型', isPaid: true },
      { id: 'gpt-5-pro', name: 'GPT-5 Pro', description: '专业版模型', isPaid: true },
      { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: '轻量级模型' },
      { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: '小型模型' },
      { id: 'gpt-5', name: 'GPT-5', description: 'GPT-5 标准版', isPaid: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '多模态小型模型', supportsImages: true },
      { id: 'gpt-4o', name: 'GPT-4o', description: '多模态模型', supportsImages: true, isPaid: true },
      { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', description: '轻量级模型' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: '小型模型' },
      { id: 'gpt-4.1', name: 'GPT-4.1', description: 'GPT-4.1 标准版', isPaid: true },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'GPT-4 加速版', supportsImages: true, isPaid: true },
      { id: 'gpt-3.5-turbo-instruct', name: 'GPT-3.5 Turbo Instruct', description: '指令模型' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: '经典快速模型' },
      { id: 'gpt-5.3-codex', name: 'GPT-5.3 Codex', description: '最新代码模型', isPaid: true },
      { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex', description: '代码生成模型', isPaid: true },
      { id: 'gpt-5.2-chat', name: 'GPT-5.2 Chat', description: '对话模型', isPaid: true },
      { id: 'gpt-5.2-pro', name: 'GPT-5.2 Pro', description: '专业版模型', isPaid: true },
      { id: 'gpt-5.2', name: 'GPT-5.2', description: 'GPT-5.2 标准版', isPaid: true },
      { id: 'gpt-5.1-thinking', name: 'GPT-5.1 Thinking', description: '思维链模型', isThinking: true },
      { id: 'gpt-5.1-codex-mini', name: 'GPT-5.1 Codex Mini', description: '轻量代码模型' },
      { id: 'gpt-5.1-codex-max', name: 'GPT-5.1 Codex Max', description: '大型代码模型', isPaid: true },
      { id: 'gpt-5-chat', name: 'GPT-5 Chat', description: '对话优化模型', isPaid: true },
      { id: 'gpt-4o-mini-search-preview', name: 'GPT-4o Mini Search', description: '搜索预览版', supportsImages: true },
      { id: 'codex-mini', name: 'Codex Mini', description: '代码助手' },
      { id: 'pt-oss-safeguard-20b', name: 'PT OSS Safeguard 20B', description: '安全防护模型' },
      { id: 'gpt-oss-20b', name: 'GPT OSS 20B', description: '开源模型' },
      { id: 'gpt-oss-120b', name: 'GPT OSS 120B', description: '大型开源模型', isPaid: true },
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 系列模型',
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-ant-...',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', description: '最新 Sonnet 模型', supportsImages: true },
      { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', description: 'Sonnet 4.5 模型', supportsImages: true },
      { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Sonnet 4 模型', supportsImages: true },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', description: '最强 Opus 模型', supportsImages: true, isPaid: true },
      { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', description: 'Opus 4.5 模型', supportsImages: true, isPaid: true },
      { id: 'claude-opus-4-1', name: 'Claude Opus 4.1', description: 'Opus 4.1 模型', supportsImages: true, isPaid: true },
      { id: 'claude-opus-4', name: 'Claude Opus 4', description: 'Opus 4 模型', supportsImages: true, isPaid: true },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', description: '快速 Haiku 模型', supportsImages: true },
      { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', description: 'Claude 3.7 Sonnet', supportsImages: true },
      { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet (20240620)', description: 'Claude 3.5 Sonnet', supportsImages: true },
      { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Claude 3.5 Sonnet', supportsImages: true },
      { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', description: 'Claude 3.5 Haiku', supportsImages: true },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', description: 'Claude 3 Opus', supportsImages: true, isPaid: true },
      { id: 'claude-3-haiku', name: 'Claude 3 Haiku', description: 'Claude 3 Haiku', supportsImages: true },
    ]
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Gemini 系列模型',
    requiresApiKey: true,
    apiKeyPlaceholder: 'AIza...',
    baseUrl: 'https://generativelanguage.googleapis.com',
    models: [
      { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image Preview', description: '图像生成预览版', supportsImages: true, supportsVideo: true },
      { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', description: '图像模型', supportsImages: true },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', description: 'Pro 预览版', supportsImages: true, isPaid: true },
      { id: 'gemini-3.1-flash-image-preview', name: 'Gemini 3.1 Flash Image Preview', description: 'Flash 图像预览版', supportsImages: true },
      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', description: 'Gemini 3 Pro 预览版', supportsImages: true, isPaid: true },
      { id: 'gemini-3-flash', name: 'Gemini 3 Flash', description: 'Gemini 3 Flash', supportsImages: true },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Gemini 2.5 Pro', supportsImages: true, isPaid: true },
      { id: 'gemini-2.5-flash-preview-09-2025', name: 'Gemini 2.5 Flash Preview', description: 'Flash 预览版', supportsImages: true },
      { id: 'gemini-2.5-flash-lite-preview-09-2025', name: 'Gemini 2.5 Flash Lite Preview', description: 'Lite 预览版', supportsImages: true },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: '轻量版', supportsImages: true },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Gemini 2.5 Flash', supportsImages: true },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'Gemini 2.0 Lite', supportsImages: true },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Gemini 2.0 Flash', supportsImages: true },
    ]
  },
  {
    id: 'alibaba',
    name: 'Alibaba (通义千问)',
    description: '通义千问系列模型',
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-...',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [
      { id: 'qwen-3-30b', name: 'Qwen 3 30B', description: '30B 参数模型' },
      { id: 'qwen-3-235b', name: 'Qwen 3 235B', description: '235B 参数模型', isPaid: true },
      { id: 'qwen-3-14b', name: 'Qwen 3 14B', description: '14B 参数模型' },
      { id: 'qwen3-vl-thinking', name: 'Qwen3 VL Thinking', description: '视觉思维模型', supportsImages: true, isThinking: true },
      { id: 'qwen3-vl-instruct', name: 'Qwen3 VL Instruct', description: '视觉指令模型', supportsImages: true },
      { id: 'qwen3-next-80b-a3b-thinking', name: 'Qwen3 Next 80B Thinking', description: '思维链模型', isThinking: true, isPaid: true },
      { id: 'qwen3-next-80b-a3b-instruct', name: 'Qwen3 Next 80B Instruct', description: '指令模型', isPaid: true },
      { id: 'qwen3-max-preview', name: 'Qwen3 Max Preview', description: 'Max 预览版', isPaid: true },
      { id: 'qwen3-max', name: 'Qwen3 Max', description: 'Qwen3 Max', isPaid: true },
      { id: 'qwen3-coder-plus', name: 'Qwen3 Coder Plus', description: '代码增强模型' },
      { id: 'qwen3-coder-next', name: 'Qwen3 Coder Next', description: '下一代代码模型' },
      { id: 'qwen3-coder', name: 'Qwen3 Coder', description: '代码模型' },
      { id: 'qwen3-235b-a22b-thinking', name: 'Qwen3 235B Thinking', description: '思维链模型', isThinking: true, isPaid: true },
      { id: 'qwen3.5-plus', name: 'Qwen3.5 Plus', description: 'Qwen3.5 Plus' },
      { id: 'qwen3.5-flash', name: 'Qwen3.5 Flash', description: 'Qwen3.5 Flash' },
      { id: 'qwen3-max-thinking', name: 'Qwen3 Max Thinking', description: 'Max 思维链模型', isThinking: true, isPaid: true },
      { id: 'qwen3-coder-30b-a3b', name: 'Qwen3 Coder 30B', description: '代码模型' },
      { id: 'qwen-3-32b', name: 'Qwen 3 32B', description: '32B 参数模型' },
    ]
  },
  {
    id: 'bytedance',
    name: 'ByteDance',
    description: '字节跳动模型',
    requiresApiKey: true,
    apiKeyPlaceholder: 'API Key',
    models: [
      { id: 'seed-1.6', name: 'Seed 1.6', description: 'Seed 1.6 模型' },
      { id: 'seed-1.8', name: 'Seed 1.8', description: 'Seed 1.8 模型' },
    ]
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek 模型',
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-...',
    baseUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-v3.1', name: 'DeepSeek V3.1', description: 'DeepSeek V3.1' },
      { id: 'deepseek-r1', name: 'DeepSeek R1', description: '推理模型', isThinking: true },
      { id: 'deepseek-v3.2-thinking', name: 'DeepSeek V3.2 Thinking', description: '思维链模型', isThinking: true },
      { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', description: 'DeepSeek V3.2' },
      { id: 'deepseek-v3.1-terminus', name: 'DeepSeek V3.1 Terminus', description: 'Terminus 版本' },
      { id: 'deepseek-v3', name: 'DeepSeek V3', description: 'DeepSeek V3' },
    ]
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    description: 'MiniMax 模型',
    requiresApiKey: true,
    apiKeyPlaceholder: 'API Key',
    models: [
      { id: 'minimax-m2.5', name: 'MiniMax M2.5', description: 'M2.5 模型' },
      { id: 'minimax-m2.1-lightning', name: 'MiniMax M2.1 Lightning', description: '闪电版' },
      { id: 'minimax-m2.1', name: 'MiniMax M2.1', description: 'M2.1 模型' },
      { id: 'minimax-m2', name: 'MiniMax M2', description: 'M2 模型' },
    ]
  },
  {
    id: 'moonshot',
    name: 'Moonshot AI (Kimi)',
    description: '月之暗面 Kimi 模型',
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-...',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: [
      { id: 'kimi-k2.5', name: 'Kimi K2.5', description: '最新 Kimi 模型' },
      { id: 'kimi-k2-turbo', name: 'Kimi K2 Turbo', description: '加速版' },
      { id: 'kimi-k2-thinking-turbo', name: 'Kimi K2 Thinking Turbo', description: '思维链加速版', isThinking: true },
      { id: 'kimi-k2-thinking', name: 'Kimi K2 Thinking', description: '思维链模型', isThinking: true },
      { id: 'kimi-k2-0905', name: 'Kimi K2 (0905)', description: 'K2 版本' },
      { id: 'kimi-k2', name: 'Kimi K2', description: 'Kimi K2 模型' },
    ]
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    description: 'Perplexity Sonar 模型',
    requiresApiKey: true,
    apiKeyPlaceholder: 'pplx-...',
    baseUrl: 'https://api.perplexity.ai',
    models: [
      { id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', description: '推理专业版', isThinking: true, isPaid: true },
      { id: 'sonar-reasoning', name: 'Sonar Reasoning', description: '推理模型', isThinking: true },
      { id: 'sonar-pro', name: 'Sonar Pro', description: '专业版', isPaid: true },
      { id: 'sonar', name: 'Sonar', description: '标准版' },
    ]
  },
  {
    id: 'vercel-models',
    name: 'Vercel',
    description: 'Vercel 模型',
    requiresApiKey: true,
    apiKeyPlaceholder: 'API Key',
    models: [
      { id: 'v0-1.5-md', name: 'V0 1.5 MD', description: 'Markdown 模型' },
      { id: 'v0-1.0-md', name: 'V0 1.0 MD', description: 'Markdown 模型' },
    ]
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    description: 'xAI Grok 系列模型',
    requiresApiKey: true,
    apiKeyPlaceholder: 'xai-...',
    baseUrl: 'https://api.x.ai/v1',
    models: [
      { id: 'grok-2-1212', name: 'Grok 2 (1212)', description: 'Grok 2 最新版' },
      { id: 'grok-2-vision-1212', name: 'Grok 2 Vision (1212)', description: '视觉模型', supportsImages: true },
      { id: 'grok-2', name: 'Grok 2', description: 'Grok 2 模型' },
      { id: 'grok-2-vision', name: 'Grok 2 Vision', description: '视觉模型', supportsImages: true },
      { id: 'grok-beta', name: 'Grok Beta', description: 'Grok 测试版' },
      { id: 'grok-vision-beta', name: 'Grok Vision Beta', description: '视觉测试版', supportsImages: true },
    ]
  },
  {
    id: 'zhipu',
    name: 'Z.AI (智谱)',
    description: '智谱 GLM 系列模型',
    requiresApiKey: true,
    apiKeyPlaceholder: 'API Key',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-5', name: 'GLM 5', description: '最新 GLM 模型' },
      { id: 'glm-4.6v-flash', name: 'GLM 4.6V Flash', description: '视觉 Flash 版', supportsImages: true },
      { id: 'glm-4.6v', name: 'GLM 4.6V', description: '视觉模型', supportsImages: true },
      { id: 'glm-4.5', name: 'GLM 4.5', description: 'GLM 4.5 模型' },
      { id: 'glm-4.7-flashx', name: 'GLM 4.7 FlashX', description: 'FlashX 版本' },
      { id: 'glm-4.7', name: 'GLM 4.7', description: 'GLM 4.7 模型' },
      { id: 'glm-4.6', name: 'GLM 4.6', description: 'GLM 4.6 模型' },
      { id: 'glm-4.5v', name: 'GLM 4.5V', description: '视觉模型', supportsImages: true },
      { id: 'glm-4.5-air', name: 'GLM 4.5 Air', description: '轻量版' },
    ]
  },
];

export const getAllModels = (): (ModelConfig & { providerId: string; providerName: string })[] => {
  return MODEL_PROVIDERS.flatMap(provider => 
    provider.models.map(model => ({
      ...model,
      providerId: provider.id,
      providerName: provider.name
    }))
  );
};

export const getModelsByProvider = (providerId: string): ModelConfig[] => {
  const provider = MODEL_PROVIDERS.find(p => p.id === providerId);
  return provider?.models || [];
};

export const getProviderById = (providerId: string): ModelProviderConfig | undefined => {
  return MODEL_PROVIDERS.find(p => p.id === providerId);
};

export const getVercelGatewayModels = (): string[] => {
  return MODEL_PROVIDERS
    .filter(p => p.id !== 'vercel')
    .flatMap(provider => 
      provider.models.map(model => `${provider.id}/${model.id}`)
    );
};
