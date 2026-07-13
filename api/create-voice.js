import { Blob } from 'node:buffer';
import { randomUUID } from 'node:crypto';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const MIN_DURATION_SECONDS = 10;
const MAX_DURATION_SECONDS = 90;
const PROVIDER_TIMEOUT_MS = 55_000;

const EXTENSIONS = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/x-m4a': 'm4a',
  'audio/ogg': 'ogg',
  'application/octet-stream': 'bin'
};

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-PapaVoice-Duration, X-PapaVoice-Mime-Type, X-PapaVoice-Request-Id, X-PapaVoice-Voice-Name'
  );
  res.setHeader('Cache-Control', 'no-store');
}

function headerValue(req, name) {
  const value = req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function normalizeMimeType(value = '') {
  return String(value).toLowerCase().split(';')[0].trim();
}

function createRequestId(req) {
  const supplied = String(headerValue(req, 'x-papavoice-request-id') || '')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 64);
  return supplied || randomUUID();
}

function parseBody(body) {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body && typeof body === 'object' && !Buffer.isBuffer(body) ? body : null;
}

function validateAudioBuffer(buffer, mimeType) {
  if (!EXTENSIONS[mimeType]) {
    throw new Error(`不支持的录音格式：${mimeType || '未知格式'}`);
  }
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new Error('录音内容为空');
  }
  if (buffer.length > MAX_AUDIO_BYTES) {
    throw new Error('录音文件过大，请控制在 60 秒以内并重新录制');
  }
  return { buffer, mimeType, extension: EXTENSIONS[mimeType] };
}

export function parseAudioPayload(audioData, explicitMimeType = '') {
  if (typeof audioData !== 'string' || !audioData.trim()) {
    throw new Error('缺少录音数据');
  }

  const match = audioData.match(/^data:([^;,]+);base64,(.+)$/s);
  const mimeType = normalizeMimeType(match?.[1] || explicitMimeType);
  const base64 = (match?.[2] || audioData).replace(/\s/g, '');

  if (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new Error('录音数据格式无效');
  }

  return validateAudioBuffer(Buffer.from(base64, 'base64'), mimeType);
}

async function readRawRequest(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (req.body instanceof Uint8Array) return Buffer.from(req.body);
  if (req.body?.type === 'Buffer' && Array.isArray(req.body.data)) return Buffer.from(req.body.data);
  if (typeof req.body === 'string') return Buffer.from(req.body, 'binary');

  const chunks = [];
  if (req && typeof req[Symbol.asyncIterator] === 'function') {
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function parseRecordingRequest(req) {
  const contentType = normalizeMimeType(headerValue(req, 'content-type'));

  if (contentType.startsWith('audio/') || contentType === 'application/octet-stream') {
    const explicitMimeType = normalizeMimeType(headerValue(req, 'x-papavoice-mime-type'));
    const mimeType = contentType === 'application/octet-stream' ? explicitMimeType : contentType;
    const buffer = await readRawRequest(req);
    return {
      ...validateAudioBuffer(buffer, mimeType),
      duration: Number(headerValue(req, 'x-papavoice-duration')),
      voiceName: headerValue(req, 'x-papavoice-voice-name')
    };
  }

  const body = parseBody(req.body);
  if (!body) throw new Error('请求内容不是有效的录音或 JSON');
  return {
    ...parseAudioPayload(body.audioData, body.mimeType),
    duration: Number(body.duration),
    voiceName: body.voiceName
  };
}

async function fetchWithTimeout(url, options, timeoutMs = PROVIDER_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function responseDetails(response) {
  const text = await response.text().catch(() => '');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
}

function detailMessage(details) {
  if (typeof details?.detail === 'string') return details.detail;
  if (typeof details?.detail?.message === 'string') return details.detail.message;
  if (typeof details?.message === 'string') return details.message;
  return '';
}

function friendlyProviderError(status, details) {
  if (status === 401) return 'ElevenLabs 密钥无效，请重新配置语音服务。';
  if (status === 403) return '当前 ElevenLabs 密钥没有创建音色的权限，请检查 API Key 权限或套餐。';
  if (status === 402 || status === 429) return 'ElevenLabs 额度不足或请求过于频繁，请检查套餐额度。';
  if (status === 422) return '这段录音暂时无法建立音色，请在安静环境重新录制 30–60 秒。';
  return detailMessage(details) || '建立爸爸音色失败，请稍后重试。';
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const requestId = createRequestId(req);
  res.setHeader('X-PapaVoice-Request-Id', requestId);

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI voice service not configured',
      message: '真实爸爸音色服务尚未配置，当前只能使用浏览器体验模式。',
      fallback: true,
      requestId
    });
  }

  let recording;
  try {
    recording = await parseRecordingRequest(req);
  } catch (error) {
    return res.status(400).json({ error: error.message, requestId });
  }

  if (
    !Number.isFinite(recording.duration) ||
    recording.duration < MIN_DURATION_SECONDS ||
    recording.duration > MAX_DURATION_SECONDS
  ) {
    return res.status(400).json({
      error: `录音时长应为 ${MIN_DURATION_SECONDS}–${MAX_DURATION_SECONDS} 秒`,
      requestId
    });
  }

  const safeName = String(recording.voiceName || `PapaVoice Dad ${requestId.slice(0, 8)}`)
    .replace(/[<>]/g, '')
    .slice(0, 80);

  const form = new FormData();
  form.append('name', safeName);
  form.append(
    'files',
    new Blob([recording.buffer], { type: recording.mimeType }),
    `dad-voice.${recording.extension}`
  );
  form.append('description', `PapaVoice father voice clone — consent confirmed — ${requestId}`);
  form.append('remove_background_noise', 'false');

  try {
    const response = await fetchWithTimeout(`${ELEVENLABS_API_URL}/voices/add`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: form
    });
    const details = await responseDetails(response);

    if (!response.ok || !details.voice_id) {
      return res.status(response.status || 502).json({
        error: 'VOICE_CLONE_FAILED',
        message: friendlyProviderError(response.status, details),
        requestId
      });
    }

    return res.status(200).json({
      status: 'success',
      voiceId: details.voice_id,
      requiresVerification: Boolean(details.requires_verification),
      message: '爸爸音色已建立，可以生成四国语音了。',
      requestId
    });
  } catch (error) {
    console.error('create-voice failed:', requestId, error);
    const timedOut = error?.name === 'AbortError';
    return res.status(timedOut ? 504 : 502).json({
      error: timedOut ? 'VOICE_PROVIDER_TIMEOUT' : 'VOICE_PROVIDER_UNAVAILABLE',
      message: timedOut
        ? '建立音色等待超时，请保持页面打开并再试一次。'
        : '语音服务连接中断，请保持页面在前台并再试一次。',
      requestId
    });
  }
}
