import { streamText, tool, stepCountIs } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { Message, MessageRole, Attachment, GenerationConfig, UserTool, ModelProvider } from '../types';
import { getProviderById } from '../constants/models';

export interface AISDKMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  execute: (params: any) => Promise<any>;
}

const builtInTools: Record<string, ToolDefinition> = {
  weather: {
    name: 'weather',
    description: '获取指定地点的天气信息',
    inputSchema: z.object({
      location: z.string().describe('要查询天气的地点'),
    }),
    execute: async ({ location }) => {
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=demo&units=metric&lang=zh_cn`
        );
        if (response.ok) {
          const data = await response.json();
          return {
            location: data.name,
            temperature: Math.round(data.main.temp),
            description: data.weather[0].description,
            humidity: data.main.humidity,
          };
        }
      } catch (e) {}
      const temperature = Math.round(Math.random() * 35 - 5);
      const conditions = ['晴朗', '多云', '阴天', '小雨', '大雨', '雪'];
      return {
        location,
        temperature,
        description: conditions[Math.floor(Math.random() * conditions.length)],
        humidity: Math.round(Math.random() * 60 + 30),
      };
    },
  },
  calculator: {
    name: 'calculator',
    description: '执行基本数学计算（加减乘除和幂运算）',
    inputSchema: z.object({
      expression: z.string().describe('要计算的数学表达式，如 "2+2" 或 "2*3" 或 "2^3"'),
    }),
    execute: async ({ expression }) => {
      try {
        const sanitized = expression.replace(/[^0-9+\-*/().^\s]/g, '');
        if (!sanitized || sanitized.length === 0) {
          return { expression, error: '无效的表达式' };
        }
        const sanitizedForEval = sanitized.replace(/\^/g, '**');
        let result: number;
        try {
          result = Function(`"use strict"; return (${sanitizedForEval})`)();
        } catch {
          return { expression, error: '无法计算该表达式' };
        }
        if (typeof result !== 'number' || !isFinite(result)) {
          return { expression, error: '计算结果无效' };
        }
        return { expression, result: Number(result.toFixed(10)) };
      } catch (e) {
        return { expression, error: '计算出错' };
      }
    },
  },
  search: {
    name: 'search',
    description: '搜索互联网获取信息',
    inputSchema: z.object({
      query: z.string().describe('要搜索的内容'),
    }),
    execute: async ({ query }) => {
      return {
        query,
        results: [
          { title: `关于"${query}"的搜索结果`, snippet: `这是关于"${query}"的相关信息...`, url: `https://example.com/search?q=${encodeURIComponent(query)}` }
        ],
        note: '这是一个模拟的搜索结果。要启用真实搜索，请配置搜索 API。'
      };
    },
  },
  datetime: {
    name: 'datetime',
    description: '获取当前日期和时间',
    inputSchema: z.object({
      timezone: z.string().optional().describe('时区，如 "Asia/Shanghai"'),
    }),
    execute: async ({ timezone }) => {
      const now = new Date();
      return {
        date: now.toLocaleDateString('zh-CN', { timeZone: timezone || 'Asia/Shanghai' }),
        time: now.toLocaleTimeString('zh-CN', { timeZone: timezone || 'Asia/Shanghai' }),
        timestamp: now.getTime(),
        timezone: timezone || 'Asia/Shanghai',
      };
    },
  },
  translate: {
    name: 'translate',
    description: '翻译文本到指定语言',
    inputSchema: z.object({
      text: z.string().describe('要翻译的文本'),
      targetLang: z.string().describe('目标语言，如 "en", "ja", "ko"'),
    }),
    execute: async ({ text, targetLang }) => {
      return {
        originalText: text,
        targetLang,
        translatedText: `[翻译到${targetLang}]: ${text}`,
        note: '这是一个模拟的翻译结果。要启用真实翻译，请配置翻译 API。',
      };
    },
  },
};

export function createUserTool(userTool: UserTool): ToolDefinition {
  return {
    name: userTool.name,
    description: userTool.description,
    inputSchema: z.object(
      Object.entries(userTool.inputSchema as Record<string, any>).reduce((acc, [key, value]) => {
        acc[key] = z.string();
        return acc;
      }, {} as Record<string, z.ZodString>)
    ),
    execute: async (params) => {
      if (userTool.executeType === 'http' && userTool.executeConfig.url) {
        try {
          const url = userTool.executeConfig.url.replace(/\{(\w+)\}/g, (_, key) => params[key] || '');
          const response = await fetch(url, {
            method: userTool.executeConfig.method || 'GET',
            headers: userTool.executeConfig.headers,
          });
          const data = await response.json();
          return data;
        } catch (e) {
          return { error: 'HTTP 请求失败', message: String(e) };
        }
      }
      return { result: '工具执行完成' };
    },
  };
}

