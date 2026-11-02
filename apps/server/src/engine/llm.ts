import { config } from '../config.js';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function llmComplete(messages: ChatMessage[], maxTokens = 260): Promise<string | null> {
  if (config.aiMode !== 'openai' || !config.openai.apiKey) return null;
  try {
    const res = await fetch(`${config.openai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.openai.apiKey}`,
      },
      body: JSON.stringify({
        model: config.openai.model,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(config.openai.timeout),
    });
    if (!res.ok) {
      console.warn('[llm] non-200:', res.status, await res.text().catch(() => ''));
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (err) {
    console.warn('[llm] request failed, fallback to mock:', err);
    return null;
  }
}
