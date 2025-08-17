import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { password, keys } = request.body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || password !== adminPassword) {
    return response.status(401).json({ error: 'Unauthorized: Invalid password' });
  }

  try {
    if (!Array.isArray(keys)) {
      return response.status(400).json({ error: 'Bad Request: Keys must be an array.' });
    }
    
    await kv.set('api_keys', keys);
    return response.status(200).json({ message: 'API keys updated successfully.' });
  } catch (error) {
    return response.status(500).json({ error: 'Failed to update keys.', details: error.message });
  }
}
