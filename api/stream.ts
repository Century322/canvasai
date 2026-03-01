import type { VercelRequest, VercelResponse } from '@vercel/node';

const PROVIDER_CONFIGS: Record<string, { baseUrl: string }> = {
  vercel: { baseUrl: 'https://gateway.ai.vercel.com/v1' },
  openai: { baseUrl: 'https://api.openai.com/v1' },
  anthropic: { baseUrl: 'https://api.anthropic.com/v1' },
  google: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1' },
  alibaba: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  xai: { baseUrl: 'https://api.x.ai/v1' },
  mistral: { baseUrl: 'https://api.mistral.ai/v1' },
  perplexity: { baseUrl: 'https://api.perplexity.ai' },
  cohere: { baseUrl: 'https://api.cohere.ai/compatibility/v1' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1' },
  moonshot: { baseUrl: 'https://api.moonshot.cn/v1' },
  zhipu: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  meta: { baseUrl: 'https://api.llama.com/compat/v1' },
  minimax: { baseUrl: 'https://api.minimax.chat/v1' },
  nvidia: { baseUrl: 'https://integrate.api.nvidia.com/v1' },
};

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { provider, endpoint, apiKey, body } = await req.json();

    if (!provider || !endpoint || !apiKey) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const config = PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.openai;
    let url = `${config.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

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

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') || 'application/json';

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(errorText, {
        status: response.status,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    if (contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson')) {
      return new Response(response.body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
