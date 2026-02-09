
import { GoogleGenAI, Content, Part } from "@google/genai";
import { Message, MessageRole, Attachment, ContentType, ModelCapability, ModelProvider, GenerationConfig } from "../types";

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, _) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};

export class GeminiService {
  private client: GoogleGenAI | null = null;
  private apiKey: string = "";
  private provider: ModelProvider = 'google';
  private baseUrl: string = "";

  constructor(apiKey: string, provider: ModelProvider = 'google', baseUrl?: string) {
    this.updateApiKey(apiKey, provider, baseUrl);
  }

  updateApiKey(apiKey: string, provider: ModelProvider = 'google', baseUrl?: string) {
    this.apiKey = (apiKey || "").replace(/[^\x00-\x7F]/g, "").trim();
    this.provider = provider;
    
    let cleanUrl = (baseUrl || "").replace(/[^\x00-\x7F]/g, "").trim();
    if (cleanUrl) {
        if (!cleanUrl.startsWith('http')) {
            cleanUrl = `https://${cleanUrl}`;
        }
        cleanUrl = cleanUrl.replace(/\/+$/, ""); 

        if (this.provider === 'google') {
            cleanUrl = cleanUrl.replace(/\/v1beta$/, "").replace(/\/v1$/, "");
        }
    }
    this.baseUrl = cleanUrl;

    if (this.provider === 'google' && this.apiKey) {
      const options: any = { apiKey: this.apiKey };
      if (this.baseUrl) {
          options.baseUrl = this.baseUrl;
      }
      this.client = new GoogleGenAI(options);
    } else {
      this.client = null;
    }
  }

  static detectProvider(key: string): ModelProvider {
      return 'custom'; 
  }

  async getAvailableModels(): Promise<{ models: ModelCapability[], platform: string, balance?: string }> {
    if (!this.apiKey) return { models: [], platform: 'Unknown' };

    let result: { models: ModelCapability[], platform: string, balance?: string } = { models: [], platform: 'Unknown' };

    try {
        if (this.provider === 'google') {
            result = await this.fetchGoogleModels();
        } else {
            result = await this.fetchGenericModels();
            const balance = await this.fetchOneAPIBalance();
            if (balance) result.balance = balance;
        }
    } catch (e: any) {
        console.warn("Fetch models failed:", e);
        throw new Error(this.translateError(e));
    }

    return result;
  }

