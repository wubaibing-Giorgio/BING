# 🎙️ PapaVoice - Prenatal Education with Voice Interactions

A mobile-first Progressive Web App (PWA) for prenatal education featuring voice recordings, playback, multilingual support, and offline capabilities.

## Features

✅ **Voice Recording**
- Real-time audio recording using MediaRecorder API
- Recording duration tracking
- Persistent storage of recordings in localStorage

✅ **Voice Playback**
- Play your recorded audio
- Play prenatal education content using Web Speech API
- Support for multiple audio formats

✅ **Multilingual Support**
- 🇨🇳 Chinese (中文)
- 🇺🇸 English
- 🇯🇵 Japanese (日本語)
- 🇰🇷 Korean (한국어)
- Instant language switching with full UI translation

✅ **Prenatal Content**
- Pre-written prenatal education scripts
- Text-to-speech synthesis
- Customizable content

✅ **Settings Management**
- Auto-play on load toggle
- Notification preferences
- Dark mode support
- Settings saved in localStorage

✅ **Statistics & History**
- Total play count tracking
- Recording count
- Last played timestamp and content
- Usage statistics view

✅ **PWA Capabilities**
- Service Worker for offline support
- App manifest for installability
- Responsive mobile-first design
- Install to home screen support

✅ **Data Management**
- Export data as JSON
- Clear all data functionality
- localStorage backup

## File Structure

```
papavoice/
├── index.html           # Main HTML file with UI structure and styles
├── script.js            # Core JavaScript functionality
├── manifest.json        # PWA manifest file
├── service-worker.js    # Service Worker for offline support
└── README.md           # This file
```

## Getting Started

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/wubaibing-Giorgio/BING.git
   cd BING
   ```

2. **Open in browser**
   - Simply open `papavoice/index.html` in your web browser
   - Or serve via a local HTTP server for full PWA functionality

3. **Install as PWA (Optional)**
   - On Chrome/Edge: Click "Install" button in address bar
   - On iOS: Use "Add to Home Screen" from Safari
   - On Android: Click "Install app" from Chrome menu

### Usage

#### Home Tab
- Select your preferred language (Chinese, English, Japanese, Korean)
- View prenatal education content
- Speak content using text-to-speech
- Play your latest recording

#### Record Tab
- Click "Start Recording" to begin capturing audio
- Recording timer shows elapsed time
- Click "Stop Recording" to save
- View all your recordings with timestamps
- Play or delete recordings

#### Statistics Tab
- View total play count
- See total number of recordings
- Check last played content and timestamp

#### Settings Tab
- Toggle auto-play on load
- Enable/disable notifications
- Toggle dark mode
- Export your data as JSON
- Clear all data (warning: irreversible)

## Technical Details

### Technologies Used
- **HTML5**: Semantic markup and structure
- **CSS3**: Modern responsive design with flexbox and grid
- **JavaScript (ES6+)**: Core functionality and state management
- **Web APIs**:
  - MediaRecorder API - Audio recording
  - Web Speech API - Text-to-speech synthesis
  - Service Worker API - Offline support
  - localStorage API - Data persistence
  - getUserMedia - Microphone access

### Browser Compatibility
- Chrome/Edge 80+
- Firefox 75+
- Safari 14+ (iOS)
- Samsung Internet 12+

### Required Permissions
- **Microphone**: For voice recording
- **Camera**: Not required
- **Location**: Not required
- **Storage**: localStorage only

## Data Storage

All data is stored locally in the browser's localStorage:
- `papavoice-recordings`: Array of recorded audio data
- `papavoice-stats`: Usage statistics (play count, last played)
- `papavoice-settings`: User preferences

**Important**: Data is NOT synced to any server and is device-specific.

## Offline Support

Once loaded, PapaVoice works offline thanks to Service Worker caching:
- All core files are cached on first load
- Recorded audio and data remain accessible
- Works without internet connection
- Sync data when back online

## Audio Recording Details

### Supported Formats
- WAV (primary)
- MP3 (with codec support)
- Opus (with codec support)

### Recording Limitations
- Maximum recording length: Limited by device storage and browser memory
- Audio quality: Depends on device microphone
- Sample rate: Typically 44.1kHz or 48kHz

## Privacy & Security

- ✅ All data stored locally
- ✅ No server communication
- ✅ No tracking or analytics
- ✅ No third-party dependencies
- ✅ No personal data collection

## Troubleshooting

### Recording Not Working
1. Check if microphone permission is granted
2. Try a different browser
3. Ensure HTTPS or localhost (required for getUserMedia)

### Storage Full
- Use "Clear All" in Settings
- Export data first if you want to backup
- Delete individual recordings

### PWA Not Installing
1. Must be served over HTTPS or localhost
2. Clear browser cache
3. Check browser console for errors

### Dark Mode Issues
- Some elements may not be properly inverted
- Use light mode as fallback
- Report on GitHub Issues

## Future Enhancements

- [ ] Cloud storage sync
- [ ] User accounts and authentication
- [ ] Sharing recordings with others
- [ ] Speech-to-text transcription
- [ ] Advanced audio editing
- [ ] Music background options
- [ ] Timer/reminder notifications
- [ ] Parental controls
- [ ] Analytics dashboard

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - Feel free to use for personal or commercial projects.

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation
- Review browser console for errors

## Changelog

### v1.0.0 (2026-07-04)
- Initial release
- Voice recording and playback
- 4-language support
- PWA capabilities
- Settings and statistics
- Offline support

---

**Made with ❤️ for prenatal education and family bonding**