function convertMessages(messages: Message[]): AISDKMessage[] {
  return messages
    .filter(m => !m.isError && m.role !== MessageRole.SYSTEM)
    .map(m => ({
      role: m.role === MessageRole.USER ? 'user' : 'assistant',
      content: m.content,
    }));
}

interface ProviderConfig {
  apiKey: string;
  providerId: ModelProvider;
  baseUrl?: string;
}

const isDev = () => typeof window !== 'undefined' && window.location.hostname === 'localhost';

const PROVIDER_ENDPOINTS: Record<string, string> = {
  vercel: '/chat/completions',
  openai: '/chat/completions',
  anthropic: '/messages',
  google: '/models/{model}:generateContent',
  deepseek: '/chat/completions',
  alibaba: '/chat/completions',
  xai: '/chat/completions',
  perplexity: '/chat/completions',
  moonshot: '/chat/completions',
  zhipu: '/chat/completions',
  minimax: '/chat/completions',
  bytedance: '/chat/completions',
};

function createModelClient(config: ProviderConfig, modelId: string) {
  const { apiKey, providerId, baseUrl } = config;

  if (isDev()) {
    switch (providerId) {
      case 'vercel': {
        const vercelClient = createOpenAI({
          apiKey,
          baseURL: '/api/vercel',
        });
        return vercelClient.chat(modelId);
      }
      case 'anthropic': {
        const anthropicClient = createAnthropic({
          apiKey,
          baseURL: '/api/anthropic',
        });
        return anthropicClient(modelId);
      }
      case 'google': {
        const googleClient = createOpenAI({
          apiKey,
          baseURL: '/api/google',
        });
        return googleClient.chat(modelId);
      }
      case 'openai': {
        const openaiClient = createOpenAI({
          apiKey,
          baseURL: '/api/openai',
        });
        return openaiClient.chat(modelId);
      }
      case 'alibaba': {
        const alibabaClient = createOpenAI({
          apiKey,
          baseURL: '/api/alibaba',
        });
        return alibabaClient.chat(modelId);
      }
      case 'deepseek': {
        const deepseekClient = createOpenAI({
          apiKey,
          baseURL: '/api/deepseek',
        });
        return deepseekClient.chat(modelId);
      }
      case 'xai': {
        const xaiClient = createOpenAI({
          apiKey,
          baseURL: '/api/xai',
        });
        return xaiClient.chat(modelId);
      }
      case 'perplexity': {
        const perplexityClient = createOpenAI({
          apiKey,
          baseURL: '/api/perplexity',
        });
        return perplexityClient.chat(modelId);
      }
      case 'moonshot': {
        const moonshotClient = createOpenAI({
          apiKey,
          baseURL: '/api/moonshot',
        });
        return moonshotClient.chat(modelId);
      }
      case 'zhipu': {
        const zhipuClient = createOpenAI({
          apiKey,
          baseURL: '/api/zhipu',
        });
        return zhipuClient.chat(modelId);
      }
      case 'minimax': {
        const minimaxClient = createOpenAI({
          apiKey,
          baseURL: '/api/minimax',
        });
        return minimaxClient.chat(modelId);
      }
      case 'bytedance': {
        const bytedanceClient = createOpenAI({
          apiKey,
          baseURL: '/api/bytedance',
        });
        return bytedanceClient.chat(modelId);
      }
      default: {
        const customClient = createOpenAI({
          apiKey,
          baseURL: baseUrl || 'https://api.openai.com/v1',
        });
        return customClient.chat(modelId);
      }
    }
  }

  switch (providerId) {
    case 'vercel': {
      const vercelClient = createOpenAI({
        apiKey,
        baseURL: 'https://gateway.ai.vercel.com/v1',
      });
      return vercelClient.chat(modelId);
    }
    case 'anthropic': {
      const anthropicClient = createAnthropic({
        apiKey,
      });
      return anthropicClient(modelId);
    }
    case 'google': {
      const googleClient = createOpenAI({
        apiKey,
        baseURL: baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
      });
      return googleClient.chat(modelId);
    }
    case 'openai': {
      const openaiClient = createOpenAI({
        apiKey,
        baseURL: baseUrl || 'https://api.openai.com/v1',
      });
      return openaiClient.chat(modelId);
    }
    case 'alibaba': {
      const alibabaClient = createOpenAI({
        apiKey,
        baseURL: baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      });
      return alibabaClient.chat(modelId);
    }
    case 'deepseek': {
      const deepseekClient = createOpenAI({
        apiKey,
        baseURL: baseUrl || 'https://api.deepseek.com/v1',
      });
      return deepseekClient.chat(modelId);
    }
    case 'xai': {
      const xaiClient = createOpenAI({
        apiKey,
        baseURL: baseUrl || 'https://api.x.ai/v1',
      });
      return xaiClient.chat(modelId);
    }
    case 'perplexity': {
      const perplexityClient = createOpenAI({
        apiKey,
        baseURL: baseUrl || 'https://api.perplexity.ai',
      });
      return perplexityClient.chat(modelId);
    }
    case 'moonshot': {
      const moonshotClient = createOpenAI({
        apiKey,
        baseURL: baseUrl || 'https://api.moonshot.cn/v1',
      });
      return moonshotClient.chat(modelId);
    }
    case 'zhipu': {
      const zhipuClient = createOpenAI({
        apiKey,
        baseURL: baseUrl || 'https://open.bigmodel.cn/api/paas/v4',
      });
      return zhipuClient.chat(modelId);
    }
    case 'minimax': {
      const minimaxClient = createOpenAI({
        apiKey,
        baseURL: baseUrl || 'https://api.minimax.chat/v1',
      });
      return minimaxClient.chat(modelId);
    }
    case 'bytedance': {
      const bytedanceClient = createOpenAI({
        apiKey,
        baseURL: baseUrl || 'https://ark.cn-beijing.volces.com/api/v3',
      });
      return bytedanceClient.chat(modelId);
    }
    default: {
      const customClient = createOpenAI({
        apiKey,
        baseURL: baseUrl || 'https://api.openai.com/v1',
      });
      return customClient.chat(modelId);
    }
  }
}

