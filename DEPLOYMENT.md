# Deployment Guide - PapaVoice AI Voice Cloning

## Quick Start

### Prerequisites
- Node.js 14+
- Vercel CLI (`npm install -g vercel`)
- ElevenLabs API key

### Step 1: Get ElevenLabs API Key

1. Visit [ElevenLabs](https://elevenlabs.io)
2. Sign up for free account
3. Go to Settings > API Keys
4. Copy your API key

### Step 2: Local Development

```bash
# Clone repository
git clone https://github.com/wubaibing-Giorgio/BING.git
cd BING

# Install dependencies
npm install

# Create .env.local
echo "ELEVENLABS_API_KEY=your_api_key_here" > .env.local

# Run local development server
vercel dev
```

Access at `http://localhost:3000/papavoice/index.html`

### Step 3: Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

#### Option B: Using GitHub Integration

1. Push code to GitHub branch
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New Project"
4. Select your GitHub repository
5. Configure environment variables
6. Click "Deploy"

### Step 4: Configure Environment Variables on Vercel

1. Go to Vercel Dashboard > Your Project > Settings
2. Click "Environment Variables"
3. Add new variable:
   - Key: `ELEVENLABS_API_KEY`
   - Value: Your API key from Step 1
   - Environments: Select Production, Preview, Development
4. Click "Save"

### Step 5: Redeploy

After adding environment variables, redeploy:

```bash
vercel --prod
```

## Production Access

Your app will be available at:
```
https://your-project.vercel.app/papavoice/index.html
```

## Troubleshooting

### API returns 503 Service Unavailable

**Problem:** AI voice service not configured

**Solution:**
- Check `ELEVENLABS_API_KEY` is set in environment variables
- Verify API key is valid
- Redeploy after changing variables: `vercel --prod`

### Audio generation times out

**Problem:** Function execution exceeds 5 second default

**Solution:**
- Set `maxDuration` in `vercel.json` (already configured to 300s)
- Redeploy

### CORS errors in browser

**Problem:** Frontend cannot call backend API

**Solution:**
- Ensure API endpoints are served from `/api/` path
- Check CORS headers in API functions
- Verify frontend is calling correct API URL

## GitHub Pages Deployment (Frontend Only)

For static frontend without AI features:

```bash
# Build frontend
mkdir -p public/papavoice
cp papavoice/* public/papavoice/

# Push to gh-pages branch
gh-pages -d public
```

Access at: `https://wubaibing-giorgio.github.io/BING/papavoice/index.html`

## Monitoring & Debugging

### View Vercel Logs

```bash
# Real-time logs
vercel logs

# Specific function logs
vercel logs api/create-voice
```

### Check Deployment Status

```bash
# List recent deployments
vercel ls

# View specific deployment
vercel inspect <deployment-url>
```

## Optimization Tips

1. **API Key Security:**
   - Never commit `.env.local` to Git
   - Always use Vercel Environment Variables in production
   - Rotate API keys regularly

2. **Performance:**
   - Enable Vercel Analytics: `vercel analytics enable`
   - Monitor function execution time
   - Consider caching voice IDs in database

3. **Cost Optimization:**
   - ElevenLabs: Monitor API usage
   - Vercel: Free tier covers most needs
   - Set up billing alerts on both platforms

## Rollback

If deployment has issues:

```bash
# View deployment history
vercel ls

# Rollback to previous version
vercel rollback
```

## Support

- Vercel: https://vercel.com/help
- ElevenLabs: https://elevenlabs.io/docs
- GitHub Issues: Report bugs

## Next Steps

1. Configure CI/CD pipeline
2. Set up error tracking (Sentry)
3. Add analytics (Vercel Analytics)
4. Create backup/restore functionality
5. Set up database for persistent voice IDs
