# PapaVoice AI - AI Voice Cloning Prenatal Education

## Overview

PapaVoice AI is an upgraded version featuring **real AI voice cloning** with **4-language (中文, English, Italiano, Français) support** using ElevenLabs API for authentic voice synthesis.

## Key Features

✨ **AI Voice Cloning**
- Record dad's voice (30-60 seconds)
- Upload to backend to create voice clone
- AI-generated voice synthesis in 4 languages

🌍 **Multilingual Support**
- 🇨🇳 Chinese (中文)
- 🇺🇸 English
- 🇮🇹 Italian (Italiano)
- 🇫🇷 French (Français)

🎤 **Voice Recording**
- Real-time audio recording
- Recording preview
- Audio download support

📱 **Mobile-First Design**
- Responsive PWA
- Touch-friendly interface
- Offline support

## Project Structure

```
papavoice/
├── index.html              # Main HTML with AI voice UI
├── script.js               # Original scripts (demo mode fallback)
├── ai-voice-handler.js     # AI voice cloning handler
├── manifest.json           # PWA manifest
├── service-worker.js       # Service worker
└── README.md              # Documentation

api/
├── create-voice.js         # Vercel Function: Create voice clone
└── generate-audio.js       # Vercel Function: Generate multilingual audio
```

## Setup Instructions

### 1. Environment Configuration

Create `.env.local` in your project root:

```bash
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Local Development

```bash
# Run Vercel Functions locally
vercel dev

# Or use Netlify
netlify dev
```

### 4. Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

### 5. Set Environment Variables on Vercel

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add: `ELEVENLABS_API_KEY` = your API key
4. Redeploy

## Backend API Endpoints

### POST `/api/create-voice`

Create or upload a voice for cloning.

**Request:**
```json
{
  "audioData": "data:audio/wav;base64,...",
  "voiceName": "PapaVoice Clone"
}
```

**Response:**
```json
{
  "status": "success",
  "voiceId": "voice_xyz123",
  "voiceName": "PapaVoice Clone"
}
```

### POST `/api/generate-audio`

Generate audio in target language using cloned voice.

**Request:**
```json
{
  "text": "亲爱的宝宝，爸爸想对你说...",
  "language": "en",
  "voiceId": "voice_xyz123"
}
```

**Response:**
```json
{
  "status": "success",
  "audio": "data:audio/mpeg;base64,...",
  "language": "en",
  "duration": 45
}
```

## Frontend Usage

### Step 1: Record Voice
1. Click "Start" button to begin recording
2. Speak clearly (30-60 seconds recommended)
3. Click "Stop" to finish recording

### Step 2: Upload Voice Clone
1. Click "Upload & Create Clone"
2. Wait for voice clone creation
3. Your voice ID will be displayed

### Step 3: Enter Message
1. Type your message in Chinese (max 500 characters)
2. Message will be translated to 4 languages

### Step 4: Generate Audio
1. Click "Generate Multilingual Audio"
2. Wait for audio generation in all 4 languages
3. Play or download each language version

## Fallback Mode

If `ELEVENLABS_API_KEY` is not configured:
- AI voice cloning features show warning
- Original demo mode with browser Speech Synthesis available
- Users can still use prenatal education features

## Technical Stack

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Backend:** Vercel Functions (Node.js)
- **Voice API:** ElevenLabs API
- **Storage:** Browser localStorage + Vercel KV (optional)
- **PWA:** Service Worker, Web App Manifest

## API Key Setup

1. Sign up at [ElevenLabs](https://elevenlabs.io)
2. Get your API key from account settings
3. Add to environment variables (see Setup)

## File Size Limits

- Recording: Max 60 seconds ≈ 1-2 MB
- API: ElevenLabs supports up to 20MB per request

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ⚠️ Limited (older versions may lack MediaRecorder)
- iOS Safari: ⚠️ Limited microphone access

## Troubleshooting

### "Microphone permission denied"
- Check browser permissions
- Use HTTPS in production
- Try a different browser

### "API service not configured"
- Verify `ELEVENLABS_API_KEY` is set
- Check Vercel environment variables
- Restart deployment after adding key

### "Audio generation failed"
- Check voice ID is valid
- Verify message length (max 500 chars)
- Check API rate limits

## License

MIT

## Support

For issues or questions, please open a GitHub issue.
