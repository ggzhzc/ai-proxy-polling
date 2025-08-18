import { kv } from '@vercel/kv';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function handleRequest(provider, requestBody) {
  const modelToUse = provider.model;
  
  if (!modelToUse) {
    throw new Error(`Platform "${provider.platform}" has no model configured. Please update in the admin panel.`);
  }

  switch (provider.platform) {
    case 'openai':
      const openai = new OpenAI({ 
        apiKey: provider.key
      });
      const openaiCompletion = await openai.chat.completions.create({
        model: modelToUse,
        messages: requestBody.messages,
        stream: requestBody.stream || false,
      });
      return openaiCompletion;

    case 'azure-openai':
      const azureOpenai = new OpenAI({ 
        apiKey: provider.key,
        baseURL: provider.baseURL
      });
      const azureOpenaiCompletion = await azureOpenai.chat.completions.create({
        model: modelToUse,
        messages: requestBody.messages,
        stream: requestBody.stream || false,
      });
      return azureOpenaiCompletion;

    case 'anthropic':
      const anthropic = new Anthropic({ apiKey: provider.key });
      const anthropicCompletion = await anthropic.messages.create({
        model: modelToUse,
        max_tokens: requestBody.max_tokens || 1024,
        messages: requestBody.messages,
        stream: requestBody.stream || false,
      });
      return anthropicCompletion;
    
    case 'google':
      const genAI = new GoogleGenerativeAI(provider.key);
      const model = genAI.getGenerativeModel({ model: modelToUse });
      const chat = model.startChat({ history: [] });
      const lastMessageContent = requestBody.messages[requestBody.messages.length - 1].content;
      const googleCompletion = await chat.sendMessage(lastMessageContent);
      return {
          id: 'google-response',
          model: modelToUse,
          choices: [{
              message: {
                  role: 'assistant',
                  content: googleCompletion.response.text(),
              }
          }],
      };

    case 'deepseek':
      const deepseekClient = new OpenAI({
        apiKey: provider.key,
        baseURL: 'https://api.deepseek.com/v1',
      });
      const deepseekCompletion = await deepseekClient.chat.completions.create({
        model: modelToUse,
        messages: requestBody.messages,
        stream: requestBody.stream || false,
      });
      return deepseekCompletion;
      
    case 'kimi':
      const kimiClient = new OpenAI({
        apiKey: provider.key,
        baseURL: 'https://api.moonshot.cn/v1',
      });
      const kimiCompletion = await kimiClient.chat.completions.create({
        model: modelToUse,
        messages: requestBody.messages,
        stream: requestBody.stream || false,
      });
      return kimiCompletion;
      
    case 'llama':
      const llamaClient = new OpenAI({
        apiKey: provider.key,
        baseURL: 'https://api.together.xyz/v1',
      });
      const llamaCompletion = await llamaClient.chat.completions.create({
        model: modelToUse,
        messages: requestBody.messages,
        stream: requestBody.stream || false,
      });
      return llamaCompletion;

    case 'openai-compatible':
      const compatibleClient = new OpenAI({
        apiKey: provider.key,
        baseURL: provider.baseURL,
      });
      const compatibleCompletion = await compatibleClient.chat.completions.create({
        model: modelToUse,
        messages: requestBody.messages,
        stream: requestBody.stream || false,
      });
      return compatibleCompletion;

    default:
      throw new Error(`Unsupported platform: ${provider.platform}`);
  }
}

export default async function handler(request, response) {
  const unifiedKey = request.headers['authorization']?.split(' ')[1];
  const storedUnifiedKey = await kv.get('unified_api_key');

  if (!unifiedKey || unifiedKey !== storedUnifiedKey) {
      return response.status(401).json({ error: 'Unauthorized: Invalid or missing API key.' });
  }

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
