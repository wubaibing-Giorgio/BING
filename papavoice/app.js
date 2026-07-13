const API_BASE = (document.querySelector('meta[name="papavoice-api-base"]')?.content || '/api').replace(/\/$/, '');
const MIN_RECORD_SECONDS = 90;
const MAX_RECORD_SECONDS = 120;
const VOICE_PROFILE_VERSION = '3';

const LANGUAGES = {
  zh: { label: '中文', flag: '🇨🇳', locale: 'zh-CN' },
  en: { label: 'English', flag: '🇬🇧', locale: 'en-US' },
  it: { label: 'Italiano', flag: '🇮🇹', locale: 'it-IT' },
  fr: { label: 'Français', flag: '🇫🇷', locale: 'fr-FR' }
};

const PRESETS = {
  goodnight: {
    zh: '亲爱的宝宝，夜晚安静下来了。爸爸想告诉你，今天的你也很棒。安心睡吧，爸爸妈妈一直爱着你，期待和你见面的那一天。',
    en: 'Dear baby, the night has grown quiet. Dad wants you to know that you did wonderfully today. Rest peacefully. Mom and Dad love you always, and we look forward to the day we meet you.',
    it: 'Caro piccolo, la notte è diventata tranquilla. Papà vuole dirti che anche oggi sei stato bravissimo. Riposa sereno. Mamma e papà ti amano sempre e non vedono l’ora di incontrarti.',
    fr: 'Mon cher bébé, la nuit est devenue calme. Papa veut te dire qu’aujourd’hui encore, tu as été merveilleux. Repose-toi paisiblement. Maman et papa t’aiment toujours et attendent avec impatience le jour de notre rencontre.'
  },
  blessing: {
    zh: '亲爱的宝宝，爸爸愿你平安、健康、勇敢，也愿你一生都能感受到爱与温暖。慢慢长大，不要着急，我们会一直陪着你。',
    en: 'Dear baby, Dad wishes you peace, health, and courage. May you feel love and warmth throughout your life. Grow at your own pace; there is no need to hurry. We will always be with you.',
    it: 'Caro piccolo, papà ti augura pace, salute e coraggio. Che tu possa sentire amore e calore per tutta la vita. Cresci con i tuoi tempi, senza fretta. Noi saremo sempre accanto a te.',
    fr: 'Mon cher bébé, papa te souhaite la paix, la santé et du courage. Puisses-tu ressentir l’amour et la chaleur tout au long de ta vie. Grandis à ton rythme, sans te presser. Nous serons toujours à tes côtés.'
  },
  story: {
    zh: '亲爱的宝宝，这是爸爸第一次认真地和你说话。虽然我们还没有见面，但你已经让我们的生活多了很多期待。等你来到这个世界，爸爸会牵着你的手，陪你慢慢认识它。',
    en: 'Dear baby, this is the first time Dad has spoken to you so sincerely. Although we have not met yet, you have already filled our lives with anticipation. When you come into this world, Dad will hold your hand and help you discover it, one step at a time.',
    it: 'Caro piccolo, questa è la prima volta che papà ti parla con tutto il cuore. Anche se non ci siamo ancora incontrati, hai già riempito la nostra vita di attesa. Quando arriverai in questo mondo, papà ti prenderà per mano e ti accompagnerà a scoprirlo, un passo alla volta.',
    fr: 'Mon cher bébé, c’est la première fois que papa te parle avec autant de sincérité. Même si nous ne nous sommes pas encore rencontrés, tu as déjà rempli notre vie d’attente. Quand tu viendras au monde, papa te tiendra la main et t’accompagnera pour le découvrir, pas à pas.'
  }
};

const state = {
  mode: 'checking',
  mediaRecorder: null,
  mediaStream: null,
  chunks: [],
  recordingBlob: null,
  recordingUrl: '',
  recordingMimeType: '',
  recordingStartedAt: 0,
  recordingDuration: 0,
  timerId: null,
  voiceId: '',
  voiceProfile: 'faithful',
  selectedPreset: 'goodnight',
  generatedUrls: new Set(),
  isGenerating: false,
  toastTimer: null
};

const elements = {};

class ApiError extends Error {
  constructor(message, status, fallback = false, requestId = '') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fallback = fallback;
    this.requestId = requestId;
  }
}

document.addEventListener('DOMContentLoaded', initialize);

