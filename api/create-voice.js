import FormData from 'form-data';
import fetch from 'node-fetch';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const MIN_DURATION_SECONDS = 10;
const MAX_DURATION_SECONDS = 90;

const EXTENSIONS = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/x-m4a': 'm4a',
  'audio/ogg': 'ogg'
};

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

function parseBody(body) {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body && typeof body === 'object' ? body : null;
}

export function parseAudioPayload(audioData, explicitMimeType = '') {
  if (typeof audioData !== 'string' || !audioData.trim()) {
    throw new Error('缺少录音数据');
  }

  const match = audioData.match(/^data:([^;,]+);base64,(.+)$/s);
  const mimeType = (match?.[1] || explicitMimeType || '').toLowerCase().split(';')[0];
  const base64 = (match?.[2] || audioData).replace(/\s/g, '');

  if (!EXTENSIONS[mimeType]) {
    throw new Error(`不支持的录音格式：${mimeType || '未知格式'}`);
  }

  if (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new Error('录音数据格式无效');
  }

  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) {
    throw new Error('录音内容为空');
  }
  if (buffer.length > MAX_AUDIO_BYTES) {
    throw new Error('录音文件过大，请控制在 60 秒以内');
  }

  return { buffer, mimeType, extension: EXTENSIONS[mimeType] };
}

function friendlyProviderError(status, details) {
  if (status === 401) return 'ElevenLabs 密钥无效，请重新检查 Vercel 环境变量。';
  if (status === 402 || status === 429) return 'ElevenLabs 额度不足或请求过于频繁，请检查套餐额度。';
  if (status === 422) return '这段录音暂时无法建立音色，请在安静环境重新录制 30–60 秒。';
  return details?.detail?.message || details?.detail || details?.message || '建立爸爸音色失败，请稍后重试。';
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI voice service not configured',
      message: '真实爸爸音色服务尚未配置，当前只能使用浏览器体验模式。',
      fallback: true
    });
  }

  const body = parseBody(req.body);
  if (!body) {
    return res.status(400).json({ error: '请求内容不是有效的 JSON' });
  }

  const duration = Number(body.duration);
  if (!Number.isFinite(duration) || duration < MIN_DURATION_SECONDS || duration > MAX_DURATION_SECONDS) {
    return res.status(400).json({ error: `录音时长应为 ${MIN_DURATION_SECONDS}–${MAX_DURATION_SECONDS} 秒` });
  }

  let parsedAudio;
  try {
    parsedAudio = parseAudioPayload(body.audioData, body.mimeType);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const safeName = String(body.voiceName || `PapaVoice Dad ${new Date().toISOString().slice(0, 10)}`)
    .replace(/[<>]/g, '')
    .slice(0, 80);

  const form = new FormData();
  form.append('name', safeName);
  form.append('files', parsedAudio.buffer, {
    filename: `dad-voice.${parsedAudio.extension}`,
    contentType: parsedAudio.mimeType,
    knownLength: parsedAudio.buffer.length
  });
  form.append('description', 'PapaVoice father voice clone — user confirmed consent');
  form.append('remove_background_noise', 'false');

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        ...form.getHeaders()
      },
      body: form
    });

    const details = await response.json().catch(() => ({}));
    if (!response.ok || !details.voice_id) {
      return res.status(response.status || 502).json({
        error: 'VOICE_CLONE_FAILED',
        message: friendlyProviderError(response.status, details)
      });
    }

    return res.status(200).json({
      status: 'success',
      voiceId: details.voice_id,
      requiresVerification: Boolean(details.requires_verification),
      message: '爸爸音色已建立，可以生成四国语音了。'
    });
  } catch (error) {
    console.error('create-voice failed:', error);
    return res.status(502).json({
      error: 'VOICE_PROVIDER_UNAVAILABLE',
      message: '语音服务暂时无法连接，请稍后重试。'
    });
  }
}
