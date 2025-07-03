# MASTER-CHIEF - Advanced Sticker & Command Bot

A powerful W### Advanced FFmpeg Processing**: Uses ffmpeg-static and fluent-ffmpeg for reliable video to animated WebP conversion
- **Multi-tier Fallback System**: 
  - Three different FFmpeg methods cascade if previous ones fail
  - Video normalization for problematic sources
  - GIF intermediate conversion for maximum compatibility
- **Format Correction**: Automatically attempts to normalize corrupted or problematic video files
- **Temporary File Management**: Creates and cleans up temporary processing files automaticallyp bot built with Baileys that provides interactive features including static and animated sticker creation, command responses, and group chat support with advanced session management and error recovery.

## 🚀 Features

### Core Features
- **🔐 QR Code Authentication** - Secure WhatsApp Web authentication via QR code
- **💬 Smart Message Handling** - Responds to commands in both private and group chats with intelligent pattern matching
- **🎨 Advanced Sticker Creation** - Convert images to WebP stickers with automatic resizing
- **🎬 Animated Sticker Creation** - Convert videos and GIFs to animated WebP stickers with multi-tier fallback processing
- **👥 Group Chat Support** - Full functionality in WhatsApp groups with user mentions
- **🔄 Session Management** - Automatic session error handling and recovery
- **📱 Cross-Platform** - Works on Windows, macOS, and Linux
- **🤖 Flexible Greeting Detection** - Uses regex patterns to detect greetings in natural conversation
- **🖼️ Image Response System** - Sends image responses for invalid commands and inappropriate content
- **🛡️ Smart Content Filtering** - Focused bad word detection with minimal false positives
- **📊 Status Monitoring** - Real-time bot status and uptime tracking
- **🔔 Online/Offline Notifications** - Automatic status notifications when bot starts/stops

### Commands
- **`hi` / `hello`** - Get a personalized greeting (supports flexible patterns like "Hi I'm John", "Hello there", etc.)
- **`!sticker`** - Create static stickers from images (send image with caption or reply to image)
- **`!asticker`** - Create animated stickers from videos or GIFs (send video/GIF with caption or reply to video/GIF)
- **`!help` / `!commands`** - Display available commands and usage instructions
- **`!about`** - Get detailed information about bot features, terms & conditions, and developer details (includes image)
- **`!status`** - Check bot status, uptime, and system information
- **`!reset`** - Fix session errors and connectivity issues (private chat only)

**💡 Pro Tip**: You can test private chat commands by messaging your own number. The bot intelligently distinguishes between user commands and bot responses to prevent infinite loops.

