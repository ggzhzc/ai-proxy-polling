import { kv } from '@vercel/kv';
import OpenAI from 'openai';

// 用于存储当前使用的密钥索引
let currentKeyIndex = 0;

export default async function handler(request, response) {
  try {
    // 从 Vercel KV 中获取 API 密钥列表
    const keys = await kv.get('api_keys');

    if (!keys || keys.length === 0) {
      return response.status(503).json({ error: 'No API keys configured.' });
    }

    let success = false;
    let lastError = null;

    // 轮询尝试所有密钥
    for (let i = 0; i < keys.length; i++) {
      const keyIndexToUse = (currentKeyIndex + i) % keys.length;
      const apiKey = keys[keyIndexToUse];
      const openai = new OpenAI({ apiKey: apiKey });

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: request.body.messages,
          stream: false,
        });

        // 如果调用成功，更新索引并返回结果
        currentKeyIndex = (keyIndexToUse + 1) % keys.length;
        success = true;
        return response.status(200).json(completion);

      } catch (error) {
        console.error(`Error with key at index ${keyIndexToUse}:`, error.message);
        lastError = error;
      }
    }

    // 所有密钥都失败了
    if (!success) {
      return response.status(500).json({ error: 'All API keys failed.', details: lastError?.message });
    }

  } catch (error) {
    console.error('Proxy Error:', error.message);
    return response.status(500).json({ error: 'Internal server error.', details: error.message });
  }
}
