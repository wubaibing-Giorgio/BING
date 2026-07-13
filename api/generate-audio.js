import { Blob } from 'node:buffer';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const SUPPORTED_LANGUAGES = new Set(['zh', 'en', 'it', 'fr']);
const MAX_TEXT_LENGTH = 500;
const MAX_SOURCE_AUDIO_BYTES = 4 * 1024 * 1024;
const DUB_POLL_INTERVAL_MS = 2500;
const DUB_TIMEOUT_MS = 90_000;

export const VOICE_SETTINGS = Object.freeze({
  stability: 0.35,
  similarity_boost: 0.85,
  style: 0.4,
  use_speaker_boost: true
});

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

export function validateGenerationInput(body) {
  const text = String(body?.text || '').trim();
  const language = String(body?.language || 'zh').toLowerCase();
  const voiceId = String(body?.voiceId || '').trim();

  if (!text) throw new Error('请输入想对宝宝说的话');
  if (text.length > MAX_TEXT_LENGTH) throw new Error(`文案不能超过 ${MAX_TEXT_LENGTH} 个字`);
  if (!SUPPORTED_LANGUAGES.has(language)) throw new Error('不支持这个语言');
  if (!/^[A-Za-z0-9_-]{5,100}$/.test(voiceId)) throw new Error('爸爸音色 ID 无效，请重新录制');

  return { text, language, voiceId };
}

function parseSourceAudio(sourceAudio) {
  if (typeof sourceAudio !== 'string' || !sourceAudio) {
    throw new Error('生成外语版本前需要先生成中文语音');
  }

  const match = sourceAudio.match(/^data:audio\/mpeg;base64,(.+)$/s);
  const base64 = (match?.[1] || sourceAudio).replace(/\s/g, '');
  if (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new Error('中文语音数据无效');
  }

  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length || buffer.length > MAX_SOURCE_AUDIO_BYTES) {
    throw new Error('中文语音文件为空或过大');
  }
  return buffer;
}

async function createChineseSpeech({ text, voiceId, apiKey }) {
  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: VOICE_SETTINGS
      })
    }
  );

  if (!response.ok) {
    const details = await response.text();
    const error = new Error('中文语音生成失败');
    error.status = response.status;
    error.details = details;
    throw error;
  }

  return Buffer.from(await response.arrayBuffer());
}

async function createDub({ sourceBuffer, targetLanguage, apiKey }) {
  const form = new FormData();
  form.append('file', new Blob([sourceBuffer], { type: 'audio/mpeg' }), 'papavoice-source.mp3');
  form.append('name', `PapaVoice ${targetLanguage} ${Date.now()}`);
  form.append('source_lang', 'zh');
  form.append('target_lang', targetLanguage);
  form.append('num_speakers', '1');
  form.append('drop_background_audio', 'true');
  form.append('disable_voice_cloning', 'false');

  const response = await fetch(`${ELEVENLABS_API_URL}/dubbing`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.dubbing_id) {
    const error = new Error('外语翻译任务创建失败');
    error.status = response.status;
    error.details = JSON.stringify(data);
    throw error;
  }
  return data.dubbing_id;
}

async function waitForDub({ dubbingId, apiKey }) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < DUB_TIMEOUT_MS) {
    const response = await fetch(`${ELEVENLABS_API_URL}/dubbing/${encodeURIComponent(dubbingId)}`, {
      headers: { 'xi-api-key': apiKey }
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error('读取外语生成进度失败');
      error.status = response.status;
      throw error;
    }
    if (data.status === 'dubbed') return data;
    if (data.status === 'failed') {
      const error = new Error(data.error || '外语版本生成失败');
      error.status = 422;
      throw error;
    }

    await new Promise(resolve => setTimeout(resolve, DUB_POLL_INTERVAL_MS));
  }

  const timeoutError = new Error('外语版本生成超时，请稍后重试');
  timeoutError.status = 504;
  throw timeoutError;
}

async function fetchDubResult({ dubbingId, language, apiKey }) {
  const [audioResponse, transcriptResponse] = await Promise.all([
    fetch(`${ELEVENLABS_API_URL}/dubbing/${encodeURIComponent(dubbingId)}/audio/${language}`, {
      headers: { 'xi-api-key': apiKey, Accept: 'audio/mpeg' }
    }),
    fetch(`${ELEVENLABS_API_URL}/dubbing/${encodeURIComponent(dubbingId)}/transcripts/${language}/format/json`, {
      headers: { 'xi-api-key': apiKey }
    })
  ]);

  if (!audioResponse.ok) {
    const error = new Error('外语音频下载失败');
    error.status = audioResponse.status;
    throw error;
  }

  const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
  let translatedText = '';

  if (transcriptResponse.ok) {
    const transcript = await transcriptResponse.json().catch(() => ({}));
    translatedText = transcript?.json?.utterances
      ?.map(utterance => utterance.text)
      .filter(Boolean)
      .join(' ')
      .trim() || '';
  }

  return { audioBuffer, translatedText };
}

function friendlyError(error) {
  if (error.status === 401) return 'ElevenLabs 密钥无效，请检查 Vercel 环境变量。';
  if (error.status === 402 || error.status === 429) return 'ElevenLabs 额度不足或请求过于频繁，请检查套餐额度。';
  if (error.status === 403) return '当前 ElevenLabs 套餐没有语音克隆或多语言配音权限。';
  if (error.status === 504) return error.message;
  return error.message || '语音服务暂时不可用，请稍后重试。';
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

  let input;
  try {
    input = validateGenerationInput(body);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    if (input.language === 'zh') {
      const audioBuffer = await createChineseSpeech({ ...input, apiKey });
      return res.status(200).json({
        status: 'success',
        language: 'zh',
        text: input.text,
        audio: `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`
      });
    }

    const sourceBuffer = parseSourceAudio(body.sourceAudio);
    const dubbingId = await createDub({
      sourceBuffer,
      targetLanguage: input.language,
      apiKey
    });
    await waitForDub({ dubbingId, apiKey });
    const result = await fetchDubResult({ dubbingId, language: input.language, apiKey });

    return res.status(200).json({
      status: 'success',
      language: input.language,
      text: result.translatedText,
      audio: `data:audio/mpeg;base64,${result.audioBuffer.toString('base64')}`
    });
  } catch (error) {
    console.error('generate-audio failed:', error.status, error.message, error.details || '');
    return res.status(error.status && error.status >= 400 && error.status < 600 ? error.status : 502).json({
      error: 'AUDIO_GENERATION_FAILED',
      message: friendlyError(error)
    });
  }
}
