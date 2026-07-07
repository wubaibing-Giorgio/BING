(() => {
  const PROFILE_KEY = 'papavoice-voice-profile-v3';
  const SOURCES = [
    { type: '英文故事', title: 'Storynory - 儿童音频故事', description: '英文童话、神话、教育故事和诗歌音乐，适合做英文胎教故事素材入口。', url: 'https://www.storynory.com/' },
    { type: '多语言有声书', title: 'LibriVox - 公共领域有声书', description: '志愿者朗读的免费公共领域有声书，可按语言和主题寻找适合的轻柔内容。', url: 'https://librivox.org/' },
    { type: '胎教音乐', title: 'Musopen - 免版权古典音乐', description: '可按作曲家、乐器和情绪筛选古典音乐，适合寻找舒缓音乐。', url: 'https://musopen.org/music/' }
  ];
  document.addEventListener('DOMContentLoaded', () => {
    bindProfileButton();
    bindDisabledRenderButton();
    renderSources();
    updateProfileStatus();
  });
  function $(id) { return document.getElementById(id); }
  function toast(message) {
    const el = $('toast');
    if (!el) return alert(message);
    el.textContent = message;
    el.classList.remove('hidden');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.add('hidden'), 3200);
  }
  function getRecording() {
    try { return JSON.parse(localStorage.getItem('papavoice-dad-recording-v3') || localStorage.getItem('papavoice-dad-recording-v2')); } catch { return null; }
  }
  function bindProfileButton() {
    $('create-voice-profile')?.addEventListener('click', async () => {
      const recording = getRecording();
      if (!recording?.dataUrl) return toast('请先录入爸爸声音样本。');
      const button = $('create-voice-profile');
      button.disabled = true;
      button.textContent = '正在创建...';
      setProfileStatus('正在上传声音样本。');
      try {
        const blob = await dataUrlToBlob(recording.dataUrl, recording.type);
        const form = new FormData();
        form.append('voiceSample', blob, 'dad-voice-sample.webm');
        form.append('name', `PapaVoice ${Date.now()}`);
        const response = await fetch('/api/voice-profile', { method: 'POST', body: form });
        const payload = await safeJson(response);
        if (!response.ok) throw new Error(payload.error || '声音档案创建失败。');
        localStorage.setItem(PROFILE_KEY, JSON.stringify({ voiceId: payload.voiceId, createdAt: new Date().toISOString() }));
        updateProfileStatus();
        toast('声音档案已创建。');
      } catch (error) {
        setProfileStatus(error.message);
        toast(error.message || '创建失败：请确认 Vercel 环境变量已设置。');
      } finally {
        button.disabled = false;
        button.textContent = '创建 AI 爸爸声纹';
      }
    });
  }
  function bindDisabledRenderButton() {
    $('generate-ai-audio')?.addEventListener('click', () => {
      toast('生成外语爸爸音色需要安全的服务端语音生成接口；当前 PR 已加入后端部署基础和声音档案创建。');
    });
  }
  function renderSources() {
    const list = $('content-source-list');
    if (!list) return;
    list.innerHTML = SOURCES.map(source => `<article class="source-card"><span>${source.type}</span><strong>${source.title}</strong><p>${source.description}</p><a href="${source.url}" target="_blank" rel="noreferrer">打开内容网站</a></article>`).join('');
  }
  function setProfileStatus(text) {
    const el = $('voice-profile-status');
    if (el) el.textContent = text;
  }
  function updateProfileStatus() {
    let profile = null;
    try { profile = JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch {}
    setProfileStatus(profile?.voiceId ? `已创建声音档案：${profile.voiceId}` : '尚未创建 AI 爸爸声纹。部署到 Vercel 并设置环境变量后可用。');
  }
  async function dataUrlToBlob(dataUrl, type) {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new Blob([blob], { type: type || blob.type });
  }
  async function safeJson(response) { try { return await response.json(); } catch { return {}; } }
})();
