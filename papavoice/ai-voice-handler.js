// AI Voice Cloning Handler
// Handles communication with Vercel backend API

const AI_VOICE_CONFIG = {
    apiBaseUrl: '/api',
    languages: {
        'zh': { name: '中文', flag: '🇨🇳', code: 'zh-CN' },
        'en': { name: 'English', flag: '🇺🇸', code: 'en-US' },
        'it': { name: 'Italiano', flag: '🇮🇹', code: 'it-IT' },
        'fr': { name: 'Français', flag: '🇫🇷', code: 'fr-FR' }
    },
    recordingDuration: { min: 30, max: 60 }
};

let recordingBlob = null;
let voiceId = null;
let mediaRecorder = null;
let recordingChunks = [];
let recordingStartTime = null;
let recordingIntervalId = null;

// Initialize AI voice module
function initializeAIVoice() {
    checkAPIStatus();
    setupAIVoiceEventListeners();
}

// Check if backend API is configured
async function checkAPIStatus() {
    try {
        const response = await fetch(`${AI_VOICE_CONFIG.apiBaseUrl}/create-voice`, {
            method: 'HEAD'
        });
        
        const statusBox = document.getElementById('api-status-box');
        const statusText = document.getElementById('api-status-text');
        
        if (!response.ok && response.status !== 404) {
            statusBox.style.display = 'block';
            statusBox.className = 'warning-box';
            statusText.textContent = '⚠️ 当前未配置 AI 语音服务，无法进行真实声纹克隆。请配置 ELEVENLABS_API_KEY 环境变量。';
        } else {
            statusBox.style.display = 'none';
        }
    } catch (error) {
        console.log('API status check:', error);
    }
}

// Setup AI voice event listeners
function setupAIVoiceEventListeners() {
    document.getElementById('btn-start-record').addEventListener('click', startAIRecording);
    document.getElementById('btn-stop-record').addEventListener('click', stopAIRecording);
    document.getElementById('btn-upload-voice').addEventListener('click', uploadVoiceClone);
    document.getElementById('btn-generate-audio').addEventListener('click', generateMultilingualAudio);
    document.getElementById('message-input').addEventListener('input', updateCharCount);
}

// Start recording for voice cloning
async function startAIRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        recordingChunks = [];
        recordingStartTime = Date.now();
        
        mediaRecorder.addEventListener('dataavailable', (e) => {
            recordingChunks.push(e.data);
        });

        mediaRecorder.addEventListener('stop', () => {
            recordingBlob = new Blob(recordingChunks, { type: 'audio/wav' });
            displayRecordingPreview();
            stream.getTracks().forEach(track => track.stop());
        });

        mediaRecorder.start();
        updateRecordingUI(true);
        startRecordingTimer();
        
        document.getElementById('btn-start-record').disabled = true;
        document.getElementById('btn-stop-record').disabled = false;
    } catch (err) {
        console.error('Recording error:', err);
        showError('Unable to access microphone. Please check permissions.');
    }
}

// Stop recording
function stopAIRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        updateRecordingUI(false);
        clearRecordingTimer();
        document.getElementById('btn-start-record').disabled = false;
        document.getElementById('btn-stop-record').disabled = true;
    }
}

// Update recording UI
function updateRecordingUI(isRecording) {
    const indicator = document.getElementById('recording-indicator');
    if (isRecording) {
        indicator.style.display = 'flex';
    } else {
        indicator.style.display = 'none';
    }
}

