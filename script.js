const STORAGE_KEYS = {
  settings: 'papavoice-settings-v2',
  recording: 'papavoice-dad-recording-v2',
  stats: 'papavoice-stats-v2'
};

const LANGUAGES = {
  zh: {
    label: '中文',
    title: '中文胎教文案',
    voiceLang: 'zh-CN',
    text: '宝宝，今天爸爸想陪你听一会儿声音。你在妈妈肚子里慢慢长大，我们每天都在期待见到你。'
  },
  en: {
    label: 'English',
    title: 'English prenatal message',
    voiceLang: 'en-US',
    text: 'Baby, this is Dad speaking to you today. Grow gently and safely. We are waiting for you with so much love.'
  },
  it: {
    label: 'Italiano',
    title: 'Messaggio prenatale in italiano',
    voiceLang: 'it-IT',
    text: 'Piccolo amore, sono papà. Cresci piano, sereno e al sicuro. Ti aspettiamo ogni giorno con tanto amore.'
  },
  fr: {
    label: 'Français',
    title: 'Message prénatal en français',
    voiceLang: 'fr-FR',
    text: 'Mon petit bébé, c’est papa qui te parle. Grandis doucement, en paix et en sécurité. Nous t’attendons avec beaucoup d’amour.'
  }
};

let currentLanguage = 'zh';
let mediaRecorder = null;
let recordingChunks = [];
let recordingStartTime = 0;
let timerId = null;
let lastRecordingBlob = null;

document.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();
  bindNavigation();
  bindRecording();
  bindPlayback();
  bindSettings();
  bindLanguageButtons();
  restoreSettings();
  restoreRecording();
  updateLanguageUI();
  updateStatsUI();
});

function $(id) { return document.getElementById(id); }

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => toast.classList.add('hidden'), 2600);
}

function switchPanel(target) {
  document.querySelectorAll('.panel').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.panel === target);
  });
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.target === target);
  });
}

function bindNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchPanel(item.dataset.target));
  });
  $('home-record').addEventListener('click', () => switchPanel('record'));
  $('home-play').addEventListener('click', () => switchPanel('play'));
}

function bindLanguageButtons() {
  document.querySelectorAll('.lang-btn').forEach(button => {
    button.addEventListener('click', () => {
      currentLanguage = button.dataset.lang;
      document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      updateLanguageUI();
    });
  });
}

function updateLanguageUI() {
  const language = LANGUAGES[currentLanguage];
  $('language-title').textContent = language.title;
  $('prenatal-text').textContent = language.text;
}

function bindRecording() {
  $('start-record').addEventListener('click', startRecording);
  $('stop-record').addEventListener('click', stopRecording);
  $('delete-recording').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEYS.recording);
    lastRecordingBlob = null;
    $('recording-player').removeAttribute('src');
    $('recording-player').classList.add('hidden');
    updateSampleStatus();
    showToast('已删除爸爸声音样本');
  });
}

async function startRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
    showToast('当前浏览器不支持录音。请使用 iPhone Safari 或最新版 Chrome。');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = getSupportedMimeType();
    mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    recordingChunks = [];
    recordingStartTime = Date.now();

    mediaRecorder.addEventListener('dataavailable', event => {
      if (event.data && event.data.size > 0) recordingChunks.push(event.data);
    });

    mediaRecorder.addEventListener('stop', () => {
      const type = mediaRecorder.mimeType || 'audio/webm';
      const blob = new Blob(recordingChunks, { type });
      stream.getTracks().forEach(track => track.stop());
      saveRecording(blob);
    });

    mediaRecorder.start();
    $('start-record').disabled = true;
    $('stop-record').disabled = false;
    $('recording-indicator').classList.remove('hidden');
    startTimer();
    showToast('开始录音，请爸爸自然朗读 1–3 分钟');
  } catch (error) {
    console.error(error);
    showToast('无法使用麦克风。请到 iPhone 设置 → Safari → 麦克风，选择允许。');
  }
}

function getSupportedMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'];
  return types.find(type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || '';
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  $('start-record').disabled = false;
  $('stop-record').disabled = true;
  $('recording-indicator').classList.add('hidden');
  stopTimer();
}

function startTimer() {
  stopTimer();
  timerId = window.setInterval(() => {
    const total = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = String(Math.floor(total / 60)).padStart(2, '0');
    const seconds = String(total % 60).padStart(2, '0');
    $('recording-time').textContent = `${minutes}:${seconds}`;
  }, 500);
}

function stopTimer() {
  window.clearInterval(timerId);
  $('recording-time').textContent = '00:00';
}

function saveRecording(blob) {
  const reader = new FileReader();
  reader.onload = () => {
    const recording = {
      dataUrl: reader.result,
      type: blob.type,
      createdAt: new Date().toISOString(),
      duration: Math.round((Date.now() - recordingStartTime) / 1000)
    };
    localStorage.setItem(STORAGE_KEYS.recording, JSON.stringify(recording));
    lastRecordingBlob = blob;
    restoreRecording();
    showToast('爸爸声音样本已保存');
  };
  reader.readAsDataURL(blob);
}

function restoreRecording() {
  const recording = getRecording();
  if (!recording) {
    updateSampleStatus();
    return;
  }

  $('recording-player').src = recording.dataUrl;
  $('recording-player').classList.remove('hidden');
  dataUrlToBlob(recording.dataUrl, recording.type).then(blob => { lastRecordingBlob = blob; });
  updateSampleStatus();
}