async function streamViaProxy(
  provider: string,
  modelId: string,
  messages: AISDKMessage[],
  systemInstruction: string | undefined,
  config: GenerationConfig,
  apiKey: string,
  onUpdate: (content: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const endpoint = PROVIDER_ENDPOINTS[provider] || '/chat/completions';
  
  let body: any;
  
  if (provider === 'anthropic') {
    body = {
      model: modelId,
      messages: messages,
      system: systemInstruction,
      max_tokens: config.maxOutputTokens,
      temperature: config.temperature,
      stream: true,
    };
  } else if (provider === 'google') {
    const contents = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));
    body = {
      contents,
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
      generationConfig: {
        temperature: config.temperature,
        topP: config.topP,
        maxOutputTokens: config.maxOutputTokens,
      },
    };
  } else {
    body = {
      model: modelId,
      messages: systemInstruction 
        ? [{ role: 'system', content: systemInstruction }, ...messages]
        : messages,
      temperature: config.temperature,
      top_p: config.topP,
      max_tokens: config.maxOutputTokens,
      stream: true,
    };
  }

  const response = await fetch('/api/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider,
      endpoint,
      apiKey,
      body,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP Error ${response.status}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let done = false;
  let accumulatedText = '';

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]') continue;
        try {
          const data = JSON.parse(dataStr);
          
          if (provider === 'anthropic') {
            if (data.type === 'content_block_delta') {
              accumulatedText += data.delta?.text || '';
            }
          } else if (provider === 'google') {
            if (data.candidates?.[0]?.content?.parts) {
              for (const part of data.candidates[0].content.parts) {
                if (part.text) {
                  accumulatedText += part.text;
                }
              }
            }
          } else {
            const delta = data.choices?.[0]?.delta;
            if (delta?.reasoning_content) {
              accumulatedText += `hed{delta.reasoning_content}ink`;
            } else if (delta?.content) {
              accumulatedText += delta.content;
            }
          }
          
          onUpdate(accumulatedText);
        } catch (e) {}
      }
    }
  }
}

export class AISDKService {
  private apiKey: string = '';
  private providerId: ModelProvider = 'vercel';
  private baseUrl: string = '';

  constructor(apiKey?: string, providerId: ModelProvider = 'vercel', baseUrl?: string) {
    if (apiKey) {
      this.apiKey = apiKey;
    }
    this.providerId = providerId;
    this.baseUrl = baseUrl || '';
  }

  updateConfig(apiKey: string, providerId: ModelProvider = 'vercel', baseUrl?: string) {
    this.apiKey = apiKey;
    this.providerId = providerId;
    this.baseUrl = baseUrl || '';
  }

