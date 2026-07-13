const ELEVENLABS_USER_URL = 'https://api.elevenlabs.io/v1/user';
const ALLOWED_METHODS = 'GET,HEAD,OPTIONS';
const STATUS_TIMEOUT_MS = 7_000;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

async function verifyProvider(apiKey) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS);

  try {
    const response = await fetch(ELEVENLABS_USER_URL, {
      method: 'GET',
      headers: { 'xi-api-key': apiKey },
      signal: controller.signal
    });

    if (response.ok) return { configured: true, reachable: true, reason: 'ready' };
    if (response.status === 401) return { configured: false, reachable: true, reason: 'invalid-key' };
    if (response.status === 403) return { configured: false, reachable: true, reason: 'missing-permission' };
    return { configured: true, reachable: false, reason: `provider-${response.status}` };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      reason: error?.name === 'AbortError' ? 'provider-timeout' : 'provider-unreachable'
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();

  if (req.method === 'HEAD') {
    res.setHeader('X-PapaVoice-Configured', apiKey ? 'true' : 'false');
    return res.status(200).end();
  }

  const provider = apiKey
    ? await verifyProvider(apiKey)
    : { configured: false, reachable: false, reason: 'missing-key' };

  return res.status(200).json({
    ok: true,
    configured: provider.configured,
    providerReachable: provider.reachable,
    providerStatus: provider.reason,
    mode: provider.configured ? 'ai' : 'demo',
    languages: ['zh', 'en', 'it', 'fr']
  });
}
