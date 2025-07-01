# DEV~BOT - Advanced Sticker & Command Bot

A robust WhatsApp bot built with Baileys that provides interactive features including sticker creation, command responses, and group chat support with advanced session management and error recovery.

## 🚀 Features

### Core Features
- **🔐 QR Code Authentication** - Secure WhatsApp Web authentication via QR code
- **💬 Smart Message Handling** - Responds to commands in both private and group chats with intelligent pattern matching
- **🎨 Advanced Sticker Creation** - Convert images to WebP stickers with automatic resizing
- **👥 Group Chat Support** - Full functionality in WhatsApp groups with user mentions
- **🔄 Session Management** - Automatic session error handling and recovery
- **📱 Cross-Platform** - Works on Windows, macOS, and Linux
- **🤖 Flexible Greeting Detection** - Uses regex patterns to detect greetings in natural conversation
- **🎥 Video Response System** - Sends video responses for invalid commands and inappropriate content
- **🛡️ Smart Content Filtering** - Focused bad word detection with minimal false positives

### Commands
- **`hi` / `hello`** - Get a personalized greeting (supports flexible patterns like "Hi I'm John", "Hello there", etc.)
- **`!sticker`** - Create stickers from images (see sticker creation methods below)
- **`!help` / `!commands`** - Display available commands and usage instructions
- **`!about`** - Get detailed information about bot features, terms & conditions, and developer details
- **`!reset`** - Fix session errors and connectivity issues (private chat only)