function initialize() {
  cacheElements();
  bindEvents();
  selectPreset('goodnight');
  selectVoiceProfile('faithful');
  restoreSavedVoice();
  checkServiceStatus();
  registerServiceWorker();
}

function cacheElements() {
  const ids = [
    'service-pill', 'service-pill-text', 'mode-banner', 'mode-banner-text',
    'voice-consent', 'record-button', 'stop-button', 'record-timer',
    'recording-meta', 'recording-preview', 'preview-audio', 'upload-button',
    'clone-status', 'step-message', 'voice-ready', 'voice-ready-text',
    'reset-voice-button', 'voice-profile-row', 'voice-profile-help',
    'preset-row', 'message-input', 'char-count',
    'generate-note', 'generate-button', 'step-results', 'generation-status',
    'results-grid', 'toast'
  ];

  for (const id of ids) {
    const element = document.getElementById(id);
    if (!element) throw new Error(`PapaVoice 页面缺少元素：${id}`);
    elements[toCamelCase(id)] = element;
  }
}

function bindEvents() {
  elements.recordButton.addEventListener('click', startRecording);
  elements.stopButton.addEventListener('click', stopRecording);
  elements.uploadButton.addEventListener('click', createVoiceClone);
  elements.resetVoiceButton.addEventListener('click', resetVoice);
  elements.messageInput.addEventListener('input', handleMessageInput);
  elements.generateButton.addEventListener('click', generateAllLanguages);

  elements.presetRow.addEventListener('click', event => {
    const button = event.target.closest('[data-preset]');
    if (button) selectPreset(button.dataset.preset);
  });

  elements.voiceProfileRow.addEventListener('click', event => {
    const button = event.target.closest('[data-voice-profile]');
    if (button) selectVoiceProfile(button.dataset.voiceProfile);
  });

  window.addEventListener('pagehide', stopMediaTracks);
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

async function checkServiceStatus() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const response = await fetch(`${API_BASE}/status`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    setServiceMode(
      response.ok && data.configured ? 'ai' : 'demo',
      data.providerReachable !== false,
      data.providerStatus
    );
  } catch {
    setServiceMode('demo', false, 'status-unreachable');
  }
}

function setServiceMode(mode, providerReachable = true, providerStatus = '') {
  state.mode = mode;
  elements.servicePill.dataset.mode = mode;
  elements.modeBanner.dataset.mode = mode;

  if (mode === 'ai') {
    elements.servicePillText.textContent = providerReachable ? '真实音色' : '音色待连接';
    elements.modeBanner.querySelector('.mode-icon').textContent = providerReachable ? '✓' : '!';
    elements.modeBannerText.textContent = providerReachable
      ? '真实爸爸音色服务已连接。录音只会在你确认并点击“建立爸爸专属音色”后上传。'
      : '爸爸音色密钥已配置，但语音服务连接暂时不稳定；可以继续尝试，失败时会保留录音。';
  } else {
    const statusMessages = {
      'invalid-key': {
        pill: '密钥需更新',
        icon: '!',
        text: 'ElevenLabs 密钥无效或已失效。请在 Vercel 环境变量 ELEVENLABS_API_KEY 中换成有效密钥并重新部署。'
      },
      'missing-permission': {
        pill: '权限需开启',
        icon: '!',
        text: 'ElevenLabs 密钥缺少所需权限。请为密钥开启语音克隆和语音生成权限，然后重新部署。'
      },
      'status-unreachable': {
        pill: '服务待连接',
        icon: '!',
        text: '暂时无法确认爸爸音色服务状态。可以稍后刷新；已录好的声音不会因此被删除。'
      }
    };
    const message = statusMessages[providerStatus] || {
      pill: '体验模式',
      icon: 'i',
      text: '当前为体验模式：四国语音使用手机自带音色，并不是爸爸的音色。配置 ElevenLabs 后会自动切换为真实模式。'
    };

    elements.servicePillText.textContent = message.pill;
    elements.modeBanner.querySelector('.mode-icon').textContent = message.icon;
    elements.modeBannerText.textContent = message.text;
  }

  updateUploadButton();
  updateVoiceReadyText();
}

