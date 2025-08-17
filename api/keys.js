import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { password } = request.body;

  // 验证管理密码
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || password !== adminPassword) {
    return response.status(401).json({ error: 'Unauthorized: Invalid password' });
  }

  // 密码验证成功，从 Upstash KV 中获取 API 密钥列表
  try {
    const keys = await kv.get('api_keys');
    // 如果列表不存在，返回一个空数组
    return response.status(200).json(keys || []);
  } catch (error) {
    console.error('KV Read Error:', error);
    return response.status(500).json({ error: 'Failed to retrieve keys.' });
  }
}
