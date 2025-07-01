import * as Baileys from "@whiskeysockets/baileys";
import P from 'pino';
import qrcode from 'qrcode-terminal';
import sharp from 'sharp';

// Function to create sticker from image buffer
async function createSticker(imageBuffer) {
    try {
        console.log('🔧 Processing image buffer, size:', imageBuffer.length, 'bytes');

        // Validate buffer
        if (!imageBuffer || imageBuffer.length === 0) {
            throw new Error('Empty or invalid image buffer');
        }

        // Convert image to WebP format and resize for sticker
        const stickerBuffer = await sharp(imageBuffer)
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp({
                quality: 80,
                lossless: false
            })
            .toBuffer();

        console.log('✅ Sticker created successfully, size:', stickerBuffer.length, 'bytes');
        return stickerBuffer;
    } catch (error) {
        console.error('❌ Error creating sticker:', error.message);
        console.error('📋 Stack trace:', error.stack);
        throw error;
    }
}

// Global variables for connection management
let isConnecting = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const baseReconnectDelay = 5000; // Start with 5 seconds
let currentSocket = null; // Track current socket instance
let sessionErrorCount = 0; // Track session errors
const maxSessionErrors = 10; // Clear sessions after this many errors

// Simplified bad words patterns - focused on most offensive terms only
const badWordsPatterns = [
    // Core English profanity - most offensive only
    /f+[u@*#0o]+c+k+[ings]*/i,          // fuck, fucking, etc.
    /s+h+[i1!@*#]+t+/i,                 // shit variations
    /b+[i1!@*#]+t+c+h+/i,               // bitch variations
    /a+s+s+h+[o0@*#]+l+e+/i,            // asshole variations
    
    // Extreme character substitutions for core words only
    /f[^a-z]*[u@*#0o][^a-z]*c[^a-z]*k/i,    // f___u___c___k with any chars between
    /s[^a-z]*h[^a-z]*[i1!@*#][^a-z]*t/i,    // s___h___i___t with any chars between
    
    // Common bypass techniques for core words
    /f[\s\-_\.\,\!\?\;\:]*u[\s\-_\.\,\!\?\;\:]*c[\s\-_\.\,\!\?\;\:]*k/i,  // f.u.c.k, f-u-c-k
    /s[\s\-_\.\,\!\?\;\:]*h[\s\-_\.\,\!\?\;\:]*i[\s\-_\.\,\!\?\;\:]*t/i,  // s.h.i.t, s-h-i-t
    
    // Core Sinhala bad words - most offensive only
    /p+[a@*#4]+k+[o0@*#]+/i,            // pako variations
    /w+[e3@*#]+s+[i1!@*#]+y+[a@*#4]+/i, // wesiya variations
    /h+[u@*#0o]+t+t+[ho0@*#]+/i,        // hutto variations
    /b+[a@*#4]+l+l+[a@*#4]+/i,          // balla variations
    
    // Only most obvious acronyms
    /\bwtf\b/i,                         // what the fuck
    /\bstfu\b/i,                        // shut the fuck up
    
    // Reverse writing for core words only
    /kcuf/i,                            // fuck reversed
    /tihs/i,                            // shit reversed
];

// Simplified function to check bad words - reduced sensitivity
function containsBadWords(text) {
    if (!text || typeof text !== 'string') return false;
    
    // Basic text normalization only
    const originalText = text.toLowerCase();
    const cleanText = text.toLowerCase()
        .replace(/[\s\-_\.\,\!\?\;\:]/g, '')  // Remove basic punctuation
        .replace(/[0-9]/g, match => {  // Basic number to letter conversion
            const numMap = {'0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's'};
            return numMap[match] || match;
        });
    
    // Test only against core patterns
    const textsToCheck = [originalText, cleanText];
    
    // Check against simplified regex patterns
    for (const pattern of badWordsPatterns) {
        for (const textVariant of textsToCheck) {
            if (pattern.test(textVariant)) {
                return true;
            }
        }
    }
    
    // Simple scattered check for only the worst words
    const scatteredPatterns = [
        /f.*u.*c.*k/i,      // f...u...c...k
        /s.*h.*i.*t/i,      // s...h...i...t
    ];
    
    return scatteredPatterns.some(pattern => pattern.test(originalText));
}

// Function to handle session errors
async function handleSessionError() {
    sessionErrorCount++;
    console.log(`⚠️ Session error count: ${sessionErrorCount}/${maxSessionErrors}`);
    
    if (sessionErrorCount >= maxSessionErrors) {
        console.log('🔧 Too many session errors. Clearing sessions and reconnecting...');
        sessionErrorCount = 0;
        
        try {
            const fs = await import('fs');
            const path = await import('path');
            
            // Clear only session files, keep creds
            const authPath = path.join(process.cwd(), 'auth');
            if (fs.existsSync(authPath)) {
                const files = fs.readdirSync(authPath);
                files.forEach(file => {
                    if (file.includes('session-') || file.includes('sender-key-') || file.includes('app-state-')) {
                        const filePath = path.join(authPath, file);
                        try {
                            fs.unlinkSync(filePath);
                            console.log(`🗑️ Cleared session file: ${file}`);
                        } catch (err) {
                            console.log(`⚠️ Could not delete ${file}:`, err.message);
                        }
                    }
                });
            }
            
            // Cleanup current connection before restart
            cleanupConnection();
            
            // Restart connection
            setTimeout(() => {
                console.log('🔄 Restarting bot with cleared sessions...');
                startBot();
            }, 5000); // Increased delay to ensure cleanup
            
        } catch (error) {
            console.error('❌ Error clearing sessions:', error.message);
        }
    } else {
        // For fewer errors, just cleanup and restart without clearing files
        console.log('🔄 Restarting connection due to session error...');
        cleanupConnection();
        setTimeout(() => {
            startBot();
        }, 3000);
    }
}

// Function to cleanup existing connection
function cleanupConnection() {
    if (currentSocket) {
        try {
            console.log('🧹 Cleaning up existing connection...');
            // Remove all event listeners first
            currentSocket.ev.removeAllListeners();
            
            // Properly close the socket without accessing ws directly
            if (typeof currentSocket.end === 'function') {
                currentSocket.end();
            }
            
            // Force close WebSocket connection if it exists
            if (currentSocket.ws && typeof currentSocket.ws.close === 'function') {
                currentSocket.ws.close();
            }
            
            currentSocket = null;
            console.log('✅ Connection cleanup completed');
        } catch (error) {
            console.log('⚠️ Error during cleanup:', error.message);
            currentSocket = null; // Force reset even if cleanup fails
        }
    }
}

async function startBot() {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting) {
        console.log('⏳ Connection attempt already in progress, skipping...');
        return;
    }

    isConnecting = true;

    try {
        console.log('🚀 Starting WhatsApp Bot...');

        // If too many conflicts, show helpful message
        if (reconnectAttempts >= 3) {
            console.log('⚠️ Multiple conflicts detected. This usually means:');
            console.log('   1. WhatsApp Web is open in another browser/tab');
            console.log('   2. Another instance of this bot is running');
            console.log('   3. The same phone number is used elsewhere');
            console.log('💡 Please close other WhatsApp Web sessions before continuing.');
        }

        // Cleanup any existing connection first
        cleanupConnection();

        // Add a small delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { state, saveCreds } = await Baileys.useMultiFileAuthState('auth');
        const { version } = await Baileys.fetchLatestBaileysVersion();

        const sock = Baileys.makeWASocket({
            version,
            auth: state,
            logger: P({ level: 'fatal' }), // Further reduced logging to prevent spam
            printQRInTerminal: false,
            browser: ['WhatsApp Bot', 'Chrome', '1.0.0'],
            connectTimeoutMs: 60000, // 60 second timeout
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            markOnlineOnConnect: false, // Prevent showing as online immediately
            syncFullHistory: false, // Don't sync full message history
            generateHighQualityLinkPreview: false,
            getMessage: async () => undefined, // Prevent message fetch conflicts
            shouldIgnoreJid: jid => false, // Don't ignore any JIDs
            shouldSyncHistoryMessage: () => false, // Don't sync history to prevent session conflicts
            retryRequestDelayMs: 250,
            maxMsgRetryCount: 3,
            fireInitQueries: true,
            emitOwnEvents: false // Don't emit events for own messages
        });

        // Store the current socket reference
        currentSocket = sock;

        currentSocket = sock; // Track the current socket instance

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
            try {
                if (qr) {
                    console.log('📱 Scan this QR code with your WhatsApp:');
                    qrcode.generate(qr, { small: true });
                }

                if (connection === 'close') {
                    isConnecting = false;

                    const shouldReconnect = lastDisconnect.error?.output?.statusCode !== Baileys.DisconnectReason.loggedOut;
                    const errorMessage = lastDisconnect.error?.message || 'Unknown error';

                    console.log('❌ Connection closed due to:', errorMessage);

                    // Handle specific error types
                    if (errorMessage.includes('conflict') || errorMessage.includes('replaced')) {
                        reconnectAttempts++;
                        console.log(`⚠️ Conflict detected (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);

                        if (reconnectAttempts >= maxReconnectAttempts) {
                            console.log('🛑 Too many conflict errors. Resetting auth and waiting longer...');
                            // Clear auth directory to force fresh authentication
                            console.log('🗑️ Clearing authentication data to resolve conflicts...');
                            setTimeout(async () => {
                                try {
                                    const fs = await import('fs');
                                    const path = await import('path');
                                    const authPath = path.join(process.cwd(), 'auth');
                                    if (fs.existsSync(authPath)) {
                                        fs.rmSync(authPath, { recursive: true, force: true });
                                        console.log('✅ Auth data cleared. Bot will need to be re-authenticated.');
                                    }
                                } catch (clearError) {
                                    console.error('❌ Error clearing auth:', clearError.message);
                                }
                                reconnectAttempts = 0;
                                startBot();
                            }, baseReconnectDelay * 4); // 20 seconds
                            return;
                        }

                        // Progressive delay for conflicts
                        const conflictDelay = baseReconnectDelay * Math.pow(2, reconnectAttempts - 1);
                        console.log(`🔄 Attempting to reconnect in ${conflictDelay / 1000} seconds...`);
                        setTimeout(() => startBot(), conflictDelay);
                    }
                    else if (shouldReconnect) {
                        // Reset attempt counter for non-conflict errors only
                        if (!errorMessage.includes('conflict')) {
                            reconnectAttempts = 0;
                        }
                        console.log('🔄 Attempting to reconnect in 3 seconds...');
                        setTimeout(() => startBot(), 3000);
                    }
                    else {
                        console.log('🚪 Logged out from WhatsApp. Please restart the bot.');
                        reconnectAttempts = 0;
                    }
                } else if (connection === 'open') {
                    isConnecting = false;
                    reconnectAttempts = 0; // Reset on successful connection
                    sessionErrorCount = 0; // Reset session error count
                    console.log('✅ Connected to WhatsApp!');
                } else if (connection === 'connecting') {
                    console.log('🔗 Connecting to WhatsApp...');
                }
            } catch (error) {
                console.error('❌ Error in connection update:', error.message);
                isConnecting = false;
            }
        });

        // Handle specific WhatsApp errors
        sock.ev.on('CB:call', (node) => {
            try {
                console.log('📞 Incoming call detected');
                // Auto-reject calls to prevent issues
                sock.rejectCall(node.attrs.id, node.attrs.from);
                console.log('✅ Call rejected automatically');
            } catch (error) {
                console.error('❌ Error handling call:', error.message);
            }
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            try {
                if (!messages || messages.length === 0) {
                    return; // Skip if no messages
                }

                const msg = messages[0];

                // Validate message structure
                if (!msg || !msg.key || !msg.message) {
                    console.log('⚠️ Skipping invalid message structure');
                    return; // Skip invalid messages
                }

                // Handle session errors - if message is corrupted, skip it
                if (msg.messageStubType || msg.message?.protocolMessage) {
                    console.log('⚠️ Skipping protocol/stub message (likely session error)');
                    return;
                }

                // Skip messages from self
                if (msg.key.fromMe) {
                    return;
                }

                // Additional session validation
                if (!msg.key.remoteJid) {
                    console.log('⚠️ Skipping message with invalid remoteJid');
                    return;
                }

                const sender = msg.key.remoteJid;
                if (!sender) return;

                // Determine if this is a group chat
                const isGroup = sender.includes('@g.us');
                const isPrivate = !isGroup;

                // Handle text messages
                if (msg.message?.conversation || msg.message?.extendedTextMessage?.text) {
                    let text = '';
                    
                    // Extract text from different message types
                    if (msg.message.conversation) {
                        text = msg.message.conversation;
                    } else if (msg.message.extendedTextMessage?.text) {
                        text = msg.message.extendedTextMessage.text;
                    }
                    
                    text = text.toLowerCase().trim();
                    if (!text) return;

                    // Get sender info for groups
                    const senderName = msg.pushName || 'Unknown';
                    const actualSender = isGroup ? msg.key.participant : sender;

                    console.log(`📩 Message from ${senderName} in ${isGroup ? 'group' : 'private'} (${sender}): ${text}`);
                    console.log(`🔍 Debug - isGroup: ${isGroup}, isPrivate: ${isPrivate}, command: ${text}`);

                    // Bot commands that work in both private and group chats
                    // Regex pattern to match greetings like "hi", "hello", "hi i'm pasindu", etc.
                    const greetingPattern = /^(!?)h(i|ello)(\s|$)/i;
                    
                    if (greetingPattern.test(text)) {
                        console.log(`👋 Greeting detected from ${senderName}`);
                        const greeting = isGroup 
                            ? `Hello @${actualSender.split('@')[0]}! My name is DEV~BOT. How can I help you? I'm here to make a smile to u...😊`
                            : 'Hello! My name is DEV~BOT. How can I help you?';
                        
                        const messageOptions = isGroup 
                            ? { text: greeting, mentions: [actualSender] }
                            : { text: greeting };
                            
                        await sock.sendMessage(sender, messageOptions);
                        console.log('✅ Reply sent successfully');
                    } 
                    else if (text === '!sticker') {
                        console.log(`🎨 Sticker help command from ${senderName}`);
                        const helpText = isGroup
                            ? '🎨 To make a sticker in groups:\n1. Send an image with "!sticker" as caption\n2. Or reply to an image with "!sticker"\n3. Use @botname !sticker for direct commands'
                            : '🎨 To make a sticker:\n1. Send an image with "!sticker" as caption\n2. Or reply to an image with "!sticker"';
                            
                        await sock.sendMessage(sender, { text: helpText });
                        console.log('✅ Sticker help sent successfully');
                    }
                    else if (text === '!help' || text === '!commands') {
                        console.log(`ℹ️ Help command from ${senderName} in ${isGroup ? 'group' : 'private'}`);
                        const helpMessage = `🤖 *DEV~BOT Commands:*\n\n` +
                            `• *Hi* or *Hello* - Get greeting (flexible patterns)\n` +
                            `• *!sticker* - Create sticker from image\n` +
                            `• *!help* or *!commands* - Show this help menu\n` +
                            `• *!about* - Bot info, features & developer details\n` +
                            `${!isGroup ? `• *!reset* - Fix session errors (private only)\n` : ''}` +
                            `\n📱 *Sticker Creation:*\n` +
                            `1. Send image with "!sticker" caption\n` +
                            `2. Reply to image with "!sticker"\n\n` +
                            `${isGroup ? '💡 *Group Tip:* DEV~BOT works in groups too!' : '💡 *Tip:* All DEV~BOT commands work in private chat!'}`;
                            
                        await sock.sendMessage(sender, { text: helpMessage });
                        console.log('✅ Help message sent successfully');
                    }
                    else if (text === '!about') {
                        console.log(`ℹ️ About command from ${senderName}`);
                        const aboutMessage = `🤖 *DEV~BOT - About*\n\n` +
                            `*✨ Features:*\n` +
                            `• 🎨 Advanced sticker creation from any image\n` +
                            `• 🤖 Smart greeting detection with flexible patterns\n` +
                            `• 🛡️ Intelligent content filtering system\n` +
                            `• 🎥 Video responses for invalid commands\n` +
                            `• 👥 Full group chat support with mentions\n` +
                            `• 🔄 Advanced session management & auto-recovery\n` +
                            `• 📱 Cross-platform compatibility\n\n` +
                            `*⚖️ Terms & Conditions:*\n` +
                            `• For educational and personal use only\n` +
                            `• Respect WhatsApp's Terms of Service\n` +
                            `• Use appropriate language in conversations\n` +
                            `• No spam or misuse of bot features\n` +
                            `• Developer not responsible for misuse\n\n` +
                            `*👨‍💻 Developer:*\n` +
                            `• Name: Pasindu Madhuwantha (Pasindu OG)\n` +
                            `• GitHub: @PasinduOG\n` +
                            `• Project: Open Source WhatsApp Bot\n` +
                            `• Built with: Node.js + Baileys + Sharp\n\n` +
                            `*🔗 Links:*\n` +
                            `• GitHub: github.com/PasinduOG\n` +
                            `• Repository: github.com/PasinduOG/DEV-BOT\n\n` +
                            `*Made with ❤️ for the community!*`;
                            
                        await sock.sendMessage(sender, { text: aboutMessage });
                        console.log('✅ About message sent successfully');
                    }
                    else if (text === '!reset') {
                        if (isPrivate) {
                            console.log(`🔧 Manual session reset requested by ${senderName} in private chat`);
                            
                            await sock.sendMessage(sender, { 
                                text: '🔄 *DEV~BOT Session Reset*\n\nClearing session data and reconnecting...\nThis may take a few moments.\n\n⚠️ The bot will restart automatically.' 
                            });
                            
                            // Force session error handling
                            sessionErrorCount = maxSessionErrors;
                            handleSessionError();
                        } else {
                            console.log(`❌ Reset command attempted in group by ${senderName}, denying...`);
                            await sock.sendMessage(sender, { 
                                text: `@${actualSender.split('@')[0]} ❌ The *!reset* command is only available in private chat for security reasons.\n\nPlease message me privately to use this command.`,
                                mentions: [actualSender]
                            });
                        }
                    }
                    // Handle invalid commands (starts with ! but not a valid command)
                    else if (text.startsWith('!') && text !== '!sticker' && text !== '!about' && text !== '!help' && text !== '!commands' && text !== '!reset') {
                        const senderName = msg.pushName || 'Unknown';
                        const actualSender = isGroup ? msg.key.participant : sender;
                        
                        console.log(`❌ Invalid command "${text}" from ${senderName}, sending video response...`);
                        
                        try {
                            // Import fs for reading the video file
                            const fs = await import('fs');
                            const path = await import('path');
                            
                            // Read the video file
                            const videoPath = path.join(process.cwd(), 'src', 'hey.mp4');
                            
                            if (!fs.existsSync(videoPath)) {
                                throw new Error('Video file not found');
                            }
                            
                            const videoBuffer = fs.readFileSync(videoPath);
                            
                            // Send the video with a caption
                            const videoCaption = isGroup 
                                ? `කෙලෝ ගන්න එපා මට කියාලා හොදේ! @${actualSender.split('@')[0]}! \n\n*කුණුහර්ප තහනම් හොදින් මතක තියාගන්න ඕන!*.........😒 Try *!help* or *!commands* to see available commands!`
                                : `කෙලෝ ගන්න එපා මට කියාලා හොදේ! \n\n*කුණුහර්ප තහනම් හොදින් මතක තියාගන්න ඕන!*..........😒 Try *!help* or *!commands* to see available commands!`;
                                
                            const videoOptions = {
                                video: videoBuffer,
                                caption: videoCaption,
                                mimetype: 'video/mp4'
                            };
                            
                            if (isGroup) {
                                videoOptions.mentions = [actualSender];
                            }
                            
                            await sock.sendMessage(sender, videoOptions);
                            console.log('✅ Invalid command video response sent successfully');
                            
                        } catch (videoError) {
                            console.error('❌ Error sending video for invalid command:', videoError.message);
                            
                            // Fallback to text message if video fails
                            const fallbackText = isGroup
                                ? `@${actualSender.split('@')[0]} *කුණුහර්ප තහනම් හොදින් මතක තියාගන්න ඕන!*.........😒 \n\nTry *!help* or *!commands* to see available commands.`
                                : `*කුණුහර්ප තහනම් හොදින් මතක තියාගන්න ඕන!*.........😒 \n\nTry *!help* or *!commands* to see available commands.`;
                                
                            const fallbackOptions = isGroup
                                ? { text: fallbackText, mentions: [actualSender] }
                                : { text: fallbackText };
                                
                            await sock.sendMessage(sender, fallbackOptions);
                            console.log('✅ Fallback text response sent for invalid command');
                        }
                    }
                    // Handle bad words detection
                    else if (containsBadWords(text)) {
                        const senderName = msg.pushName || 'Unknown';
                        const actualSender = isGroup ? msg.key.participant : sender;
                        
                        console.log(`🚫 Bad words detected from ${senderName}: "${text}"`);
                        
                        try {
                            // Import fs for reading the video file
                            const fs = await import('fs');
                            const path = await import('path');
                            
                            // Read the video file
                            const videoPath = path.join(process.cwd(), 'src', 'hey.mp4');
                            
                            if (!fs.existsSync(videoPath)) {
                                throw new Error('Video file not found');
                            }
                            
                            const videoBuffer = fs.readFileSync(videoPath);
                            
                            // Send the video with a caption about language
                            const videoCaption = isGroup 
                                ? `කෙලෝ ගන්න එපා මට කියාලා හොදේ! @${actualSender.split('@')[0]}! \n\n*කුණුහර්ප තහනම් හොදින් මතක තියාගන්න ඕන!*.........😒\n\nPlease use appropriate language! Let's keep our conversation respectful. 🙏`
                                : `කෙලෝ ගන්න එපා මට කියාලා හොදේ! \n\n*කුණුහර්ප තහනම් හොදින් මතක තියාගන්න ඕන!*.........😒\n\nPlease use appropriate language! Let's keep our conversation respectful. 🙏`;
                                
                            const videoOptions = {
                                video: videoBuffer,
                                caption: videoCaption,
                                mimetype: 'video/mp4'
                            };
                            
                            if (isGroup) {
                                videoOptions.mentions = [actualSender];
                            }
                            
                            await sock.sendMessage(sender, videoOptions);
                            console.log('✅ Bad words warning video sent successfully');
                            
                        } catch (videoError) {
                            console.error('❌ Error sending video for bad words:', videoError.message);
                            
                            // Fallback to text message if video fails
                            const fallbackText = isGroup
                                ? `@${actualSender.split('@')[0]} *මීට වැඩිය හොදායි*.........😒\n\nPlease use appropriate language! Let's keep our conversation respectful. 🙏`
                                : `*මීට වැඩිය හොදායි*.........😒\n\nPlease use appropriate language! Let's keep our conversation respectful. 🙏`;
                                
                            const fallbackOptions = isGroup
                                ? { text: fallbackText, mentions: [actualSender] }
                                : { text: fallbackText };
                                
                            await sock.sendMessage(sender, fallbackOptions);
                            console.log('✅ Fallback bad words warning sent');
                        }
                    }
                }

                // Handle image messages with sticker command - moved outside to avoid duplication

                // Handle image messages with sticker command
                if (msg.message?.imageMessage) {
                    const caption = msg.message.imageMessage.caption?.toLowerCase().trim();

                    if (caption === '!sticker') {
                        const senderName = msg.pushName || 'Unknown';
                        const actualSender = isGroup ? msg.key.participant : sender;
                        
                        console.log(`🎨 Processing image message for sticker creation from ${senderName}...`);

                        try {
                            // Send processing message with mention in groups
                            const processingText = isGroup 
                                ? `🎨 @${actualSender.split('@')[0]} Creating sticker... Please wait!`
                                : '🎨 Creating sticker... Please wait!';
                                
                            const processingOptions = isGroup 
                                ? { text: processingText, mentions: [actualSender] }
                                : { text: processingText };
                                
                            await sock.sendMessage(sender, processingOptions);

                            // Download the image with retries
                            let imageBuffer;
                            let attempts = 0;
                            const maxAttempts = 3;

                            while (attempts < maxAttempts) {
                                try {
                                    console.log(`📥 Downloading image (attempt ${attempts + 1}/${maxAttempts})...`);
                                    imageBuffer = await Baileys.downloadMediaMessage(msg, 'buffer', {});
                                    break;
                                } catch (downloadError) {
                                    attempts++;
                                    console.error(`❌ Download attempt ${attempts} failed:`, downloadError.message);
                                    if (attempts >= maxAttempts) {
                                        throw new Error('Failed to download image after multiple attempts');
                                    }
                                    // Wait before retry
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                }
                            }

                            if (!imageBuffer) {
                                throw new Error('Failed to download image');
                            }

                            // Create sticker
                            const stickerBuffer = await createSticker(imageBuffer);

                            // Send sticker with metadata
                            await sock.sendMessage(sender, {
                                sticker: stickerBuffer,
                                mimetype: 'image/webp'
                            });

                            console.log(`✅ Sticker sent successfully to ${isGroup ? 'group' : 'private chat'}`);
                        } catch (stickerError) {
                            console.error('❌ Error creating sticker:', stickerError.message);
                            
                            const errorText = isGroup
                                ? `❌ @${actualSender.split('@')[0]} Failed to create sticker: ${stickerError.message}\n\nPlease make sure you sent a valid image (JPG, PNG, etc.)`
                                : `❌ Failed to create sticker: ${stickerError.message}\n\nPlease make sure you sent a valid image (JPG, PNG, etc.)`;
                                
                            const errorOptions = isGroup
                                ? { text: errorText, mentions: [actualSender] }
                                : { text: errorText };
                                
                            await sock.sendMessage(sender, errorOptions);
                        }
                    }
                }

                // Handle quoted/reply messages for sticker creation
                if (msg.message?.extendedTextMessage) {
                    const text = msg.message.extendedTextMessage.text?.toLowerCase().trim();
                    const contextInfo = msg.message.extendedTextMessage.contextInfo;
                    const quotedMessage = contextInfo?.quotedMessage;

                    if (text === '!sticker' && quotedMessage?.imageMessage) {
                        const senderName = msg.pushName || 'Unknown';
                        const actualSender = isGroup ? msg.key.participant : sender;
                        
                        console.log(`🎨 Processing quoted image for sticker creation from ${senderName}...`);
                        console.log('📋 Context info:', JSON.stringify(contextInfo, null, 2));

                        try {
                            // Send processing message with mention in groups
                            const processingText = isGroup 
                                ? `🎨 @${actualSender.split('@')[0]} Creating sticker from replied image... Please wait!`
                                : '🎨 Creating sticker from replied image... Please wait!';
                                
                            const processingOptions = isGroup 
                                ? { text: processingText, mentions: [actualSender] }
                                : { text: processingText };
                                
                            await sock.sendMessage(sender, processingOptions);

                            // Try different approaches to construct the quoted message
                            let quotedMsg;

                            // Method 1: Use the participant and stanzaId from contextInfo
                            if (contextInfo.participant && contextInfo.stanzaId) {
                                quotedMsg = {
                                    key: {
                                        remoteJid: contextInfo.participant,
                                        fromMe: false,
                                        id: contextInfo.stanzaId
                                    },
                                    message: { imageMessage: quotedMessage.imageMessage }
                                };
                            }
                            // Method 2: Use the current sender and stanzaId
                            else if (contextInfo.stanzaId) {
                                quotedMsg = {
                                    key: {
                                        remoteJid: sender,
                                        fromMe: false,
                                        id: contextInfo.stanzaId
                                    },
                                    message: { imageMessage: quotedMessage.imageMessage }
                                };
                            }
                            // Method 3: Fallback to current message structure
                            else {
                                quotedMsg = {
                                    key: {
                                        remoteJid: sender,
                                        fromMe: false,
                                        id: msg.key.id + '_quoted'
                                    },
                                    message: { imageMessage: quotedMessage.imageMessage }
                                };
                            }

                            console.log('📋 Constructed quoted message key:', quotedMsg.key);

                            // Download the quoted image with retries
                            let imageBuffer;
                            let attempts = 0;
                            const maxAttempts = 3;

                            while (attempts < maxAttempts) {
                                try {
                                    console.log(`📥 Downloading quoted image (attempt ${attempts + 1}/${maxAttempts})...`);

                                    // Try to download with different methods
                                    if (attempts === 0) {
                                        // First attempt: Use constructed message
                                        imageBuffer = await Baileys.downloadMediaMessage(quotedMsg, 'buffer', {});
                                    } else if (attempts === 1) {
                                        // Second attempt: Try with minimal key structure
                                        const simpleQuotedMsg = {
                                            key: { id: contextInfo.stanzaId || msg.key.id },
                                            message: { imageMessage: quotedMessage.imageMessage }
                                        };
                                        imageBuffer = await Baileys.downloadMediaMessage(simpleQuotedMsg, 'buffer', {});
                                    } else {
                                        // Third attempt: Direct download from imageMessage
                                        const directMsg = {
                                            message: { imageMessage: quotedMessage.imageMessage }
                                        };
                                        imageBuffer = await Baileys.downloadMediaMessage(directMsg, 'buffer', {});
                                    }

                                    console.log('✅ Successfully downloaded quoted image');
                                    break;
                                } catch (downloadError) {
                                    attempts++;
                                    console.error(`❌ Download attempt ${attempts} failed:`, downloadError.message);
                                    if (attempts >= maxAttempts) {
                                        throw new Error(`Failed to download quoted image after ${maxAttempts} attempts: ${downloadError.message}`);
                                    }
                                    // Wait before retry
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                }
                            }

                            if (!imageBuffer) {
                                throw new Error('Failed to download quoted image - buffer is empty');
                            }

                            // Create sticker
                            const stickerBuffer = await createSticker(imageBuffer);

                            // Send sticker with metadata
                            await sock.sendMessage(sender, {
                                sticker: stickerBuffer,
                                mimetype: 'image/webp'
                            });

                            console.log(`✅ Sticker created from reply successfully in ${isGroup ? 'group' : 'private chat'}`);
                        } catch (stickerError) {
                            console.error('❌ Error creating sticker from reply:', stickerError.message);
                            console.error('📋 Full error:', stickerError);
                            
                            const errorText = isGroup
                                ? `❌ @${actualSender.split('@')[0]} Failed to create sticker from replied image: ${stickerError.message}\n\nTip: Try sending the image directly with "!sticker" as caption instead.`
                                : `❌ Failed to create sticker from replied image: ${stickerError.message}\n\nTip: Try sending the image directly with "!sticker" as caption instead.`;
                                
                            const errorOptions = isGroup
                                ? { text: errorText, mentions: [actualSender] }
                                : { text: errorText };
                                
                            await sock.sendMessage(sender, errorOptions);
                        }
                    }
                }

            } catch (error) {
                console.error('❌ Error processing message:', error.message);
                console.error('📋 Error details:', error.stack);

                // Handle specific session errors
                if (error.message.includes('Decrypted message with closed session') ||
                    error.message.includes('Bad MAC') ||
                    error.message.includes('decrypt')) {
                    console.log('🔧 Session decrypt error in message processing, handling...');
                    handleSessionError();
                    return; // Don't try to send error message with broken session
                }

                // Try to send an error message to the sender if possible
                try {
                    const sender = messages[0]?.key?.remoteJid;
                    if (sender && currentSocket) {
                        await sock.sendMessage(sender, {
                            text: 'Sorry, I encountered an error processing your message. Please try again later.'
                        });
                    }
                } catch (sendError) {
                    console.error('❌ Failed to send error message:', sendError.message);
                    // If we can't send error message, it might be a session issue
                    if (sendError.message.includes('session') || sendError.message.includes('decrypt')) {
                        console.log('🔧 Session error while sending error message, handling...');
                        handleSessionError();
                    }
                }
            }
        });

        // Handle socket errors
        sock.ev.on('error', (error) => {
            console.error('❌ Socket error:', error.message);
            
            // Handle session-related errors
            if (error.message.includes('Bad MAC') || 
                error.message.includes('decrypt') || 
                error.message.includes('session') ||
                error.message.includes('Decrypted message with closed session')) {
                console.log('🔧 Detected session error, handling...');
                handleSessionError();
            }
        });

        // Enhanced session error handling
        sock.ev.on('CB:message,type:text', (node) => {
            if (node && node.attrs && node.attrs.type === 'error') {
                console.log('⚠️ Message error node received:', JSON.stringify(node, null, 2));
                if (node.content && node.content.toString().includes('decrypt')) {
                    console.log('🔧 Decrypt error detected, handling session error...');
                    handleSessionError();
                }
            }
        });

        // Handle session errors specifically
        sock.ev.on('CB:iq,type:error', (node) => {
            console.log('⚠️ IQ Error received:', JSON.stringify(node, null, 2));
            if (node && node.content && node.content.toString().includes('session')) {
                console.log('🔧 Session IQ error detected, handling...');
                handleSessionError();
            }
        });

        // Enhanced error handling for session issues
        sock.ev.on('messaging-history.set', ({ isLatest }) => {
            console.log('📚 Message history set, isLatest:', isLatest);
        });

        // Add connection state monitoring
        sock.ev.on('connection.update', ({ connection, lastDisconnect, qr, receivedPendingNotifications }) => {
            if (receivedPendingNotifications) {
                console.log('📨 Received pending notifications, session might be unstable');
                // Don't immediately handle as error, but monitor
            }
        });

    } catch (error) {
        isConnecting = false;
        console.error('❌ Failed to start bot:', error.message);

        // Handle specific startup errors
        if (error.message.includes('conflict')) {
            console.log('🔄 Conflict during startup, waiting longer before retry...');
            setTimeout(() => startBot(), baseReconnectDelay * 3); // 15 seconds for startup conflicts
        } else {
            console.log('🔄 Retrying in 5 seconds...');
            setTimeout(() => startBot(), 5000);
        }
    }
}

// Global error handlers
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error.message);
    isConnecting = false; // Reset connection state
    console.log('🔄 Restarting bot in 10 seconds...');
    setTimeout(() => {
        process.exit(1);
    }, 10000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    isConnecting = false;
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    isConnecting = false;
    process.exit(0);
});

// Start the bot with error recovery
async function main() {
    try {
        await startBot();
    } catch (error) {
        console.error('💥 Critical error in main:', error.message);
        console.log('🔄 Restarting in 10 seconds...');
        setTimeout(() => main(), 10000);
    }
}

main();