  private translateError(error: any): string {
      const msg = (error.message || error.toString()).toLowerCase();

      if (msg.includes('iso-8859-1') || msg.includes('headers')) {
          return "API Key 或 Base URL 包含非法字符（中文/全角/控制符）。请使用纯英文格式。";
      }
      if (msg.includes('failed to fetch') || msg.includes('network error') || msg.includes('connection refused') || msg.includes('load failed')) {
          return "网络请求失败，请检查网络或代理设置。";
      }
      if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('invalid_api_key')) {
          return "API Key 无效 (401)。";
      }
      if (msg.includes('403') || msg.includes('permission denied') || msg.includes('access denied')) {
          return "权限不足或区域受限 (403)。";
      }
      if (msg.includes('404') || msg.includes('not found')) {
          return "路径或模型未找到 (404)。请检查 Base URL。";
      }
      if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) {
          return "请求过快或额度已用尽 (429)。";
      }
      if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('internal server error')) {
          return "服务商服务器繁忙 (5xx)。";
      }
      if (msg.includes('400') || msg.includes('invalid argument')) {
          return "请求格式错误 (400)。";
      }
      
      return `请求出错: ${msg.slice(0, 100)}`; 
  }

  private async fetchGoogleModels() {
      const baseUrl = this.baseUrl || "https://generativelanguage.googleapis.com";
      const url = `${baseUrl}/v1beta/models?key=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error?.message || `Google API Error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.models) return { models: [], platform: 'Google' };

      const models: ModelCapability[] = data.models
          .filter((m: any) => m.name.includes('gemini') || m.name.includes('veo')) 
          .map((m: any) => {
              const id = m.name.replace('models/', '');
              const supportsImages = m.inputTokenLimit > 0 && (m.supportedGenerationMethods?.includes('generateContent'));
              const supportsVideoGen = id.includes('veo');
              const supportsAudio = id.includes('audio') || id.includes('native') || m.supportedGenerationMethods?.includes('generateContent');
              const isThinking = id.includes('thinking');

              return {
                  id: id,
                  name: m.displayName || id,
                  provider: 'google',
                  description: m.description ? m.description.slice(0, 60) + '...' : 'Google 官方模型',
                  supportsImages: supportsImages && !supportsVideoGen,
                  supportsVideoGen,
                  supportsAudio, // Gemini models generally support audio/video input
                  isThinking,
                  contextWindow: m.inputTokenLimit ? `${Math.round(m.inputTokenLimit / 1000)}k` : undefined
              } as ModelCapability;
          })
          .sort((a: ModelCapability, b: ModelCapability) => {
              if (a.id.includes('pro') && !b.id.includes('pro')) return -1;
              if (b.id.includes('pro') && !a.id.includes('pro')) return 1;
              return 0;
          });

      return { models, platform: 'Google Gemini' };
  }

  private async fetchGenericModels() {
      let baseUrl = this.baseUrl;
      if (!baseUrl) {
          if (this.provider === 'anthropic') baseUrl = 'https://api.anthropic.com/v1';
          else baseUrl = 'https://api.openai.com/v1';
      }
      
      const url = `${baseUrl}/models`;
      const headers: any = { 'Authorization': `Bearer ${this.apiKey}` };
      if (this.provider === 'anthropic') {
          headers['x-api-key'] = this.apiKey;
          headers['anthropic-version'] = '2023-06-01';
          delete headers['Authorization'];
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(`HTTP Error ${response.status}: ${text}`);
      }

      const data = await response.json();
      let rawModels: any[] = [];
      
      if (Array.isArray(data)) rawModels = data;
      else if (Array.isArray(data.data)) rawModels = data.data;
      else if (Array.isArray(data.models)) rawModels = data.models;
      
      if (rawModels.length === 0) return { models: [], platform: 'Unknown' };

      const models: ModelCapability[] = rawModels.map((m: any) => {
          const id = m.id;
          const lowerId = id.toLowerCase();
          const supportsImages = lowerId.includes('vision') || lowerId.includes('4o') || lowerId.includes('gemini') || lowerId.includes('claude-3') || lowerId.includes('llava');
          const supportsVideoGen = lowerId.includes('video') || lowerId.includes('sora') || lowerId.includes('veo') || lowerId.includes('luma');
          const supportsAudio = lowerId.includes('audio') || lowerId.includes('tts') || lowerId.includes('whisper');
          const isThinking = lowerId.includes('r1') || lowerId.includes('reasoning') || lowerId.includes('o1') || lowerId.includes('thinking');
          const isOnline = lowerId.includes('online') || lowerId.includes('search') || lowerId.includes('net');

          return {
              id: id,
              name: id, 
              provider: this.provider,
              description: `自动检测模型 ${supportsImages ? '[视觉]' : ''} ${isThinking ? '[推理]' : ''}`,
              supportsImages,
              supportsVideoGen,
              supportsAudio,
              isThinking,
              isOnline
          };
      }).sort((a, b) => a.id.localeCompare(b.id));

      let platform = 'Unknown';
      if (this.provider === 'openai') platform = 'OpenAI';
      else if (this.provider === 'anthropic') platform = 'Anthropic';
      else if (this.provider === 'deepseek') platform = 'DeepSeek';
      else if (this.provider === 'custom') platform = 'OneAPI';
      else platform = this.provider.toUpperCase();

      return { models, platform };
  }

  private async fetchOneAPIBalance(): Promise<string | undefined> {
      if (!this.baseUrl || this.provider === 'google' || this.provider === 'anthropic') return undefined;
      const endpoints = [`${this.baseUrl}/dashboard/billing/usage`, `${this.baseUrl}/api/user/status`];
      for (const ep of endpoints) {
          try {
              const res = await fetch(ep, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });
              if (res.ok) {
                  const data = await res.json();
                  if (data.balance !== undefined) return `¥${Number(data.balance).toFixed(2)}`;
                  if (data.quota !== undefined) return `Quota: ${data.quota}`; 
              }
          } catch(e) {}
      }
      return undefined;
  }

  private getPrunedHistory(history: Message[], maxContext: number = 20): Message[] {
      const validHistory = history.filter(m => !m.isError && m.role !== MessageRole.SYSTEM);
      return validHistory.slice(-maxContext);
  }

  async sendMessageStream(
    modelId: string, 
    currentInput: string, 
    attachments: Attachment[], 
    history: Message[],
    systemInstruction: string | undefined,
    config: GenerationConfig,
    onUpdate: (content: string, metadata?: any) => void,
    signal?: AbortSignal
  ): Promise<void> {

    if (modelId.includes('video') || modelId.includes('veo')) {
         try {
            const msg = await this.generateVideo(modelId, currentInput);
            onUpdate(msg.content); 
         } catch (e) { throw new Error(this.translateError(e)); }
         return;
    }
    if (modelId.includes('dall-e') || modelId.includes('gemini-3-pro-image-preview')) {
         try {
            const msg = await this.generateImage(modelId, currentInput);
            onUpdate(msg.content);
         } catch (e) { throw new Error(this.translateError(e)); }
         return;
    }

    try {
        if (this.provider === 'google') {
            await this.streamGoogleMessage(modelId, currentInput, attachments, history, systemInstruction, config, onUpdate, signal);
        } else {
            await this.streamOpenAICompatibleMessage(modelId, currentInput, attachments, history, systemInstruction, config, onUpdate, signal);
        }
    } catch (e) {
        throw new Error(this.translateError(e));
    }
  }

  private async streamGoogleMessage(
      modelId: string, 
      currentInput: string, 
      attachments: Attachment[], 
      history: Message[], 
      systemInstruction: string | undefined,
      config: GenerationConfig,
      onUpdate: (content: string, metadata?: any) => void,
      signal?: AbortSignal
  ) {
      if (!this.client) throw new Error("Google API 未初始化：请检查 API Key");

      const parts: Part[] = [];
      if (currentInput && currentInput.trim()) {
          parts.push({ text: currentInput });
      }
      
      // Google Native support for Audio/Video/PDF via Base64
      attachments.forEach(att => {
         const base64Data = att.data.split(',')[1];
         // For Google, mimetype is crucial
         const mimeType = att.mimeType;
         parts.push({ inlineData: { data: base64Data, mimeType } });
      });
      
      if (parts.length === 0) {
          if (currentInput) parts.push({ text: " " }); 
          else throw new Error("Cannot send empty message");
      }

      const prunedHistory = this.getPrunedHistory(history, config.historyLimit);
      const previousContents = this.convertHistoryToGemini(prunedHistory);

      // Add Search Tool if enabled
      const tools: any[] = [];
      if (config.enableSearch) {
          tools.push({ googleSearch: {} });
      }

      const result = await this.client.models.generateContentStream({
            model: modelId,
            contents: [...previousContents, { role: 'user', parts }],
            config: {
                systemInstruction: systemInstruction,
                temperature: config.temperature,
                topP: config.topP,
                maxOutputTokens: config.maxOutputTokens,
                tools: tools.length > 0 ? tools : undefined
            }
      });

      let accumulatedText = "";
      let accumulatedMetadata: any = null; // Store metadata as it arrives

      for await (const chunk of result) {
            if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
            const text = chunk.text;
            if (text) {
                accumulatedText += text;
            }
            
            // Capture Grounding Metadata if present in this chunk and merge/update
            // Usually grounding comes at the end or in chunks
            if (chunk.candidates?.[0]?.groundingMetadata) {
                accumulatedMetadata = chunk.candidates[0].groundingMetadata;
            }
            
            onUpdate(accumulatedText, accumulatedMetadata);
      }
  }

  private async streamOpenAICompatibleMessage(
      modelId: string, 
      currentInput: string, 
      attachments: Attachment[], 
      history: Message[], 
      systemInstruction: string | undefined,
      config: GenerationConfig,
      onUpdate: (content: string, metadata?: any) => void,
      signal?: AbortSignal
  ) {
      let baseUrl = this.baseUrl;
      if (!baseUrl) {
          if (this.provider === 'anthropic') baseUrl = 'https://api.anthropic.com/v1';
          else baseUrl = 'https://api.openai.com/v1';
      }

      const endpoint = this.provider === 'anthropic' ? `${baseUrl}/messages` : `${baseUrl}/chat/completions`;
      const apiMessages: any[] = [];
      
      if (systemInstruction && this.provider !== 'anthropic' && !modelId.includes('o1')) {
           apiMessages.push({ role: 'system', content: systemInstruction });
      }

      const prunedHistory = this.getPrunedHistory(history, config.historyLimit);
      const supportsVision = modelId.includes('vision') || modelId.includes('4o') || modelId.includes('claude') || modelId.includes('gemini') || modelId.includes('llava');

      // Helper to process message content for OpenAI/OneAPI
      const processContent = (text: string, atts?: Attachment[]) => {
          // If no attachments, just text
          if (!atts || atts.length === 0) return text;
          
          const contentParts: any[] = [{ type: 'text', text: text || " " }];
          
          atts.forEach(att => {
              // OpenAI standard only supports Images (base64 url)
              if (supportsVision && att.type === ContentType.IMAGE) {
                  contentParts.push({ 
                      type: 'image_url', 
                      image_url: { url: att.data } 
                  });
              } else {
                  // Fallback for non-supported types (Video/Audio/PDF) on OpenAI API
                  console.warn(`Attachment type ${att.type} skipped for OpenAI provider.`);
              }
          });
          
          if (contentParts.length === 1 && contentParts[0].type === 'text') return contentParts[0].text;
          return contentParts;
      };

      prunedHistory.forEach(m => {
          if (!m.content && (!m.attachments || m.attachments.length === 0)) return;
          const role = m.role === MessageRole.USER ? 'user' : 'assistant';
          apiMessages.push({ role, content: processContent(m.content, m.attachments) });
      });

      apiMessages.push({ role: 'user', content: processContent(currentInput, attachments) });

      const body: any = {
          model: modelId,
          messages: apiMessages,
          stream: true,
          temperature: config.temperature,
          top_p: config.topP,
      };

      if (!modelId.includes('o1')) body.max_tokens = config.maxOutputTokens;
      else body.temperature = 1;

      if (this.provider === 'anthropic') {
          body.max_tokens = config.maxOutputTokens;
          if (systemInstruction) body.system = systemInstruction;
          body.messages = apiMessages.filter(m => m.role !== 'system');
      }

      const headers: any = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` };
      if (this.provider === 'anthropic') {
          headers['x-api-key'] = this.apiKey;
          headers['anthropic-version'] = '2023-06-01';
          delete headers['Authorization'];
      }

      const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body), signal });

      if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP Error ${res.status}: ${errText}`);
      }
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let accumulatedText = "";

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
                      let contentChunk = "";
                      if (this.provider === 'anthropic') {
                          if (data.type === 'content_block_delta') contentChunk = data.delta?.text || "";
                      } else {
                          const delta = data.choices?.[0]?.delta;
                          // Handle Reasoning Content (DeepSeek R1/O1)
                          if (delta?.reasoning_content) {
                              contentChunk = `<think>${delta.reasoning_content}</think>`;
                          } else if (delta?.content) {
                              contentChunk = delta.content;
                          }
                      }
                      if (contentChunk) {
                          accumulatedText += contentChunk;
                          onUpdate(accumulatedText);
                      }
                  } catch (e) {}
              } 
          }
      }
  }

  private convertHistoryToGemini(messages: Message[]): Content[] {
    const geminiContents: Content[] = [];
    let lastRole = '';

    const validMessages = messages.filter(m => !m.isError && m.role !== MessageRole.SYSTEM);
    
    for (const m of validMessages) {
        const role = m.role === MessageRole.USER ? 'user' : 'model';
        const parts: Part[] = [];
        
        if (m.content && m.content.trim()) {
            parts.push({ text: m.content });
        }
        
        m.attachments?.forEach(att => {
             const base64Data = att.data.split(',')[1];
             const mimeType = att.mimeType || att.data.split(';')[0].split(':')[1];
             parts.push({ inlineData: { data: base64Data, mimeType } });
        });

        if (parts.length === 0) {
            if (m.content) parts.push({ text: " " });
            else continue; 
        }

        if (role === 'user' && lastRole === 'user') {
            geminiContents.push({ role: 'model', parts: [{ text: '...' }] });
        }
        
        geminiContents.push({ role, parts });
        lastRole = role;
    }
    
    if (geminiContents.length > 0 && geminiContents[geminiContents.length - 1].role === 'user') {
        geminiContents.push({ role: 'model', parts: [{ text: '...' }] });
    }

    return geminiContents;
  }

  public async generateImage(modelId: string, prompt: string): Promise<Message> {
      if (this.provider === 'google' && this.client) {
          const response = await this.client.models.generateContent({
            model: modelId,
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } }
          });
          let textContent = "";
          const attachments: Attachment[] = [];
          if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    attachments.push({
                        type: ContentType.IMAGE,
                        mimeType: part.inlineData.mimeType || 'image/png',
                        data: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`
                    });
                } else if (part.text) textContent += part.text;
            }
          }
          return { id: crypto.randomUUID(), role: MessageRole.MODEL, content: textContent || "Image Generated", attachments, timestamp: Date.now() };
      }
      return { id: crypto.randomUUID(), role: MessageRole.MODEL, content: `Model ${modelId} not supported directly`, timestamp: Date.now() };
  }

  public async generateVideo(modelId: string, prompt: string): Promise<Message> {
       if (this.provider === 'google' && this.client) {
          let operation = await this.client.models.generateVideos({
              model: modelId,
              prompt: prompt,
              config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
          });
          while (!operation.done) {
              await new Promise(resolve => setTimeout(resolve, 5000));
              operation = await this.client.operations.getVideosOperation({ operation: operation });
          }
          const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
          if (!videoUri) throw new Error("Video generation failed");
          
          const videoRes = await fetch(`${videoUri}&key=${this.apiKey}`);
          if (!videoRes.ok) throw new Error("Failed to download generated video");
          
          const blob = await videoRes.blob();
          const base64Data = await blobToBase64(blob);

          return {
              id: crypto.randomUUID(),
              role: MessageRole.MODEL,
              content: `Generated Video: ${prompt}`,
              attachments: [{ type: ContentType.VIDEO, mimeType: 'video/mp4', data: base64Data }],
              timestamp: Date.now()
          };
       }
       return { id: crypto.randomUUID(), role: MessageRole.MODEL, content: "Video generation not supported", timestamp: Date.now() };
  }
}
