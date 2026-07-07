/**
 * Vercel Function: Generate multilingual audio with AI voice cloning
 * Endpoint: POST /api/generate-audio
 * 
 * Request:
 * - text: input text (Chinese)
 * - language: target language (zh, en, it, fr)
 * - voiceId: the cloned voice_id
 * 
 * Response:
 * - audioUrl: URL to generated audio
 * - duration: audio duration in seconds
 */

import fetch from 'node-fetch';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Language code mappings
const LANGUAGE_CODES = {
  zh: 'zh',      // Chinese
  en: 'en',      // English
  it: 'it',      // Italian
  fr: 'fr'       // French
};

// Translate text to target language using a simple API or stored translations
async function translateText(text, targetLanguage) {
  // For now, return a simple translation
  // In production, use Google Translate API or similar
  const translations = {
    zh: text, // Original Chinese
    en: translateToEnglish(text),
    it: translateToItalian(text),
    fr: translateToFrench(text)
  };
  return translations[targetLanguage] || text;
}

// Simple translation functions (placeholder - use real translation API in production)
function translateToEnglish(text) {
  const dict = {
    '亲爱的宝宝': 'Dear baby',
    '爸爸': 'dad',
    '妈妈': 'mom',
    '我爱你': 'I love you',
    '美好': 'beautiful',
    '祝福': 'blessing',
    '成长': 'growth',
    '健康': 'healthy',
    '快乐': 'happy',
    '温暖': 'warm'
  };
  
  let result = text;
  for (const [zh, en] of Object.entries(dict)) {
    result = result.replace(zh, en);
  }
  return result || '[English translation required - please provide actual translation]';
}

function translateToItalian(text) {
  return '[Traduzione italiana - ' + text + ']';
}

function translateToFrench(text) {
  return '[Traduction française - ' + text + ']';
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if API key is configured
    if (!ELEVENLABS_API_KEY) {
      return res.status(503).json({
        error: 'AI voice service not configured',
        message: '当前未配置 AI 语音服务，无法进行真实声纹克隆。',
        fallback: true
      });
    }

    const { text, language = 'zh', voiceId } = req.body;

    if (!text || !voiceId) {
      return res.status(400).json({ error: 'text and voiceId are required' });
    }

    if (!LANGUAGE_CODES[language]) {
      return res.status(400).json({ error: 'Unsupported language' });
    }

    // Translate text to target language
    const translatedText = await translateText(text, language);

    // Generate audio using ElevenLabs Text-to-Speech
    const ttsResponse = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: translatedText,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      }
    );

    if (!ttsResponse.ok) {
      const errorData = await ttsResponse.text();
      console.error('ElevenLabs TTS error:', errorData);
      return res.status(ttsResponse.status).json({
        error: 'Failed to generate audio',
        details: errorData
      });
    }

    // Get audio buffer
    const audioBuffer = await ttsResponse.buffer();
    const audioBase64 = audioBuffer.toString('base64');

    // Calculate approximate duration (roughly 0.1 seconds per character)
    const estimatedDuration = Math.ceil(translatedText.length * 0.1);

    return res.status(200).json({
      status: 'success',
      audio: `data:audio/mpeg;base64,${audioBase64}`,
      language: language,
      duration: estimatedDuration,
      text: translatedText,
      message: `已生成${language}语音版本`
    });
  } catch (error) {
    console.error('Error generating audio:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