### Smart Response System
- **Invalid Command Detection** - Automatically detects and responds to invalid commands (messages starting with `!` that aren't recognized)
- **Content Filtering** - Detects inappropriate language and responds with warnings
- **Video Responses** - Uses `src/hey.mp4` for both invalid commands and content filtering responses
- **Fallback Messaging** - Text responses when video sending fails

### Sticker Creation Methods
1. **Direct Upload**: Send an image with `!sticker` as the caption
2. **Reply Method**: Reply to any image message with `!sticker`
3. **Supported Formats**: JPG, PNG, GIF, WebP, and other common image formats

## 🛠️ Installation

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **WhatsApp Account** (for authentication)

### Quick Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/PasinduOG/DEV-BOT.git
   cd DEV-BOT
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the bot**
   ```bash
   npm start
   ```

4. **Ensure media files are present**
   - Verify `src/hey.mp4` exists for video responses
   - This file is used for invalid commands and content filtering responses

5. **Authenticate with WhatsApp**
   - Scan the QR code displayed in terminal with your WhatsApp mobile app
   - Go to WhatsApp → Settings → Linked Devices → Link a Device
   - Scan the QR code to authenticate

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@whiskeysockets/baileys` | ^6.7.18 | WhatsApp Web API implementation |
| `sharp` | ^0.32.6 | High-performance image processing for stickers |
| `qrcode-terminal` | ^0.12.0 | QR code display in terminal |
| `pino` | ^8.17.2 | Fast JSON logger |
| `@hapi/boom` | ^10.0.1 | HTTP error objects |

## 🔧 Configuration

### Environment Variables
The bot works out of the box with default settings. For advanced configuration, you can modify the following in `index.js`:

```javascript
// Connection settings
const maxReconnectAttempts = 5;        // Max reconnection attempts
const baseReconnectDelay = 5000;       // Base delay between reconnects (ms)
const maxSessionErrors = 10;           // Clear sessions after this many errors

// Sticker settings
const stickerSize = 512;               // Sticker dimensions (512x512)
const stickerQuality = 80;             // WebP quality (0-100)

// Content filtering settings
const badWordsPatterns = [...];        // Array of regex patterns for content filtering
const videoResponsePath = 'src/hey.mp4'; // Video file for responses
```

### Browser Configuration
The bot identifies itself as:
- **Browser**: Chrome
- **Platform**: WhatsApp Bot
- **Version**: 1.0.0

## 💾 File Structure

```
DEV-BOT/
├── index.js              # Main bot logic and event handlers
├── clear-sessions.js     # Utility script for manual session cleanup
├── package.json          # Project dependencies and scripts
├── README.md            # This documentation
├── src/                 # Media files
│   └── hey.mp4          # Video file for responses (invalid commands & content filtering)
└── auth/               # WhatsApp authentication data (auto-generated)
    ├── creds.json      # Authentication credentials
    └── session-*.json  # Session files (auto-managed)
```

## 🎯 Usage Examples

### Basic Commands
```
User: hi
Bot: Hello! My name is DEV~BOT. How can I help you?

User: Hi I'm Pasindu
Bot: Hello! My name is DEV~BOT. How can I help you?

User: Hello there everyone
Bot: Hello! My name is DEV~BOT. How can I help you?

User: !help
Bot: 🤖 Bot Commands:
     • hi or hello - Get greeting (flexible patterns supported)
     • !sticker - Create sticker from image
     • !help - Show this help menu
     • !about - Bot info, features & developer details
     ...

User: !about
Bot: 🤖 DEV~BOT - About
     ✨ Features: Advanced sticker creation, smart content filtering...
     👨‍💻 Developer: Pasindu Madhuwantha (Pasindu OG)
     GitHub: @PasinduOG
     ...

User: !invalidcommand
Bot: [Sends hey.mp4 video] + "❌ Invalid command! Use !help to see available commands."

User: [inappropriate content]
Bot: [Sends hey.mp4 video] + "⚠️ Please maintain respectful language in our chat."
```

### Sticker Creation
```
Method 1: Send image with caption "!sticker"
Method 2: Reply to any image with "!sticker"
Bot: 🎨 Creating sticker... Please wait!
Bot: [Sends converted WebP sticker]
```

### Group Chat Features
- **User Mentions**: Bot mentions users in group responses
- **Group-Aware Help**: Different help messages for groups vs private chats
- **Admin Commands**: Some commands restricted to private chats for security

## 🔄 Session Management

### Automatic Error Recovery
The bot includes sophisticated session management:

- **Session Error Tracking**: Monitors "Bad MAC" and decryption errors
- **Automatic Cleanup**: Clears corrupted sessions after 10 errors
- **Smart Reconnection**: Exponential backoff for connection attempts
- **Conflict Resolution**: Handles multiple WhatsApp Web sessions gracefully

### Manual Session Reset
If you encounter persistent session issues:

```bash
# Option 1: Use the bot command (private chat only)
!reset

# Option 2: Run the cleanup script
node clear-sessions.js

# Option 3: Manual cleanup
rm -rf auth/session-*
rm -rf auth/sender-key-*
rm -rf auth/app-state-*
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

**3. Sticker Creation Fails**
- Ensure image is valid (JPG, PNG, etc.)
- Check image file size (< 10MB recommended)
- Verify Sharp installation: `npm list sharp`

**4. Bot Not Responding**
- Check console for error messages
- Verify WhatsApp connection status
- Try `!reset` to clear sessions

**5. Private Chat Commands Not Working**
- Ensure you're messaging the bot directly (not in a group)
- Check that the bot shows as "online" or "last seen recently"
- Verify the phone number used to authenticate the bot
- Try restarting the bot with `npm start`
- Check console logs for debugging information

**6. Video Responses Not Working**
- Ensure `src/hey.mp4` file exists in the project directory
- Check video file permissions and size
- Verify Sharp installation for video processing
- Monitor console logs for video sending errors

### Error Codes

| Error | Cause | Solution |
|-------|-------|----------|
| `Bad MAC Error` | Session corruption | Use `!reset` or restart bot |
| `Stream Errored (conflict)` | Multiple sessions | Close other WhatsApp Web tabs |
| `Connection timeout` | Network issues | Check internet connection |
| `Failed to decrypt message` | Session mismatch | Clear auth data and re-authenticate |
| `Video sending failed` | Media file issues | Check `src/hey.mp4` exists and permissions |
| `Content filtering error` | Pattern matching issues | Check console logs for details |
| `Commands not working in private` | Authentication/connection issues | Restart bot, check phone number, verify connection |

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
The bot includes a focused content filtering system designed to maintain respectful conversations while minimizing false positives:

- **Targeted Detection**: Focuses only on the most offensive and clearly inappropriate terms
- **Multi-Language Support**: Detects inappropriate content in both English and Sinhala
- **Bypass Prevention**: Handles common obfuscation techniques (character substitution, spacing, etc.)
- **Video Response**: Responds with `src/hey.mp4` video plus warning message
- **Minimal False Positives**: Carefully tuned to avoid flagging normal conversation

### Filtering Features
- **Core Profanity**: Detects major offensive words with variations
- **Character Substitution**: Handles `@`, `*`, `#`, numbers, and other replacements
- **Spacing Bypass**: Detects words split with spaces, dashes, or punctuation
- **Leetspeak**: Basic number-to-letter substitution detection
- **Acronyms**: Common inappropriate acronyms (WTF, STFU)
- **Reverse Text**: Basic reverse writing detection

### Response Behavior
1. **Detection**: When inappropriate content is detected
2. **Video Response**: Sends `hey.mp4` video file
3. **Warning Message**: Adds appropriate warning text
4. **Graceful Fallback**: Falls back to text-only warning if video fails
5. **Console Logging**: Logs detection events for monitoring

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
