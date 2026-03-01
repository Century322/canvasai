import type { VercelRequest, VercelResponse } from '@vercel/node';

const PROVIDER_CONFIGS: Record<string, { baseUrl: string; authHeader: string }> = {
  vercel: { baseUrl: 'https://gateway.ai.vercel.com/v1', authHeader: 'Authorization' },
  openai: { baseUrl: 'https://api.openai.com/v1', authHeader: 'Authorization' },
  anthropic: { baseUrl: 'https://api.anthropic.com/v1', authHeader: 'x-api-key' },
  google: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta', authHeader: 'Authorization' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', authHeader: 'Authorization' },
  alibaba: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', authHeader: 'Authorization' },
  xai: { baseUrl: 'https://api.x.ai/v1', authHeader: 'Authorization' },
  mistral: { baseUrl: 'https://api.mistral.ai/v1', authHeader: 'Authorization' },
  perplexity: { baseUrl: 'https://api.perplexity.ai', authHeader: 'Authorization' },
  cohere: { baseUrl: 'https://api.cohere.ai/compatibility/v1', authHeader: 'Authorization' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', authHeader: 'Authorization' },
  moonshot: { baseUrl: 'https://api.moonshot.cn/v1', authHeader: 'Authorization' },
  zhipu: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', authHeader: 'Authorization' },
  meta: { baseUrl: 'https://api.llama.com/compat/v1', authHeader: 'Authorization' },
  minimax: { baseUrl: 'https://api.minimax.chat/v1', authHeader: 'Authorization' },
  nvidia: { baseUrl: 'https://integrate.api.nvidia.com/v1', authHeader: 'Authorization' },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { provider, endpoint, apiKey, body } = req.body;

  if (!provider || !endpoint || !apiKey) {
    return res.status(400).json({ error: 'Missing required fields: provider, endpoint, apiKey' });
  }

  const config = PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.openai;
  const baseUrl = config.baseUrl;

  let url: string;
  if (provider === 'anthropic') {
    url = `${baseUrl}${endpoint}`;
  } else if (endpoint.startsWith('/')) {
    url = `${baseUrl}${endpoint}`;
  } else {
    url = `${baseUrl}/${endpoint}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (provider === 'anthropic') {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else if (provider === 'google') {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}key=${apiKey}`;
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') || '';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

    if (contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson')) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      if (!response.body) {
        return res.status(500).json({ error: 'No response body' });
      }

      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      return res.end();
    }

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