function restoreSavedVoice() {
  try {
    const savedVoiceId = localStorage.getItem('papavoice.voiceId') || '';
    const savedProfileVersion = localStorage.getItem('papavoice.voiceProfileVersion') || '';
    if (/^[A-Za-z0-9_-]{5,100}$/.test(savedVoiceId) && savedProfileVersion === VOICE_PROFILE_VERSION) {
      state.voiceId = savedVoiceId;
      unlockMessageStep();
      updateProgress(3);
    } else if (savedVoiceId) {
      localStorage.removeItem('papavoice.voiceId');
      localStorage.removeItem('papavoice.voiceProfileVersion');
    }
  } catch {
    // Storage can be unavailable in private browsing; the current session still works.
  }
}

function updateVoiceReadyText() {
  if (!state.voiceId) return;
  elements.voiceReadyText.textContent = state.mode === 'ai' && state.voiceId !== 'demo'
    ? '✓ 爸爸音色已准备好，可直接继续使用'
    : '体验模式：使用手机系统音色，不是爸爸音色';
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    showToast('当前浏览器不支持录音，请用最新版 Safari 或 Chrome 打开。');
    return;
  }

  clearRecording();

  try {
    state.mediaStream = await requestMicrophone();
    const mimeType = chooseRecordingMimeType();
    const options = mimeType ? { mimeType, audioBitsPerSecond: 128_000 } : undefined;
    state.mediaRecorder = new MediaRecorder(state.mediaStream, options);
    state.recordingMimeType = state.mediaRecorder.mimeType || mimeType || 'audio/webm';
    state.chunks = [];
    state.recordingStartedAt = Date.now();

    state.mediaRecorder.addEventListener('dataavailable', event => {
      if (event.data?.size) state.chunks.push(event.data);
    });
    state.mediaRecorder.addEventListener('stop', finalizeRecording, { once: true });
    state.mediaRecorder.addEventListener('error', () => {
      showToast('录音过程中出现错误，请重新录制。');
      stopMediaTracks();
    });

    state.mediaRecorder.start(1000);
    elements.recordButton.disabled = true;
    elements.stopButton.disabled = false;
    elements.uploadButton.disabled = true;
    elements.recordingMeta.innerHTML = '<span class="pulse" aria-hidden="true"></span><span>正在录音，请自然连续说话……</span>';
    state.timerId = window.setInterval(updateRecordingTimer, 250);
    updateRecordingTimer();
  } catch (error) {
    const message = error?.name === 'NotAllowedError'
      ? '麦克风权限被关闭了。请在 Safari 地址栏“网站设置”中允许麦克风。'
      : error?.name === 'NotFoundError'
        ? '没有找到可用的麦克风。'
        : '无法启动录音，请检查麦克风权限后重试。';
    showToast(message);
    stopMediaTracks();
  }
}

async function requestMicrophone() {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1
      }
    });
  } catch (error) {
    if (error?.name === 'OverconstrainedError') {
      return navigator.mediaDevices.getUserMedia({ audio: true });
    }
    throw error;
  }
}

function chooseRecordingMimeType() {
  const candidates = [
    'audio/mp4;codecs=mp4a.40.2',
    'audio/webm;codecs=opus',
    'audio/mp4',
    'audio/webm',
    'audio/ogg;codecs=opus'
  ];
  return candidates.find(type => MediaRecorder.isTypeSupported?.(type)) || '';
}

function updateRecordingTimer() {
  const elapsed = Math.min((Date.now() - state.recordingStartedAt) / 1000, MAX_RECORD_SECONDS);
  elements.recordTimer.textContent = formatDuration(elapsed);
  if (elapsed >= MAX_RECORD_SECONDS) stopRecording();
}

function stopRecording() {
  if (state.mediaRecorder?.state === 'recording') {
    state.recordingDuration = Math.min((Date.now() - state.recordingStartedAt) / 1000, MAX_RECORD_SECONDS);
    state.mediaRecorder.stop();
    window.clearInterval(state.timerId);
    state.timerId = null;
    elements.recordButton.disabled = false;
    elements.stopButton.disabled = true;
  }
}

