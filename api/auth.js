import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { password } = request.body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return response.status(500).json({ error: 'Server error: ADMIN_PASSWORD not configured.' });
  }

  if (password === adminPassword) {
    return response.status(200).json({ authenticated: true });
  } else {
    return response.status(401).json({ authenticated: false, error: 'Invalid password.' });
  }
}
