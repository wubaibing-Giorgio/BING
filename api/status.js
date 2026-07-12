const ALLOWED_METHODS = 'GET,HEAD,OPTIONS';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const configured = Boolean(process.env.ELEVENLABS_API_KEY?.trim());

  if (req.method === 'HEAD') {
    res.setHeader('X-PapaVoice-Configured', configured ? 'true' : 'false');
    return res.status(200).end();
  }

  return res.status(200).json({
    ok: true,
    configured,
    mode: configured ? 'ai' : 'demo',
    languages: ['zh', 'en', 'it', 'fr']
  });
}