  async sendMessageStream(
    modelId: string,
    currentInput: string,
    attachments: Attachment[],
    history: Message[],
    systemInstruction: string | undefined,
    config: GenerationConfig,
    enabledTools: string[],
    userTools: UserTool[],
    onUpdate: (content: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const messages: AISDKMessage[] = [
      ...convertMessages(history),
      { role: 'user', content: currentInput }
    ];

    if (!isDev()) {
      try {
        await streamViaProxy(
          this.providerId,
          modelId,
          messages,
          systemInstruction,
          config,
          this.apiKey,
          onUpdate,
          signal
        );
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }
        throw new Error(this.translateError(error));
      }
    }

    const tools: Record<string, any> = {};

    enabledTools.forEach(toolName => {
      if (builtInTools[toolName]) {
        const t = builtInTools[toolName];
        tools[toolName] = tool({
          description: t.description,
          inputSchema: t.inputSchema,
          execute: t.execute,
        });
      }
    });

    userTools.filter(t => t.isEnabled).forEach(userTool => {
      const t = createUserTool(userTool);
      tools[userTool.id] = tool({
        description: t.description,
        inputSchema: t.inputSchema,
        execute: t.execute,
      });
    });

    const model = createModelClient(
      {
        apiKey: this.apiKey,
        providerId: this.providerId,
        baseUrl: this.baseUrl,
      },
      modelId
    );

    try {
      const result = streamText({
        model,
        messages,
        system: systemInstruction,
        temperature: config.temperature,
        topP: config.topP,
        tools: Object.keys(tools).length > 0 ? tools : undefined,
        stopWhen: stepCountIs(5),
        onStepFinish: ({ toolResults }) => {
          if (toolResults && toolResults.length > 0) {
            console.log('Tool results:', toolResults);
          }
        },
      });

      let fullResponse = '';
      for await (const delta of result.textStream) {
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        fullResponse += delta;
        onUpdate(fullResponse);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      throw new Error(this.translateError(error));
    }
  }

  private translateError(error: unknown): string {
    const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
    
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('invalid_api_key')) {
      return 'API Key 无效或已过期 (401)';
    }
    if (msg.includes('402') || msg.includes('payment required')) {
      return '账户余额不足 (402)';
    }
    if (msg.includes('403') || msg.includes('permission denied')) {
      return '权限不足或区域受限 (403)';
    }
    if (msg.includes('404') || msg.includes('not found')) {
      return '模型未找到 (404)';
    }
    if (msg.includes('429') || msg.includes('rate limit')) {
      return '请求过于频繁 (429)';
    }
    if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
      return '服务器繁忙 (5xx)';
    }
    if (msg.includes('failed to fetch') || msg.includes('network error')) {
      return '网络连接失败，请检查网络或代理设置';
    }
    
    return `请求出错: ${error instanceof Error ? error.message : String(error)}`;
  }

  async validateKey(apiKey: string, providerId: ModelProvider, baseUrl?: string): Promise<{ valid: boolean; message: string }> {
    if (!apiKey || apiKey.trim().length < 10) {
      return { valid: false, message: 'API Key 格式不正确' };
    }

    try {
      let testModelId: string;
      
      if (providerId === 'vercel') {
        testModelId = 'openai/gpt-4o-mini';
      } else if (providerId === 'alibaba') {
        testModelId = 'qwen-turbo';
      } else if (providerId === 'xai') {
        testModelId = 'grok-2-1212';
      } else {
        const provider = getProviderById(providerId);
        if (provider && provider.models.length > 0) {
          testModelId = provider.models[0].id;
        } else {
          testModelId = 'gpt-4o-mini';
        }
      }
      
      console.log(`[validateKey] Testing ${providerId} with model: ${testModelId}`);
      
      if (!isDev()) {
        const messages: AISDKMessage[] = [{ role: 'user', content: 'Hi' }];
        await streamViaProxy(
          providerId,
          testModelId,
          messages,
          undefined,
          { temperature: 0.7, topP: 0.95, maxOutputTokens: 100, historyLimit: 10 },
          apiKey,
          () => {},
          undefined
        );
        return { valid: true, message: '验证成功' };
      }

      const model = createModelClient(
        {
          apiKey,
          providerId,
          baseUrl,
        },
        testModelId
      );

      const result = await streamText({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
      });

      await result.text;
      
      return { valid: true, message: '验证成功' };
    } catch (error) {
      console.error('[validateKey] Error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[validateKey] Error message:', errorMessage);
      return { valid: false, message: this.translateError(error) };
    }
  }
}

export const aiSdkService = new AISDKService();
export { builtInTools };
