import { kv } from '@vercel/kv';
import crypto from 'crypto';

function generateOpenAIKey() {
    const randomHex = crypto.randomBytes(24).toString('hex');
    return `sk-${randomHex}`;
}

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
          unifiedKey = generateOpenAIKey();
          await kv.set('unified_api_key', unifiedKey);
      }
      return response.status(200).json({ unifiedKey });
    } else if (action === 'reset_unified_key') {
      const newKey = generateOpenAIKey();
      await kv.set('unified_api_key', newKey);
      return response.status(200).json({ unifiedKey: newKey });
    }
    
    const platformKeys = await kv.get('api_keys');
    return response.status(200).json(platformKeys || []);
  } catch (error) {
    return response.status(500).json({ error: 'Internal server error.', details: error.message });
  }
}