function getRecording() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.recording)); } catch { return null; }
}

function updateSampleStatus() {
  const recording = getRecording();
  if (!recording) {
    $('sample-status').textContent = '还没有录入爸爸声音样本。';
    return;
  }
  const time = new Date(recording.createdAt).toLocaleString('zh-CN');
  $('sample-status').textContent = `已保存 1 条爸爸声音样本，时长约 ${recording.duration || 0} 秒，录入时间：${time}`;
}

function bindPlayback() {
  $('play-language').addEventListener('click', playCurrentLanguage);
  $('stop-speech').addEventListener('click', () => {
    window.speechSynthesis?.cancel();
    $('recording-player')?.pause();
  });
  $('ai-convert').addEventListener('click', () => {
    showToast('AI 爸爸音色多语言转换需要后端语音克隆服务，当前为本地演示版。');
  });
}

function playCurrentLanguage() {
  if (currentLanguage === 'zh') {
    const recording = getRecording();
    if (recording?.dataUrl) {
      const audio = new Audio(recording.dataUrl);
      audio.play()
        .then(() => recordPlayback('中文爸爸原声'))
        .catch(() => showToast('播放失败，请先点页面上的音频播放器试一次。'));
      return;
    }

    showToast('还没有爸爸录音，先用系统语音朗读中文文案。');
  }

  speakText(LANGUAGES[currentLanguage].text, LANGUAGES[currentLanguage].voiceLang);
  recordPlayback(LANGUAGES[currentLanguage].label);
}

function speakText(text, lang) {
  if (!('speechSynthesis' in window)) {
    showToast('当前浏览器不支持系统语音朗读。');
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.86;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find(voice => voice.lang?.toLowerCase().startsWith(lang.toLowerCase().slice(0, 2)));
  if (matchedVoice) utterance.voice = matchedVoice;

  window.speechSynthesis.speak(utterance);
}

function bindSettings() {
  $('settings-form').addEventListener('submit', event => {
    event.preventDefault();
    const settings = {
      babyName: $('baby-name').value.trim(),
      pregnancyWeek: $('pregnancy-week').value,
      dadName: $('dad-name').value.trim(),
      reminderTime: $('reminder-time').value,
      dadMessage: $('dad-message').value.trim(),
      firstSavedAt: getSettings().firstSavedAt || new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    updateStatsUI();
    showToast('设置已保存');
  });

  $('request-notification').addEventListener('click', async () => {
    if (!('Notification' in window)) {
      showToast('当前浏览器不支持网页提醒。');
      return;
    }
    const result = await Notification.requestPermission();
    showToast(result === 'granted' ? '提醒权限已开启' : '提醒权限未开启');
  });

  $('clear-data').addEventListener('click', () => {
    if (!confirm('确定清空 PapaVoice 本地数据吗？录音和设置都会删除。')) return;
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    restoreSettings();
    restoreRecording();
    updateStatsUI();
    showToast('已清空本地数据');
  });
}

function restoreSettings() {
  const settings = getSettings();
  $('baby-name').value = settings.babyName || '';
  $('pregnancy-week').value = settings.pregnancyWeek || '';
  $('dad-name').value = settings.dadName || '';
  $('reminder-time').value = settings.reminderTime || '20:30';
  $('dad-message').value = settings.dadMessage || '';
}

function getSettings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.settings)) || {}; } catch { return {}; }
}

function getStats() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.stats)) || {}; } catch { return {}; }
}

function recordPlayback(label) {
  const stats = getStats();
  stats.playCount = (stats.playCount || 0) + 1;
  stats.lastPlayAt = new Date().toISOString();
  stats.lastPlayLabel = label;
  localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats));
  updateStatsUI();
}

function updateStatsUI() {
  const stats = getStats();
  const settings = getSettings();
  const firstDate = settings.firstSavedAt ? new Date(settings.firstSavedAt) : null;
  const days = firstDate ? Math.max(1, Math.ceil((Date.now() - firstDate.getTime()) / 86400000)) : 0;

  $('stat-days').textContent = String(days);
  $('stat-plays').textContent = String(stats.playCount || 0);
  $('stat-last-play').textContent = stats.lastPlayAt ? new Date(stats.lastPlayAt).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }) : '暂无';
}

async function dataUrlToBlob(dataUrl, type) {
  const response = await fetch(dataUrl);
  return response.blob().then(blob => new Blob([blob], { type: type || blob.type }));
}

async function createVoiceProfile(recordingBlob) {
  if (!recordingBlob) throw new Error('Missing dad voice recording sample.');
  const formData = new FormData();
  formData.append('voiceSample', recordingBlob, 'dad-voice-sample.webm');
  const response = await fetch('/api/voice-profile', { method: 'POST', body: formData });
  if (!response.ok) throw new Error('Voice profile service is not available.');
  return response.json();
}

async function generateVoiceAudio(language, text, voiceProfileId) {
  const response = await fetch('/api/generate-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, text, voiceProfileId })
  });
  if (!response.ok) throw new Error('Voice generation service is not available.');
  return response.blob();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(error => {
      console.info('Service worker registration failed:', error);
    });
  }
}
