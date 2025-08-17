import { kv } from '@vercel/kv';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

// 统一的请求处理函数，处理不同平台的API调用
async function handleRequest(provider, requestBody) {
  switch (provider.platform) {
    case 'openai':
      const openai = new OpenAI({ 
        apiKey: provider.key
      });
      const openaiCompletion = await openai.chat.completions.create({
        model: requestBody.model || 'gpt-3.5-turbo',
        messages: requestBody.messages,
        stream: false,
      });
      return openaiCompletion;

    case 'azure-openai':
      const azureOpenai = new OpenAI({ 
        apiKey: provider.key,
        baseURL: provider.baseURL
      });
      const azureOpenaiCompletion = await azureOpenai.chat.completions.create({
        model: requestBody.model || 'gpt-4',
        messages: requestBody.messages,
        stream: false,
      });
      return azureOpenaiCompletion;

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
      
    case 'deepseek':
      const deepseekClient = new OpenAI({
        apiKey: provider.key,
        baseURL: 'https://api.deepseek.com/v1',
      });
      const deepseekCompletion = await deepseekClient.chat.completions.create({
        model: requestBody.model || 'deepseek-chat',
        messages: requestBody.messages,
        stream: false,
      });
      return deepseekCompletion;
      
    case 'kimi':
      const kimiClient = new OpenAI({
        apiKey: provider.key,
        baseURL: 'https://api.moonshot.cn/v1',
      });
      const kimiCompletion = await kimiClient.chat.completions.create({
        model: requestBody.model || 'moonshot-v1-8k',
        messages: requestBody.messages,
        stream: false,
      });
      return kimiCompletion;
      
    case 'llama':
      const llamaClient = new OpenAI({
        apiKey: provider.key,
        baseURL: 'https://api.together.xyz/v1',
      });
      const llamaCompletion = await llamaClient.chat.completions.create({
        model: requestBody.model,
        messages: requestBody.messages,
        stream: false,
      });
      return llamaCompletion;

    case 'openai-compatible':
      const compatibleClient = new OpenAI({
        apiKey: provider.key,
        baseURL: provider.baseURL,
      });
      const compatibleCompletion = await compatibleClient.chat.completions.create({
        model: requestBody.model,
        messages: requestBody.messages,
        stream: false,
      });
      return compatibleCompletion;

    default:
      throw new Error(`Unsupported platform: ${provider.platform}`);
  }
}

export default async function handler(request, response) {
  // 1. 验证统一API Key
  const unifiedKey = request.headers['authorization']?.split(' ')[1];
  const storedUnifiedKey = await kv.get('unified_api_key');

  if (!unifiedKey || unifiedKey !== storedUnifiedKey) {
      return response.status(401).json({ error: 'Unauthorized: Invalid or missing API key.' });
  }

  // 2. 轮询调用逻辑
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
