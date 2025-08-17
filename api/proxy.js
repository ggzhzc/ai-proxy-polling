import { kv } from '@vercel/kv';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

// 统一的请求处理函数，处理不同平台的API调用
async function handleRequest(provider, requestBody) {
  switch (provider.platform) {
    case 'openai':
    case 'azure-openai':
      const openai = new OpenAI({ 
        apiKey: provider.key,
        baseURL: provider.platform === 'azure-openai' ? 'YOUR_AZURE_ENDPOINT' : undefined
      });
      const openaiCompletion = await openai.chat.completions.create({
        model: requestBody.model || 'gpt-3.5-turbo',
        messages: requestBody.messages,
        stream: false,
      });
      return openaiCompletion;

    case 'anthropic':
      const anthropic = new Anthropic({ apiKey: provider.key });
      const anthropicCompletion = await anthropic.messages.create({
        model: requestBody.model || 'claude-3-haiku-20240307',
        max_tokens: requestBody.max_tokens || 1024,
        messages: requestBody.messages,
      });
      return anthropicCompletion;
    
    case 'google':
      const genAI = new GoogleGenerativeAI(provider.key);
      const model = genAI.getGenerativeModel({ model: requestBody.model || 'gemini-pro' });
      const chat = model.startChat();
      const googleCompletion = await chat.sendMessage(requestBody.messages[requestBody.messages.length - 1].content);
      return googleCompletion.response;

    case 'qwen':
      // 阿里云千问 API 的调用逻辑
      // 官方文档: https://help.aliyun.com/document_detail/2712536.html
      const qwenResponse = await axios.post(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        {
          model: requestBody.model || 'qwen-turbo',
          input: {
            messages: requestBody.messages,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.key}`
          },
        }
      );
      return qwenResponse.data;

    case 'baichuan':
    case 'wenxinyiyan':
    case 'iflytek':
    case 'kimi':
    case 'llama':
    case 'siliconflow':
    case 'zhipuai':
      throw new Error(`API logic for ${provider.platform} is not implemented.`);

    default:
      throw new Error(`Unsupported platform: ${provider.platform}`);
  }
}

export default async function handler(request, response) {
  try {
    const providers = await kv.get('api_keys');

    if (!providers || providers.length === 0) {
      return response.status(503).json({ error: 'No API keys configured.' });
    }

    let lastError = null;

    for (const provider of providers) {
      try {
        const result = await handleRequest(provider, request.body);
        console.log(`Successfully used API from: ${provider.platform}`);
        return response.status(200).json(result);
      } catch (error) {
        console.error(`Error with ${provider.platform} API:`, error.message);
        lastError = error;
      }
    }

    return response.status(500).json({ error: 'All API providers failed.', details: lastError?.message });

  } catch (error) {
    console.error('Proxy Error:', error.message);
    return response.status(500).json({ error: 'Internal server error.', details: error.message });
  }
}