### Smart Response System
- **Invalid Command Detection** - Automatically detects and responds to invalid commands (messages starting with `!` that aren't recognized)
- **Content Filtering** - Detects inappropriate language and responds with warnings
- **Image Responses** - Uses `src/chief.jpg` for invalid commands and `src/chief2.jpg` for content filtering responses
- **Fallback Messaging** - Text responses when image sending fails

### Sticker Creation Methods
1. **Static Stickers**:
   - **Direct Upload**: Send an image with `!sticker` as the caption
   - **Reply Method**: Reply to any image message with `!sticker`

2. **Animated Stickers**:
   - **Direct Upload**: Send a video or GIF with `!asticker` as the caption
   - **Reply Method**: Reply to any video or GIF message with `!asticker`
   - **Format Support**: MP4, 3GP, MKV, WebM, GIF, and most common video formats
   - **Resolution Requirement**: Source video should be at least 512x512 pixels (smaller videos may cause scaling issues)
   - **FFmpeg Processing**: Uses advanced scaling and padding filters with transparent background
   - **Multi-tier Conversion**: Uses three different FFmpeg methods with automatic fallback if any method fails
   - **Automatic Format Conversion**: Handles problematic or corrupted video files through normalization
   - **Error Handling**: Provides helpful error messages and fallback suggestions when conversion fails

3. **Advanced Features**:
   - **Silent Operation**: The sticker commands produce no response text - only functional when used with media
   - **Session Stability Check**: Bot warns users if session is unstable and defers sticker creation
   - **Error Recovery**: Comprehensive error handling with detailed user feedback
   - **Multiple Conversion Methods**: Cascading fallback methods ensure sticker creation even with difficult formats
   - **FFmpeg Compatibility Testing**: Includes test-ffmpeg.js script to check system compatibility

### Smart Sticker Creation Features
- **Enhanced Media Validation**: Validates media buffer size and metadata to prevent processing invalid files
- **Download Timeout Protection**: 30-second timeout for media downloads to prevent hanging
- **Comprehensive Error Handling**: Detailed error messages for invalid/corrupted media with helpful suggestions
- **Format Support**: 
  - **Static**: JPG, PNG, GIF, WebP, and other common image formats
  - **Animated**: MP4, 3GP, WebM, GIF, MKV and most common video formats
- **Size Optimization**: Automatic resizing to 512x512 for optimal WhatsApp compatibility
- **Advanced FFmpeg Processing**: Uses ffmpeg-static and fluent-ffmpeg for reliable video to animated WebP conversion
- **Multi-tier Fallback System**: 
  - Three different FFmpeg methods cascade if previous ones fail
  - Video normalization for problematic sources
  - GIF intermediate conversion for maximum compatibility
- **Format Correction**: Automatically attempts to normalize corrupted or problematic video files
- **Session-Aware Processing**: Defers processing during session instability to prevent errors

## 🛠️ Installation

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **WhatsApp Account** (for authentication)
- **FFmpeg** (automatically installed via ffmpeg-static dependency)

### Quick Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/PasinduOG/MASTER-CHIEF.git
   cd MASTER-CHIEF
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the bot**
   ```bash
   npm start
   ```

4. **Available NPM Scripts**
   ```bash
   npm start              # Start the bot normally
   npm run clear-sessions # Basic session cleanup
   npm run fix-sessions   # Quick session fix and restart
   npm run fix-bad-mac    # Aggressive cleanup for Bad MAC errors
   ```

5. **Ensure media files are present**
   - Make sure the `src` directory exists
   - Required image files:
     - `src/chief.jpg` - Used for invalid command responses
     - `src/chief2.jpg` - Used for content filtering responses
     - `src/chief3.jpg` - Used for !about command responses
   - Media file missing errors will fallback to text-only responses

6. **Authenticate with WhatsApp**
   - Scan the QR code displayed in terminal with your WhatsApp mobile app
   - Go to WhatsApp → Settings → Linked Devices → Link a Device
   - Scan the QR code to authenticate

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@whiskeysockets/baileys` | ^6.7.18 | WhatsApp Web API implementation |
| `sharp` | ^0.32.6 | High-performance image processing for static stickers |
| `ffmpeg-static` | ^5.2.0 | Static FFmpeg binaries for animated stickers (cross-platform) |
| `fluent-ffmpeg` | ^2.1.3 | Node.js interface for FFmpeg with simplified API |
| `qrcode-terminal` | ^0.12.0 | QR code display in terminal for authentication |
| `pino` | ^8.17.2 | Fast JSON logger for performance monitoring |
| `@hapi/boom` | ^10.0.1 | HTTP error objects for proper error handling |
| `dotenv` | ^17.0.1 | Environment variable management for configuration |

## 🔧 Configuration

### Online/Offline Notifications
To receive automatic status notifications when the bot starts or stops:

1. **Edit `index.js`** and find this line:
   ```javascript
   const NOTIFICATION_JID = '94760135744@s.whatsapp.net';
   ```

2. **Replace with your WhatsApp number** in the format: `countrycode+number@s.whatsapp.net`
   ```javascript
   // Examples:
   const NOTIFICATION_JID = '1234567890@s.whatsapp.net';     // US number: +1 234 567 890
   const NOTIFICATION_JID = '94771234567@s.whatsapp.net';    // Sri Lanka: +94 77 123 4567
   const NOTIFICATION_JID = '919876543210@s.whatsapp.net';   // India: +91 98765 43210
   ```

3. **To disable notifications**, set it to `null`:
   ```javascript
   const NOTIFICATION_JID = null;
   ```

### Environment Variables
The bot works out of the box with default settings. For advanced configuration, you can modify the following in `index.js`:

```javascript
// Session Management & Error Recovery
const maxReconnectAttempts = 5;        // Max reconnection attempts
const baseReconnectDelay = 5000;       // Base delay between reconnects (ms)
const maxSessionErrors = 10;           // Trigger cleanup after this many errors
const maxProtocolErrors = 10;          // Max protocol/stub message errors
const maxStaleClosures = 5;            // Max stale session closures

// Sticker Creation Settings
const stickerSize = 512;               // Sticker dimensions (512x512)
const stickerQuality = 80;             // WebP quality (0-100)
const downloadTimeout = 30000;         // Image download timeout (30 seconds)

// Content Filtering Settings
const badWordsPatterns = [...];        // Ultra-simplified array of exact word patterns
const imageResponsePath = 'src/chief.jpg'; // Image file for responses

// Session Stability Settings
let protocolErrorCount = 0;            // Tracks protocol/stub errors
let staleSessionCount = 0;             // Tracks stale session closures
let sessionErrorCount = 0;             // Tracks general session errors
let lastErrorTime = 0;                 // Tracks error timing patterns
```

### Browser Configuration
The bot identifies itself as:
- **Browser**: Chrome
- **Platform**: WhatsApp Bot
- **Version**: 1.0.0

## 💾 File Structure

```
MASTER-CHIEF/
├── index.js              # Main bot logic with advanced session management
├── clear-sessions.js     # Basic session cleanup utility
├── fix-sessions.js       # Quick session fix script 
├── fix-bad-mac.js        # Aggressive cleanup for Bad MAC errors
├── package.json          # Project dependencies and session management scripts
├── IMAGE_RESPONSE_UPDATE.md # Documentation on image response system
├── README.md             # Comprehensive documentation
├── src/                  # Media files
│   ├── chief.jpg         # Image file for invalid command responses
│   ├── chief2.jpg        # Image file for bad words warning responses
│   ├── chief3.jpg        # Image file for !about command
│   └── hey.mp4           # Previous video file (kept for reference)
├── temp/                 # Temporary directory for animated sticker processing (auto-created)
│   └── *                 # Temporary video/WebP files (auto-cleaned)
└── auth/                 # WhatsApp authentication data (auto-managed)
    ├── creds.json        # Authentication credentials
    ├── session-*.json    # Session files (auto-cleaned when corrupted)
    ├── pre-key-*.json    # Pre-shared keys (auto-managed)
    ├── sender-key-*.json # Sender encryption keys (auto-managed)
    └── app-state-*.json  # Application state sync files (auto-managed)
```

## 🎯 Usage Examples

### Basic Commands
```
User: hi
Bot: Hello! My name is MASTER-CHIEF. How can I help you?

User: Hi I'm Pasindu
Bot: Hello! My name is MASTER-CHIEF. How can I help you?

User: Hello there everyone
Bot: Hello! My name is MASTER-CHIEF. How can I help you?

User: !help
Bot: 🤖 Bot Commands:
     • hi or hello - Get greeting (flexible patterns supported)
     • !sticker - Create sticker from image
     • !help - Show this help menu
     • !about - Bot info, features & developer details
     ...

User: !about
Bot: [Sends chief3.jpg image] + 🤖 MASTER-CHIEF - About
     ✨ Features: Advanced sticker creation, smart content filtering...
     👨‍💻 Developer: Pasindu Madhuwantha (Pasindu OG)
     GitHub: @PasinduOG
     ...

User: !status
Bot: 🤖 MASTER-CHIEF Status Report
     🟢 Status: Online & Active
     ⏰ Uptime: 2h 15m 30s
     📊 Session Errors: 0/10
     📡 Protocol Errors: 0/10
     🔄 Stale Sessions: 0/5
     ✅ All systems operational!

User: [during session instability]
Bot: ⚠️ Session is currently unstable. Command processing is temporarily deferred.
     Please wait for the session to stabilize, or try the !reset command.

User: !invalidcommand
Bot: [Sends chief.jpg image] + "❌ Invalid command! Use !help to see available commands."

User: [inappropriate content]
Bot: [Sends chief.jpg image] + "⚠️ Please maintain respectful language in our chat."
```

### Automatic Status Notifications
The bot automatically sends status messages when configured:

```
When Bot Starts:
🟢 MASTER-CHIEF is Now Online

✅ Status: Connected to WhatsApp
🕐 Time: 07/02/2025, 10:30:45 AM
🤖 System: All features operational
🔧 Session: Fresh and ready

Ready to serve! Send commands to interact.

When Bot Stops:
🔴 MASTER-CHIEF is Now Offline

⏹️ Status: Disconnected from WhatsApp
🕐 Time: 07/02/2025, 02:15:20 PM
🛑 System: Bot stopped
💤 Mode: Standby

Bot will be back soon! Wait for reconnection.
```

### Sticker Creation Examples

#### Static Stickers
```
User: !sticker
Bot: [No response - silent command]

Method 1: Send image with caption "!sticker"
Bot: 🎨 Creating sticker... Please wait!
Bot: [Sends converted WebP sticker]

Method 2: Reply to any image with "!sticker"
Bot: 🎨 Creating sticker from replied image... Please wait!
Bot: [Sends converted WebP sticker]
```

#### Animated Stickers
```
Method 1: Send video/GIF with caption "!asticker"
Bot: 🎬 Creating animated sticker... Please wait!
Bot: [Sends animated WebP sticker]

Method 2: Reply to video/GIF with "!asticker"
Bot: 🎬 Creating animated sticker from replied video... Please wait!
Bot: [Sends animated WebP sticker]
```

#### Error Handling Examples
```
Session Instability:
Bot: ⚠️ Session is currently unstable. Sticker creation is temporarily deferred.
     Please wait for the session to stabilize, or try the !reset command.

Static Sticker Errors:
Bot: ❌ Failed to download image. Please try again with a valid image.
Bot: ❌ Invalid image format or corrupted file. Please send a valid JPG, PNG, or GIF.
Bot: ❌ Image processing failed. The file might be too large or corrupted.

Animated Sticker Errors:
Bot: ❌ Failed to create animated sticker: FFmpeg conversion error.
Bot: ❌ Failed to create animated sticker: Video format not supported.
Bot: ❌ Failed to create animated sticker: Video buffer too small, likely corrupted.
Bot: ❌ Failed to create animated sticker: FFmpeg binary not found. Please ensure ffmpeg-static is properly installed.
Bot: ❌ Failed to create animated sticker: [Parsed_crop_1 @ 0000025d9acd8a00] Invalid too big or non positive size for width '512' or height '512'
     (This occurs when the source video is too small - use a larger video with resolution of at least 512x512)
Bot: ❌ Tip: Try sending the video directly with "!asticker" as caption instead.
```

### Group Chat Features
- **User Mentions**: Bot mentions users in group responses
- **Group-Aware Help**: Different help messages for groups vs private chats
- **Admin Commands**: Some commands restricted to private chats for security

## 🔄 Advanced Session Management

### Intelligent Error Recovery System
The bot features a sophisticated session management system with aggressive error detection and automatic recovery:

#### Real-Time Session Monitoring
- **Protocol/Stub Message Detection**: Tracks "Skipping protocol/stub message" errors
- **Stale Session Monitoring**: Detects "Closing stale open session" warnings
- **Session Corruption Detection**: Monitors "Bad MAC" and decryption failures
- **Automatic Error Counting**: Global counters track session instability patterns

#### Aggressive Auto-Recovery
- **Stability Thresholds**: 
  - **10+ protocol/stub errors** in short timeframe → triggers cleanup
  - **5+ stale session closures** in short timeframe → triggers cleanup
  - **10+ general session errors** → triggers cleanup
- **Forced Session Cleanup**: Automatically removes corrupted files when thresholds are exceeded
- **Smart Restart Logic**: Restarts bot connection after cleanup
- **Console Override Monitoring**: Intercepts console output to detect session errors in real-time

#### Session Stability Checks
- **Command Deferral**: Bot warns users and defers command processing during session instability
- **Stability Validation**: Checks session health before processing any commands
- **User Notifications**: Informs users when the session is unstable and commands are temporarily unavailable

### Available Session Management Scripts

#### Quick Session Fix
```bash
# Quick session cleanup and restart (recommended)
npm run fix-sessions
```

#### Emergency Bad MAC Cleanup
```bash
# Aggressive cleanup for persistent "Bad MAC" errors
npm run fix-bad-mac
```

#### Manual Session Reset Options
```bash
# Option 1: Use the bot command (private chat only)
!reset

# Option 2: Basic session cleanup
npm run clear-sessions
# or
node clear-sessions.js

# Option 3: Full manual cleanup
rm -rf auth/session-*
rm -rf auth/sender-key-*
rm -rf auth/app-state-*
rm -rf auth/pre-key-*

# Option 4: Nuclear option (complete re-authentication required)
rm -rf auth/
```

## 🚨 Troubleshooting

### Common Issues

**1. QR Code Won't Display**
```bash
# Clear terminal and restart
clear && npm start
```

**2. Session Conflicts**
```
Error: Stream Errored (conflict)
```
- Close other WhatsApp Web sessions in browsers
- Use `!reset` command or `node clear-sessions.js`
- Restart the bot

**3. Static Sticker Creation Fails**
- Ensure image is valid (JPG, PNG, etc.)
- Check image file size (< 10MB recommended)
- Verify Sharp installation: `npm list sharp`

**4. Animated Sticker Creation Issues**
- **Video Requirements**:
  - Recommended resolution: At least 512x512 pixels
  - Maximum duration: 5 seconds (longer videos will be trimmed)
  - Supported formats: MP4, WebM, GIF (others may work)
  - File size: Less than 8MB recommended
- **FFmpeg Compatibility**:
  - Ensure FFmpeg is properly installed: `ffmpeg -version` in terminal
  - The bot will automatically try multiple methods if one fails
  - Multi-tier fallback system: libwebp_anim → webp → GIF intermediate → fluent-ffmpeg
- **Testing FFmpeg Compatibility**:
  - Run the included FFmpeg compatibility test script:
    ```bash
    npm run test-ffmpeg
    ```
  - This script will check which pad filter options work on your system
  - It creates test files in the temp directory to verify compatibility
  - Results help diagnose issues with animated sticker creation
  - Run the test script: `npm run test-ffmpeg`
- **Manually Creating Compatible Videos**:
  - Pre-process your video to 512x512 before uploading
  - With preserved aspect ratio: `ffmpeg -i input.mp4 -vf "scale='min(512,iw)':'min(512,ih)':force_original_aspect_ratio=decrease,fps=12" -q:v 50 -compression_level 6 output.webp`
  - For square format (legacy): `ffmpeg -i input.mp4 -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512,setsar=1,fps=12" -q:v 50 -compression_level 6 output.webp`

**3a. Animated Sticker Creation Fails**
- Ensure FFmpeg is properly installed: `npm list ffmpeg-static fluent-ffmpeg`
- Try with shorter videos (< 10 seconds)
- Check video format compatibility (MP4 works best)
- For GIFs, ensure they're standard format

**3b. Aspect Ratio Preservation for Animated Stickers**
- The bot now preserves the original aspect ratio of videos when creating animated stickers
- Videos are no longer forced into a square format with black padding
- The maximum dimension is limited to 512px while maintaining the original proportions
- To test different aspect ratios, run: `npm run test-aspect-ratio`
- You can manually test other filter syntaxes with: `npm run test-ffmpeg`

**3c. Stickers Are Too Large and Cannot Be Sent**
- WhatsApp has a size limit of approximately 500KB for animated stickers
- The latest version optimizes stickers with these settings:
  - Reduced quality (`-q:v 50` instead of 80)
  - Lower frame rate (12fps)
  - Shorter duration (3 seconds max)
  - Increased compression (`-compression_level 6`)
- If stickers are still too large, you can further reduce quality in index.js (try `-q:v 40` or lower)
- Try direct upload with caption instead of reply method
- Check temp directory permissions in project folder

**3b. FFmpeg Video Processing Errors**
- **Error: "Invalid too big or non positive size for width '512' or height '512'"**:
  - This occurs with very small videos (less than 512px)
  - Solution: Try using a larger resolution video (at least 512x512)
  - Alternative: Try a different video source with higher resolution
  - Workaround: Direct upload method sometimes handles small videos better than reply method

- **Error: "No option name near '0x00000000'" or "No option name near 'black@0'" or "No option name near 'black'" or "Error parsing a filter description"**:
  - This occurs when your FFmpeg version doesn't support certain color format syntax in the padding filter
  - Solution: The bot now omits the color parameter entirely for maximum compatibility
  - Different FFmpeg versions have different requirements for color format: some support `color=0x00000000`, `color=black@0`, or `color=black`
  - If you're still seeing this error, update the bot to the latest version
  - Alternative: Try a different video or use the !reset command to clear any caches

**4. Bot Not Responding**
- Check console for error messages
- Verify WhatsApp connection status
- Try `!reset` to clear sessions

**5. Bad MAC Errors & Session Corruption**
```
Error: Bad MAC
Failed to decrypt message with any known session
Session error:Error: Bad MAC at Object.verifyMAC
Skipping protocol/stub message
Closing stale open session
```
- **Emergency Fix**: Use `npm run fix-bad-mac` for immediate aggressive cleanup
- **Quick Fix**: Use `npm run fix-sessions` for standard session recovery
- **Bot Command**: Use `!reset` command in private chat
- **Manual Fix**: `node clear-sessions.js` then restart
- **Nuclear Option**: Delete entire `auth` folder and re-authenticate

**6. Session Instability Warnings**
```
⚠️ Session is currently unstable. Command processing is temporarily deferred.
Please wait for the session to stabilize, or try the !reset command.
```
- **Automatic Recovery**: Bot monitors and attempts auto-recovery
- **User Action**: Wait for stability or use `!reset` command
- **Manual Intervention**: Use `npm run fix-sessions` if automatic recovery fails

**7. Protocol/Stub Message Errors**
```
Skipping protocol/stub message: too many errors
```
- **Automatic Handling**: Bot counts these errors and triggers cleanup at threshold
- **User Action**: No immediate action needed - bot handles automatically
- **Manual Override**: Use `npm run fix-sessions` if issues persist

**8. Private Chat Commands Not Working**
- Ensure you're messaging the bot directly (not in a group)
- Check that the bot shows as "online" or "last seen recently"
- Verify the phone number used to authenticate the bot
- Try restarting the bot with `npm start`
- Check console logs for debugging information

**9. Video Responses Not Working**
- Ensure `src/chief.jpg` file exists in the project directory
- Check video file permissions and size
- Verify Sharp installation for video processing
- Monitor console logs for video sending errors

### Error Codes & Recovery Solutions

| Error | Cause | Automatic Recovery | Manual Solution |
|-------|-------|-------------------|-----------------|
| `Bad MAC Error` | Cryptographic session corruption | ✅ Auto-cleanup at threshold | `npm run fix-bad-mac` or `!reset` |
| `Failed to decrypt message` | Session key mismatch | ✅ Auto-cleanup at threshold | `npm run fix-bad-mac` |
| `verifyMAC error` | Authentication failure | ✅ Auto-cleanup at threshold | Clear all session files and restart |
| `Skipping protocol/stub message` | Session communication errors | ✅ Auto-counted and handled | Automatic at 10+ errors |
| `Closing stale open session` | Session lifecycle issues | ✅ Auto-counted and handled | Automatic at 5+ closures |
| `Stream Errored (conflict)` | Multiple sessions | ❌ Manual intervention | Close other WhatsApp Web tabs |
| `Connection timeout` | Network issues | ✅ Auto-reconnect with backoff | Check internet connection |
| `Image sending failed` | Media file issues | ❌ Manual intervention | Check `src/chief.jpg` exists |
| `Content filtering error` | Pattern matching issues | ❌ Manual intervention | Check console logs |
| `FFmpeg not found` | Missing FFmpeg dependency | ❌ Manual intervention | Reinstall dependencies: `npm install` |
| `FFmpeg conversion error` | Video format issues | ✅ Auto-fallback methods | Try different video format or encoding |
| `Video buffer too small` | Corrupted video file | ❌ Manual intervention | Try a different video source |
| `Invalid too big or non positive size for width/height` | Low resolution video | ❌ Manual intervention | Use video with resolution ≥ 512x512 |
| `No option name near '0x00000000'` or `'black@0'` or `'black'` | FFmpeg pad filter color format incompatibility | ✅ Auto-fixed in latest version | Now omitting color parameter entirely |
| `Animated sticker creation failed` | Multiple potential causes | ✅ Multi-tier fallback system | Try direct upload with `!asticker` caption |
| `Session unstable` | Multiple error conditions | ✅ Auto-deferral and recovery | Use `npm run fix-sessions` |
| `Commands deferred` | Session instability | ✅ Auto-recovery in progress | Wait or use `!reset` command |

## 🔒 Security Features

- **Authentication Required**: Only authenticated WhatsApp accounts can use the bot
- **Group Safety**: Restricted commands in group chats
- **Session Isolation**: Each bot instance maintains separate authentication
- **Auto-Call Rejection**: Automatically rejects incoming calls to prevent issues
- **Rate Limiting**: Built-in delays and retry logic to prevent spam
- **Content Filtering**: Smart detection of inappropriate language with focused filtering to minimize false positives
- **Command Validation**: Invalid commands are detected and handled gracefully

## 🛡️ Content Filtering System

### Smart Bad Word Detection
The bot includes an ultra-simplified content filtering system designed to maintain respectful conversations while minimizing false positives:

- **Ultra-Focused Detection**: Only detects the most explicit and clearly offensive terms
- **Exact Word Matching**: Uses precise word boundaries to prevent false positives
- **Multi-Language Support**: Detects inappropriate content in both English and Sinhala
- **Image Response**: Responds with `src/chief.jpg` image plus warning message
- **Minimal False Positives**: Extremely conservative approach to avoid flagging normal conversation

### Filtering Features
- **Core Profanity**: Only the most explicit terms (fuck, fucking, bitch)
- **Sinhala Terms**: Most offensive Sinhala words (pako, wesiya, hutto)
- **Clear Acronyms**: Only obvious inappropriate acronyms (WTF)
- **Exact Matching**: Uses word boundaries (`\b`) for precise detection
- **No Complex Processing**: Simplified to reduce false positive rates

### Response Behavior
1. **Detection**: When inappropriate content is detected
2. **Image Response**: Sends `chief.jpg` image file
3. **Warning Message**: Adds appropriate warning text
4. **Graceful Fallback**: Falls back to text-only warning if video fails
5. **Console Logging**: Logs detection events for monitoring

## 🔍 Advanced Session Monitoring

### Real-Time Session Health Tracking
The bot continuously monitors session health through multiple mechanisms:

#### Console Output Analysis
- **Error Pattern Detection**: Monitors console output for session-related errors
- **Real-Time Counting**: Tracks error frequencies and patterns
- **Automated Response**: Triggers cleanup when error thresholds are exceeded

#### Session Stability Indicators
- **Protocol Error Counter**: Tracks "Skipping protocol/stub message" occurrences
- **Stale Session Counter**: Monitors "Closing stale open session" events
- **General Error Counter**: Tracks all session-related errors
- **Stability State**: Determines if session is stable enough for command processing

#### Intelligent Recovery Actions
- **Threshold-Based Cleanup**: Automatically triggers session cleanup at configured limits
- **User Communication**: Warns users during session instability
- **Command Deferral**: Temporarily postpones command processing during recovery
- **Automatic Restart**: Restarts bot connection after successful cleanup

#### Session Health Reporting
The `!status` command now provides comprehensive session health information:
- Current error counts for all monitored categories
- Session stability status
- Uptime and operational status
- System health indicators

## 🌟 Advanced Features

### Background Process Management
```bash
# Run bot in background (Linux/macOS)
nohup npm start &

# Run bot as Windows service
# Use pm2 or similar process manager
npm install -g pm2
pm2 start index.js --name "whatsapp-bot"
```

### Logging and Monitoring
- **Console Logging**: Detailed console output with emojis
- **Error Tracking**: Comprehensive error logging and stack traces
- **Connection Status**: Real-time connection state monitoring
- **Message Analytics**: Logs all processed messages and commands

### Customization Options
- **Custom Greeting**: Modify greeting message in the code
- **Additional Commands**: Easy to add new bot commands
- **Sticker Settings**: Adjustable size, quality, and format options
- **Group Permissions**: Configurable command restrictions

## 📈 Performance

- **Memory Efficient**: Optimized for long-running processes
- **Fast Image Processing**: Uses Sharp for high-performance image conversion
- **Minimal WhatsApp API Usage**: Optimized to reduce API calls
- **Automatic Cleanup**: Prevents memory leaks with proper connection management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit changes: `git commit -m "Add feature description"`
5. Push to branch: `git push origin feature-name`
6. Create a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## ⚠️ Disclaimer

This bot is for educational and personal use only. Please respect WhatsApp's Terms of Service and use responsibly. The developers are not responsible for any misuse or policy violations.

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review console logs for error details
3. Try manual session reset procedures
4. Create an issue with detailed error information

---

**Made with ❤️ by Pasindu Madhuwantha**

*For updates and more projects, follow the repository!*