function finalizeRecording() {
  const chunkType = state.chunks.find(chunk => chunk.type)?.type;
  const mimeType = (state.mediaRecorder?.mimeType || chunkType || state.recordingMimeType || 'audio/webm').split(';')[0];
  state.recordingMimeType = mimeType;
  state.recordingBlob = new Blob(state.chunks, { type: mimeType });
  stopMediaTracks();

  if (!state.recordingBlob.size) {
    elements.recordingMeta.textContent = '没有录到声音，请重新录制。';
    elements.recordingMeta.className = 'recording-meta status is-error';
    return;
  }

  state.recordingUrl = URL.createObjectURL(state.recordingBlob);
  elements.previewAudio.src = state.recordingUrl;
  elements.recordingPreview.hidden = false;

  const enough = state.recordingDuration >= MIN_RECORD_SECONDS;
  const fileSize = formatFileSize(state.recordingBlob.size);
  elements.recordingMeta.className = `recording-meta status ${enough ? 'is-success' : 'is-error'}`;
  elements.recordingMeta.textContent = enough
    ? `✓ 已录制 ${Math.round(state.recordingDuration)} 秒 · ${fileSize}，请先试听，确认清楚后建立音色。`
    : `只录了 ${Math.round(state.recordingDuration)} 秒，还差 ${Math.ceil(MIN_RECORD_SECONDS - state.recordingDuration)} 秒，请重新录制。`;
  elements.uploadButton.disabled = !enough;
  updateUploadButton();
  if (enough) updateProgress(2);
}

function stopMediaTracks() {
  window.clearInterval(state.timerId);
  state.timerId = null;
  state.mediaStream?.getTracks().forEach(track => track.stop());
  state.mediaStream = null;
}

function clearRecording() {
  if (state.recordingUrl) URL.revokeObjectURL(state.recordingUrl);
  state.recordingUrl = '';
  state.recordingBlob = null;
  state.recordingDuration = 0;
  state.chunks = [];
  elements.recordingPreview.hidden = true;
  elements.previewAudio.removeAttribute('src');
  elements.previewAudio.load();
  elements.recordTimer.textContent = '00:00';
  elements.cloneStatus.textContent = '';
  elements.cloneStatus.className = 'status';
  elements.recordingMeta.className = 'recording-meta';
  elements.recordingMeta.textContent = '录音不会在点击“建立音色”前上传。';
  elements.uploadButton.disabled = true;
}

function updateUploadButton() {
  if (!elements.uploadButton) return;
  elements.uploadButton.textContent = state.mode === 'demo'
    ? '进入四国语音体验（非爸爸音色）'
    : '建立爸爸专属音色';
}

async function createVoiceClone() {
  if (!elements.voiceConsent.checked) {
    showToast('请先确认声音已获得爸爸本人授权。');
    elements.voiceConsent.focus();
    return;
  }
  if (!state.recordingBlob || state.recordingDuration < MIN_RECORD_SECONDS) {
    showToast(`请先录满 ${MIN_RECORD_SECONDS} 秒。`);
    return;
  }

  if (state.mode === 'demo') {
    state.voiceId = 'demo';
    elements.cloneStatus.className = 'status is-success';
    elements.cloneStatus.textContent = '已进入体验模式。录音未上传，播放时使用手机自带音色。';
    unlockMessageStep();
    updateProgress(3);
    scrollToElement(elements.stepMessage);
    return;
  }

  setButtonLoading(elements.uploadButton, true, '正在建立爸爸音色……');
  elements.cloneStatus.className = 'status';
  elements.cloneStatus.textContent = '正在安全上传录音并建立音色，通常需要十几秒。';

  try {
    const data = await uploadVoiceRecording();

    state.voiceId = data.voiceId;
    try {
      localStorage.setItem('papavoice.voiceId', state.voiceId);
      localStorage.setItem('papavoice.voiceProfileVersion', VOICE_PROFILE_VERSION);
    } catch { /* session-only */ }
    elements.cloneStatus.className = 'status is-success';
    elements.cloneStatus.textContent = '✓ 爸爸专属音色已建立成功。';
    unlockMessageStep();
    updateProgress(3);
    scrollToElement(elements.stepMessage);
  } catch (error) {
    if (error.fallback) setServiceMode('demo');
    const message = formatApiError(error);
    elements.cloneStatus.className = 'status is-error';
    elements.cloneStatus.textContent = message;
    showToast(message);
  } finally {
    setButtonLoading(elements.uploadButton, false);
    updateUploadButton();
  }
}

function unlockMessageStep() {
  elements.stepMessage.dataset.state = 'active';
  elements.voiceReady.hidden = false;
  updateVoiceReadyText();
}

