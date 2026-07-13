import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('every cached DOM id exists in the page', async () => {
  const [html, script] = await Promise.all([
    readFile(new URL('papavoice/index.html', root), 'utf8'),
    readFile(new URL('papavoice/app.js', root), 'utf8')
  ]);

  const idBlock = script.slice(script.indexOf('const ids = ['), script.indexOf('];', script.indexOf('const ids = [')));
  const referencedIds = [...idBlock.matchAll(/'([^']+)'/g)].map(match => match[1]);
  const htmlIds = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]));
  const missing = referencedIds.filter(id => !htmlIds.has(id));

  assert.deepEqual(missing, []);
  assert.ok(referencedIds.length > 20, 'expected the main UI controls to be covered');
});

test('page loads one application script and no conflicting legacy scripts', async () => {
  const html = await readFile(new URL('papavoice/index.html', root), 'utf8');
  const sources = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);

  assert.deepEqual(sources, ['./app.js?v=2.4.0']);
  assert.doesNotMatch(html, /ai-voice-handler\.js|\.\/script\.js/);
});

test('provider configuration problems have actionable mobile messages', async () => {
  const script = await readFile(new URL('papavoice/app.js', root), 'utf8');

  assert.match(script, /invalid-key[\s\S]*密钥需更新/);
  assert.match(script, /missing-permission[\s\S]*权限需开启/);
  assert.match(script, /ELEVENLABS_API_KEY/);
});

test('voice identity workflow requires a full quality recording', async () => {
  const [html, script] = await Promise.all([
    readFile(new URL('papavoice/index.html', root), 'utf8'),
    readFile(new URL('papavoice/app.js', root), 'utf8')
  ]);

  assert.match(script, /MIN_RECORD_SECONDS = 90/);
  assert.match(script, /VOICE_PROFILE_VERSION = '3'/);
  assert.match(script, /echoCancellation: false/);
  assert.match(script, /audioBitsPerSecond: 128_000/);
  assert.match(html, /建议 90–120 秒/);
  assert.match(html, /没有回声/);
  assert.match(html, /data-voice-profile="faithful"/);
});

test('page includes a free international bedtime story shelf', async () => {
  const [html, script] = await Promise.all([
    readFile(new URL('papavoice/index.html', root), 'utf8'),
    readFile(new URL('papavoice/app.js', root), 'utf8')
  ]);

  const storyButtons = [...html.matchAll(/data-story="([^"]+)"/g)].map(match => match[1]);
  assert.equal(storyButtons.length, 6);
  assert.equal(new Set(storyButtons).size, 6);
  assert.match(html, /环球睡前故事/);
  assert.match(html, /6 篇免费/);
  assert.match(html, /只有点击生成爸爸音色版本时/);

  for (const storyId of storyButtons) {
    assert.match(script, new RegExp(`'${storyId}'`));
  }
  assert.match(script, /function selectStory/);
  assert.match(script, /selectedStory/);
});

test('free story preview works before a father voice is created', async () => {
  const [html, script] = await Promise.all([
    readFile(new URL('papavoice/index.html', root), 'utf8'),
    readFile(new URL('papavoice/app.js', root), 'utf8')
  ]);

  assert.match(html, /id="step-message"[^>]+data-state="active"/);
  assert.match(html, /id="preview-story-button"/);
  assert.match(html, /id="use-story-button"/);
  assert.match(html, /不耗额度/);
  assert.match(script, /function toggleStoryPreview/);
  assert.match(script, /SpeechSynthesisUtterance/);
  assert.match(script, /function stopStoryPreview/);
  assert.match(script, /elements\.stepMessage\.dataset\.state = 'active'/);
});

test('root redirect remains relative for both Vercel and GitHub Pages', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /\.\/papavoice\/index\.html/);
  assert.doesNotMatch(html, /url=\/papavoice/);
});

test('manifest uses a relative app scope', async () => {
  const manifest = JSON.parse(await readFile(new URL('papavoice/manifest.json', root), 'utf8'));
  assert.equal(manifest.start_url, './index.html');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.lang, 'zh-CN');
});
