
import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  // 检查请求方法
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { password, keys } = request.body;

  // 1. 验证管理密码
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || password !== adminPassword) {
    return response.status(401).json({ error: 'Unauthorized: Invalid password' });
  }

  // 2. 验证新密钥的格式
  if (!Array.isArray(keys) || !keys.every(key => typeof key === 'string')) {
    return response.status(400).json({ error: 'Bad Request: Keys must be an array of strings' });
  }

  // 3. 将新的密钥列表写入 Vercel KV，覆盖旧列表
  try {
    await kv.set('api_keys', keys);
    return response.status(200).json({ message: 'API keys updated successfully.' });
  } catch (error) {
    console.error('KV Write Error:', error);
    return response.status(500).json({ error: 'Failed to update keys.' });
  }
}