function resetVoice() {
  if (state.isGenerating) return;
  state.voiceId = '';
  try {
    localStorage.removeItem('papavoice.voiceId');
    localStorage.removeItem('papavoice.voiceProfileVersion');
  } catch { /* ignore */ }
  clearRecording();
  clearGeneratedResults();
  elements.voiceReady.hidden = true;
  elements.stepMessage.dataset.state = 'locked';
  elements.stepResults.dataset.state = 'locked';
  elements.voiceConsent.checked = false;
  updateProgress(1);
  scrollToElement(document.getElementById('step-record'));
}

function selectPreset(presetId) {
  const preset = PRESETS[presetId];
  if (!preset) return;
  state.selectedPreset = presetId;
  elements.presetRow.querySelectorAll('[data-preset]').forEach(button => {
    button.classList.toggle('is-selected', button.dataset.preset === presetId);
  });
  elements.messageInput.value = preset.zh;
  updateCharCount();
}

function handleMessageInput() {
  const selectedText = PRESETS[state.selectedPreset]?.zh;
  if (elements.messageInput.value !== selectedText) {
    state.selectedPreset = '';
    elements.presetRow.querySelectorAll('[data-preset]').forEach(button => button.classList.remove('is-selected'));
  }
  updateCharCount();
}

function selectVoiceProfile(profileId) {
  if (!['faithful', 'natural'].includes(profileId)) return;
  state.voiceProfile = profileId;
  elements.voiceProfileRow.querySelectorAll('[data-voice-profile]').forEach(button => {
    button.classList.toggle('is-selected', button.dataset.voiceProfile === profileId);
  });
  elements.voiceProfileHelp.textContent = profileId === 'faithful'
    ? '优先贴近爸爸本人声纹；建议首次生成先选这一档。'
    : '适当放松声纹约束，语气更流畅，但可能没有“更像本人”那么接近。';
}

function updateCharCount() {
  elements.charCount.textContent = String(elements.messageInput.value.length);
}

async function generateAllLanguages() {
  if (state.isGenerating) return;
  if (!state.voiceId) {
    showToast('请先完成爸爸音色步骤。');
    return;
  }

  const text = elements.messageInput.value.trim();
  if (!text) {
    showToast('先写下想对宝宝说的话。');
    elements.messageInput.focus();
    return;
  }

  state.isGenerating = true;
  elements.stepResults.dataset.state = 'active';
  updateProgress(4);
  setButtonLoading(elements.generateButton, true, '正在生成四国语音……');
  clearGeneratedResults();
  scrollToElement(elements.stepResults);

  try {
    if (state.mode === 'demo' || state.voiceId === 'demo') {
      generateDemoResults(text);
    } else {
      await generateRealResults(text);
    }
  } finally {
    state.isGenerating = false;
    setButtonLoading(elements.generateButton, false);
    elements.generateButton.textContent = '重新生成四国语音';
  }
}

async function generateRealResults(text) {
  for (const language of Object.keys(LANGUAGES)) renderPendingResult(language, '等待生成');

  elements.generationStatus.textContent = '第 1/4 步：正在用爸爸音色生成中文……';
  updateResultState('zh', '正在生成');

  let chineseResult;
  try {
    chineseResult = await requestJson(`${API_BASE}/generate-audio`, {
      method: 'POST',
      body: JSON.stringify({
        text,
        language: 'zh',
        voiceId: state.voiceId,
        voiceProfile: state.voiceProfile
      })
    });
    renderAudioResult('zh', chineseResult);
  } catch (error) {
    renderErrorResult('zh', error.message);
    for (const language of ['en', 'it', 'fr']) renderErrorResult(language, '中文源语音未生成，暂时无法继续。');
    elements.generationStatus.textContent = error.message;
    showToast(error.message);
    return;
  }

  const targets = ['en', 'it', 'fr'];
  let successCount = 1;

  for (let index = 0; index < targets.length; index += 1) {
    const language = targets[index];
    const info = LANGUAGES[language];
    elements.generationStatus.textContent = `第 ${index + 2}/4 步：正在翻译并生成 ${info.label}……`;
    updateResultState(language, '翻译与生成中');

    try {
      const result = await requestJson(`${API_BASE}/generate-audio`, {
        method: 'POST',
        body: JSON.stringify({
          text,
          language,
          voiceId: state.voiceId,
          voiceProfile: state.voiceProfile,
          sourceAudio: chineseResult.audio
        })
      });
      renderAudioResult(language, result);
      successCount += 1;
    } catch (error) {
      renderErrorResult(language, error.message);
    }
  }

  elements.generationStatus.textContent = successCount === 4
    ? '✓ 四国语音已全部生成，可以逐个播放或保存。'
    : `已生成 ${successCount}/4 个版本；失败的语言可稍后重新生成。`;
}

