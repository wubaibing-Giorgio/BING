/**
 * Vercel Function: Create/upload voice for AI voice cloning
 * Endpoint: POST /api/create-voice
 * 
 * Request:
 * - audioData: base64 encoded audio
 * - voiceName: optional, custom voice name
 * 
 * Response:
 * - voiceId: unique identifier for the cloned voice
 * - status: success/error
 */

import FormData from 'form-data';
import fetch from 'node-fetch';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

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

    const { audioData, voiceName = 'PapaVoice Clone' } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'audioData is required' });
    }

    // Convert base64 to Buffer
    const audioBuffer = Buffer.from(audioData.split(',')[1] || audioData, 'base64');

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('name', voiceName);
    formData.append('files', audioBuffer, 'voice.wav');
    formData.append('description', 'Cloned voice for PapaVoice prenatal education');

    // Add voice to ElevenLabs
    const response = await fetch(`${ELEVENLABS_API_URL}/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('ElevenLabs API error:', errorData);
      return res.status(response.status).json({
        error: 'Failed to create voice',
        details: errorData
      });
    }

    const data = await response.json();
    const voiceId = data.voice_id;

    // Store voice_id in a simple in-memory cache (in production, use database)
    // For this session, we'll return the voiceId
    return res.status(200).json({
      status: 'success',
      voiceId: voiceId,
      voiceName: voiceName,
      message: '爸爸声音已成功上传，声纹克隆创建完成！'
    });
  } catch (error) {
    console.error('Error creating voice:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
