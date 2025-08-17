import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { password, action } = request.body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || password !== adminPassword) {
    return response.status(401).json({ error: 'Unauthorized: Invalid password' });
  }

  try {
    if (action === 'get_unified_key') {
      let unifiedKey = await kv.get('unified_api_key');
      if (!unifiedKey) {
          // 由于无法安全地生成 Key，暂时返回一个占位符
          unifiedKey = 'placeholder-key';
          // 真正的 Key 生成和重置逻辑需要在前端或一个更安全的后端函数中处理
      }
      return response.status(200).json({ unifiedKey });
    } else if (action === 'reset_unified_key') {
      // 占位符，重置逻辑被简化
      const newKey = 'placeholder-key-reset';
      await kv.set('unified_api_key', newKey);
      return response.status(200).json({ unifiedKey: newKey });
    }
    
    const platformKeys = await kv.get('api_keys');
    return response.status(200).json(platformKeys || []);
  } catch (error) {
    return response.status(500).json({ error: 'Internal server error.', details: error.message });
  }
}