function generateDemoResults(text) {
  const preset = Object.values(PRESETS).find(item => item.zh === text);
  if (!preset) {
    elements.generationStatus.textContent = '体验模式只支持上方三段现成文案。请选择一段模板后再生成；真实模式支持任意中文。';
    for (const language of Object.keys(LANGUAGES)) {
      renderErrorResult(language, '请选择内置文案，或配置真实 AI 服务。');
    }
    showToast('体验模式请先选择一段现成文案。');
    return;
  }

  for (const language of Object.keys(LANGUAGES)) {
    renderDemoResult(language, preset[language]);
  }
  elements.generationStatus.textContent = '体验版本已准备好。播放使用手机系统音色，不是刚才录入的爸爸音色。';
}

function renderPendingResult(language, label) {
  const info = LANGUAGES[language];
  const card = document.createElement('article');
  card.className = 'result-card';
  card.id = `result-${language}`;

  const top = document.createElement('div');
  top.className = 'result-top';
  const name = document.createElement('div');
  name.className = 'result-language';
  name.textContent = `${info.flag} ${info.label}`;
  const status = document.createElement('span');
  status.className = 'result-state';
  status.dataset.role = 'state';
  status.textContent = label;
  top.append(name, status);

  const body = document.createElement('p');
  body.className = 'result-text';
  body.textContent = '准备中……';
  card.append(top, body);
  elements.resultsGrid.appendChild(card);
}

function updateResultState(language, label) {
  const card = document.getElementById(`result-${language}`);
  const status = card?.querySelector('[data-role="state"]');
  const body = card?.querySelector('.result-text');
  if (status) status.innerHTML = `<span class="spinner" aria-hidden="true"></span>${label}`;
  if (body) body.textContent = '请稍候，这一步可能需要几十秒。';
}

function renderAudioResult(language, result) {
  const info = LANGUAGES[language];
  const card = document.getElementById(`result-${language}`);
  if (!card) return;
  card.replaceChildren();

  const top = createResultHeader(info, '爸爸音色');
  const text = document.createElement('p');
  text.className = 'result-text';
  text.textContent = result.text || (language === 'zh' ? elements.messageInput.value.trim() : '翻译已包含在语音中');
  const audio = document.createElement('audio');
  audio.controls = true;
  audio.preload = 'metadata';
  audio.src = result.audio;
  audio.addEventListener('play', () => pauseOtherAudio(audio));

  const actions = document.createElement('div');
  actions.className = 'result-actions';
  const replay = createButton('从头播放', 'button-secondary', () => {
    audio.currentTime = 0;
    audio.play().catch(() => showToast('请再点一次播放器开始播放。'));
  });
  const download = createButton('保存音频', 'button-ghost', () => downloadAudio(result.audio, language));
  actions.append(replay, download);
  card.append(top, text, audio, actions);
}

function renderDemoResult(language, textValue) {
  const info = LANGUAGES[language];
  let card = document.getElementById(`result-${language}`);
  if (!card) {
    renderPendingResult(language, '体验音色');
    card = document.getElementById(`result-${language}`);
  }
  card.replaceChildren();

  const top = createResultHeader(info, '手机系统音色');
  const text = document.createElement('p');
  text.className = 'result-text';
  text.textContent = textValue;
  const play = createButton('▶ 播放体验语音', 'button-secondary', () => speakText(textValue, language));
  play.classList.add('button-wide');
  card.append(top, text, play);
}

function renderErrorResult(language, message) {
  const info = LANGUAGES[language];
  let card = document.getElementById(`result-${language}`);
  if (!card) {
    renderPendingResult(language, '未生成');
    card = document.getElementById(`result-${language}`);
  }
  card.replaceChildren();
  const top = createResultHeader(info, '未生成');
  top.querySelector('.result-state').style.color = '#a34e49';
  const text = document.createElement('p');
  text.className = 'result-text';
  text.textContent = message;
  card.append(top, text);
}