// Recording timer
function startRecordingTimer() {
    let seconds = 0;
    recordingIntervalId = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        document.getElementById('recording-time').textContent = 
            `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }, 1000);
}

function clearRecordingTimer() {
    clearInterval(recordingIntervalId);
    document.getElementById('recording-time').textContent = '00:00';
}

// Display recording preview
function displayRecordingPreview() {
    const previewDiv = document.getElementById('recording-preview');
    const audioElement = document.getElementById('preview-audio');
    
    if (recordingBlob) {
        const audioUrl = URL.createObjectURL(recordingBlob);
        audioElement.src = audioUrl;
        previewDiv.style.display = 'block';
        
        // Show step 2
        showStep(2);
    }
}

// Upload voice and create clone
async function uploadVoiceClone() {
    if (!recordingBlob) {
        showError('Please record your voice first');
        return;
    }

    try {
        const btn = document.getElementById('btn-upload-voice');
        btn.disabled = true;
        btn.innerHTML = '<span class="loading"></span> Uploading...';
        
        const formData = new FormData();
        formData.append('audioData', recordingBlob);
        formData.append('voiceName', 'PapaVoice Clone');
        
        const response = await fetch(`${AI_VOICE_CONFIG.apiBaseUrl}/create-voice`, {
            method: 'POST',
            body: JSON.stringify({
                audioData: await blobToBase64(recordingBlob),
                voiceName: 'PapaVoice Clone'
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (response.ok && data.voiceId) {
            voiceId = data.voiceId;
            showSuccess('✅ Voice clone created successfully!\n Your voice ID: ' + voiceId.substring(0, 8) + '...');
            document.getElementById('upload-status').innerHTML = `<div class="success-box">✅ Voice clone created! ID: ${voiceId.substring(0, 8)}...</div>`;
            showStep(3);
        } else if (data.fallback) {
            showWarning('⚠️ ' + data.message);
            // Allow fallback to browser speech synthesis
        } else {
            showError('Failed to create voice clone: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Upload error:', error);
        showError('Upload failed: ' + error.message);
    } finally {
        const btn = document.getElementById('btn-upload-voice');
        btn.disabled = false;
        btn.innerHTML = '<span>☁️</span><span>Upload & Create Clone</span>';
    }
}

// Generate multilingual audio
async function generateMultilingualAudio() {
    const message = document.getElementById('message-input').value.trim();
    
    if (!message) {
        showError('Please enter your message');
        return;
    }

    if (!voiceId) {
        showError('Please upload your voice first');
        return;
    }

    try {
        const btn = document.getElementById('btn-generate-audio');
        btn.disabled = true;
        
        const resultsDiv = document.getElementById('audio-results');
        resultsDiv.innerHTML = '<div class="info-box">⏳ Generating audio in 4 languages...</div>';
        
        const audioResults = {};
        const languages = ['zh', 'en', 'it', 'fr'];
        let successCount = 0;
        
        for (const lang of languages) {
            try {
                const response = await fetch(`${AI_VOICE_CONFIG.apiBaseUrl}/generate-audio`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        text: message,
                        language: lang,
                        voiceId: voiceId
                    })
                });

                const data = await response.json();
                
                if (response.ok && data.audio) {
                    audioResults[lang] = data.audio;
                    successCount++;
                } else if (data.fallback) {
                    // Use browser speech synthesis as fallback
                    console.log('Using fallback for:', lang);
                }
            } catch (error) {
                console.error(`Error generating ${lang} audio:`, error);
            }
        }
        
        if (successCount > 0) {
            displayAudioResults(audioResults, message);
            showSuccess('✅ Audio generated successfully!');
        } else {
            showWarning('Could not generate audio. Please check your configuration.');
        }
    } catch (error) {
        console.error('Generation error:', error);
        showError('Failed to generate audio: ' + error.message);
    } finally {
        const btn = document.getElementById('btn-generate-audio');
        btn.disabled = false;
    }
}

// Display audio results
function displayAudioResults(audioResults, message) {
    const resultsDiv = document.getElementById('audio-results');
    resultsDiv.innerHTML = '';
    
    for (const [lang, audioData] of Object.entries(audioResults)) {
        const langInfo = AI_VOICE_CONFIG.languages[lang];
        const playerDiv = document.createElement('div');
        playerDiv.className = 'audio-player';
        playerDiv.innerHTML = `
            <div class="audio-language">${langInfo.flag} ${langInfo.name}</div>
            <audio controls style="width: 100%; margin: 10px 0;" src="${audioData}"></audio>
            <button class="download-btn" onclick="downloadAudio('${audioData}', '${lang}')">📥 Download ${langInfo.name}</button>
        `;
        resultsDiv.appendChild(playerDiv);
    }
}

// Download audio file
function downloadAudio(audioData, language) {
    const link = document.createElement('a');
    link.href = audioData;
    link.download = `papavoice-${language}-${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Helper functions

function showStep(stepNumber) {
    for (let i = 1; i <= 4; i++) {
        const section = document.getElementById(`step-${i}-section`);
        const box = document.getElementById(`step-${i}`);
        if (i === stepNumber) {
            section.style.display = 'block';
            box.classList.add('active');
            box.classList.remove('completed');
        } else if (i < stepNumber) {
            section.style.display = 'none';
            box.classList.remove('active');
            box.classList.add('completed');
        } else {
            section.style.display = 'none';
            box.classList.remove('active');
            box.classList.remove('completed');
        }
    }
}

function updateCharCount() {
    const input = document.getElementById('message-input');
    const count = document.getElementById('char-count');
    count.textContent = Math.min(input.value.length, 500);
    input.value = input.value.substring(0, 500);
}

function showSuccess(message) {
    console.log('✅', message);
    // Could add toast notification here
}

function showWarning(message) {
    console.warn('⚠️', message);
    // Could add toast notification here
}

function showError(message) {
    console.error('❌', message);
    alert('Error: ' + message);
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
