const fs = require('fs/promises');
const { IncomingForm } = require('formidable');

exports.config = { api: { bodyParser: false } };

function parseMultipart(req) {
  const form = new IncomingForm({ multiples: false, maxFileSize: 25 * 1024 * 1024, keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) reject(error);
      else resolve({ fields, files });
    });
  });
}

function firstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '缺少 ELEVENLABS_API_KEY。请在 Vercel 环境变量里添加。' });
  }

  try {
    const { fields, files } = await parseMultipart(req);
    const uploaded = firstValue(files.voiceSample || files.audio || files.file || Object.values(files)[0]);
    if (!uploaded) return res.status(400).json({ error: '没有收到音频样本。' });

    const fileBuffer = await fs.readFile(uploaded.filepath);
    const formData = new FormData();
    formData.append('name', firstValue(fields.name) || `PapaVoice ${Date.now()}`);
    formData.append('description', 'PapaVoice authorized family voice for prenatal education.');
    formData.append('remove_background_noise', 'true');
    formData.append('files', new Blob([fileBuffer], { type: uploaded.mimetype || 'audio/webm' }), uploaded.originalFilename || 'sample.webm');

    const providerResponse = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: formData,
    });

    const contentType = providerResponse.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await providerResponse.json() : { raw: await providerResponse.text() };

    if (!providerResponse.ok) {
      return res.status(providerResponse.status).json({ error: data.detail?.message || data.message || data.detail || '声音档案创建失败。', provider: data });
    }

    return res.status(200).json({ voiceId: data.voice_id, requiresVerification: Boolean(data.requires_verification) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || '服务器处理音频失败。' });
  }
};