function createResultHeader(info, statusText) {
  const top = document.createElement('div');
  top.className = 'result-top';
  const name = document.createElement('div');
  name.className = 'result-language';
  name.textContent = `${info.flag} ${info.label}`;
  const status = document.createElement('span');
  status.className = 'result-state';
  status.textContent = statusText;
  top.append(name, status);
  return top;
}

function createButton(label, styleClass, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `button ${styleClass}`;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function pauseOtherAudio(activeAudio) {
  document.querySelectorAll('audio').forEach(audio => {
    if (audio !== activeAudio && !audio.paused) audio.pause();
  });
  window.speechSynthesis?.cancel();
}

function speakText(text, language) {
  if (!('speechSynthesis' in window)) {
    showToast('当前浏览器没有系统朗读功能。');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANGUAGES[language].locale;
  utterance.rate = 0.88;
  utterance.pitch = 1;
  const prefix = utterance.lang.slice(0, 2).toLowerCase();
  const voice = window.speechSynthesis.getVoices().find(item => item.lang.toLowerCase().startsWith(prefix));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function downloadAudio(audioData, language) {
  const anchor = document.createElement('a');
  anchor.href = audioData;
  anchor.download = `PapaVoice-${language}-${new Date().toISOString().slice(0, 10)}.mp3`;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function clearGeneratedResults() {
  window.speechSynthesis?.cancel();
  state.generatedUrls.forEach(url => URL.revokeObjectURL(url));
  state.generatedUrls.clear();
  elements.resultsGrid.replaceChildren();
  elements.generationStatus.textContent = '正在准备四国语音……';
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      data.message || data.error || `请求失败（${response.status}）`,
      response.status,
      Boolean(data.fallback),
      data.requestId || response.headers.get('X-PapaVoice-Request-Id') || ''
    );
  }
  return data;
}

async function uploadVoiceRecording() {
  const requestId = createClientRequestId();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 65_000);
  const mimeType = state.recordingMimeType || state.recordingBlob.type || 'application/octet-stream';

  try {
    const response = await fetch(`${API_BASE}/create-voice`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': mimeType,
        'X-PapaVoice-Mime-Type': mimeType,
        'X-PapaVoice-Duration': String(state.recordingDuration),
        'X-PapaVoice-Request-Id': requestId,
        'X-PapaVoice-Voice-Name': `PapaVoice Dad ${requestId.slice(0, 8)}`
      },
      body: state.recordingBlob,
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    const responseRequestId = data.requestId || response.headers.get('X-PapaVoice-Request-Id') || requestId;

    if (!response.ok) {
      throw new ApiError(
        data.message || data.error || `服务器返回错误（${response.status}）`,
        response.status,
        Boolean(data.fallback),
        responseRequestId
      );
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const timedOut = error?.name === 'AbortError';
    throw new ApiError(
      timedOut
        ? '建立音色等待超时，录音仍在，请保持页面打开后再点一次。'
        : '上传连接中断，录音仍在，无需重录；请保持 Safari 在前台后再点一次。',
      timedOut ? 504 : 0,
      false,
      requestId
    );
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function createClientRequestId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `pv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatApiError(error) {
  const message = error?.message || '建立音色失败，请稍后重试。';
  const suffix = error?.requestId ? `（编号 ${String(error.requestId).slice(-8)}）` : '';
  return `${message}${suffix}`;
}

function setButtonLoading(button, loading, loadingText = '') {
  button.disabled = loading;
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.innerHTML = `<span class="spinner" aria-hidden="true"></span><span>${loadingText}</span>`;
  } else if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
    delete button.dataset.originalText;
  }
}

function updateProgress(activeStep) {
  for (let index = 1; index <= 4; index += 1) {
    const element = document.getElementById(`progress-${index}`);
    element.classList.toggle('is-complete', index < activeStep);
    element.classList.toggle('is-active', index === activeStep);
    element.querySelector('.step-number').textContent = index < activeStep ? '✓' : String(index);
  }
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function scrollToElement(element) {
  window.setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  state.toastTimer = window.setTimeout(() => elements.toast.classList.remove('is-visible'), 4200);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      // The app remains usable without offline caching.
    });
  }
}
