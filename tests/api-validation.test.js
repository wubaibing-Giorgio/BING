import assert from 'node:assert/strict';
import test from 'node:test';

import createStatus from '../api/status.js';
import createVoice, { parseAudioPayload } from '../api/create-voice.js';
import { validateGenerationInput, VOICE_SETTINGS } from '../api/generate-audio.js';

test('recording parser preserves the actual iPhone-compatible mime type', () => {
  const payload = `data:audio/mp4;base64,${Buffer.from('sample-audio').toString('base64')}`;
  const parsed = parseAudioPayload(payload);

  assert.equal(parsed.mimeType, 'audio/mp4');
  assert.equal(parsed.extension, 'm4a');
  assert.equal(parsed.buffer.toString(), 'sample-audio');
});

test('recording parser rejects unsupported or malformed input', () => {
  assert.throws(() => parseAudioPayload('data:text/plain;base64,SGVsbG8='), /不支持的录音格式/);
  assert.throws(() => parseAudioPayload('not base64', 'audio/webm'), /格式无效/);
});

test('generation accepts exactly the four required languages', () => {
  for (const language of ['zh', 'en', 'it', 'fr']) {
    const input = validateGenerationInput({ text: '亲爱的宝宝', language, voiceId: 'voice_12345' });
    assert.equal(input.language, language);
  }

  assert.throws(
    () => validateGenerationInput({ text: '亲爱的宝宝', language: 'ja', voiceId: 'voice_12345' }),
    /不支持这个语言/
  );
});

test('voice settings retain the preferred natural PapaVoice tuning', () => {
  assert.deepEqual(VOICE_SETTINGS, {
    stability: 0.5,
    similarity_boost: 0.92,
    style: 0,
    use_speaker_boost: true
  });
});

test('status endpoint reports configuration without exposing the key', async () => {
  const original = process.env.ELEVENLABS_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.ELEVENLABS_API_KEY = 'private-test-key';
  globalThis.fetch = async () => ({ ok: true, status: 200 });
  const res = createMockResponse();

  try {
    await createStatus({ method: 'GET' }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.configured, true);
    assert.equal(res.body.providerReachable, true);
    assert.equal(res.body.mode, 'ai');
    assert.deepEqual(res.body.languages, ['zh', 'en', 'it', 'fr']);
    assert.doesNotMatch(JSON.stringify(res.body), /private-test-key/);
  } finally {
    globalThis.fetch = originalFetch;
    if (original === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = original;
  }
});

test('status endpoint detects an invalid provider key', async () => {
  const original = process.env.ELEVENLABS_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.ELEVENLABS_API_KEY = 'invalid-test-key';
  globalThis.fetch = async () => ({ ok: false, status: 401 });
  const res = createMockResponse();

  try {
    await createStatus({ method: 'GET' }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.configured, false);
    assert.equal(res.body.providerStatus, 'invalid-key');
    assert.equal(res.body.mode, 'demo');
  } finally {
    globalThis.fetch = originalFetch;
    if (original === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = original;
  }
});

test('create voice accepts a raw Safari audio upload', async () => {
  const original = process.env.ELEVENLABS_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.ELEVENLABS_API_KEY = 'private-test-key';
  let providerBody;
  globalThis.fetch = async (_url, options) => {
    providerBody = options.body;
    return new Response(JSON.stringify({ voice_id: 'voice_created_123', requires_verification: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const req = {
    method: 'POST',
    headers: {
      'content-type': 'audio/mp4',
      'x-papavoice-mime-type': 'audio/mp4',
      'x-papavoice-duration': '65',
      'x-papavoice-request-id': 'safari-upload-test'
    },
    body: Buffer.from('fake-aac-audio')
  };
  const res = createMockResponse();

  try {
    await createVoice(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.voiceId, 'voice_created_123');
    assert.equal(res.body.requestId, 'safari-upload-test');
    assert.ok(providerBody instanceof FormData);
  } finally {
    globalThis.fetch = originalFetch;
    if (original === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = original;
  }
});

function createMockResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end() {
      return this;
    }
  };
}
