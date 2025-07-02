import * as Baileys from "@whiskeysockets/baileys";
import P from 'pino';
import qrcode from 'qrcode-terminal';
import sharp from 'sharp';
import dotenv from 'dotenv';
dotenv.config();

// Function to create sticker from image buffer
async function createSticker(imageBuffer) {
    try {
        console.log('🔧 Processing image buffer, size:', imageBuffer.length, 'bytes');

        // Validate buffer
        if (!imageBuffer || imageBuffer.length === 0) {
            throw new Error('Empty or invalid image buffer');
        }

        // Additional validation for minimum size
        if (imageBuffer.length < 1000) {
            throw new Error('Image buffer too small, likely corrupted');
        }

        // Check if it's a valid image by attempting to get metadata
        let metadata;
        try {
            metadata = await sharp(imageBuffer).metadata();
            console.log('📊 Image metadata:', {
                format: metadata.format,
                width: metadata.width,
                height: metadata.height,
                channels: metadata.channels
            });
        } catch (metadataError) {
            throw new Error('Invalid image format or corrupted image data');
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

// Bot status notification settings
// IMPORTANT: Replace with your own phone number to receive online/offline notifications
// Format: countrycode+number@s.whatsapp.net (e.g., '94760135744@s.whatsapp.net' for +94760135744)
// Set to null to disable notifications
const NOTIFICATION_JID = `${process.env.MOBILE}@s.whatsapp.net`; // Replace with your phone number
let hasSetOnlineStatus = false; // Track if online message was sent

// Ultra-simplified bad words patterns - only the most explicit terms
const badWordsPatterns = [
    // Only the most explicit English profanity (exact matches)
    /\bfuck\b/i,
    /\bfucking\b/i,
    /\bbitch\b/i,
    
    // Only the most explicit Sinhala bad words (exact matches)
    /\bpako\b/i,
    /\bwesiya\b/i,
    /\bhutto\b/i,
    
    // Only clear acronyms
    /\bwtf\b/i,
];

// Ultra-simplified function to check bad words - only exact matches
function containsBadWords(text) {
    if (!text || typeof text !== 'string') return false;
    
    // Simple case-insensitive exact word matching only
    const normalizedText = text.toLowerCase();
    
    // Check against ultra-simplified patterns (exact matches only)
    return badWordsPatterns.some(pattern => pattern.test(normalizedText));
}

// Function to send bot status notifications
async function sendStatusNotification(status, socket = null) {
    try {
        if (!socket || !NOTIFICATION_JID) {
            console.log('⚠️ Cannot send status notification - socket or JID not available');
            return;
        }

        const timestamp = new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Colombo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        let message = '';
        let emoji = '';

        if (status === 'online') {
            emoji = '🟢';
            message = `${emoji} *MASTER-CHIEF is Now Online*\n\n` +
                     `✅ *Status:* Connected to WhatsApp\n` +
                     `🕐 *Time:* ${timestamp}\n` +
                     `🤖 *System:* All features operational\n` +
                     `🔧 *Session:* Fresh and ready\n\n` +
                     `*Ready to serve! Send commands to interact.*`;
        } else if (status === 'offline') {
            emoji = '🔴';
            message = `${emoji} *MASTER-CHIEF is Now Offline*\n\n` +
                     `⏹️ *Status:* Disconnected from WhatsApp\n` +
                     `🕐 *Time:* ${timestamp}\n` +
                     `🛑 *System:* Bot stopped\n` +
                     `💤 *Mode:* Standby\n\n` +
                     `*Bot will be back soon! Wait for reconnection.*`;
        } else {
            emoji = '⚠️';
            message = `${emoji} *DEV~BOT Status Update*\n\n` +
                     `📊 *Status:* ${status}\n` +
                     `🕐 *Time:* ${timestamp}\n` +
                     `🤖 *System:* Status changed\n\n` +
                     `*Bot status notification.*`;
        }

        await socket.sendMessage(NOTIFICATION_JID, { 
            text: message 
        });
        
        console.log(`${emoji} Status notification sent: Bot is ${status}`);
    } catch (error) {
        console.error('❌ Error sending status notification:', error.message);
    }
}

// Function to handle session errors
async function handleSessionError(errorType = 'general') {
    sessionErrorCount++;
    console.log(`⚠️ Session error count: ${sessionErrorCount}/${maxSessionErrors} (Type: ${errorType})`);
    
    // Be extremely aggressive with Bad MAC errors - clear immediately
    const isBadMACError = errorType === 'bad_mac' || errorType.includes('Bad MAC');
    const shouldClearImmediately = isBadMACError || sessionErrorCount >= 2; // Reduced from 3 to 2
    
    if (shouldClearImmediately) {
        console.log(`🔧 ${isBadMACError ? 'Bad MAC detected!' : 'Multiple session errors detected'} Clearing sessions and reconnecting...`);
        sessionErrorCount = 0;
        hasSetOnlineStatus = false; // Reset online status when clearing sessions
        
        try {
            const fs = await import('fs');
            const path = await import('path');
            
            // Clear session files more aggressively, keep only essential creds
            const authPath = path.join(process.cwd(), 'auth');
            if (fs.existsSync(authPath)) {
                const files = fs.readdirSync(authPath);
                let clearedCount = 0;
                
                files.forEach(file => {
                    // Clear all session-related files more aggressively
                    if (file.includes('session-') || 
                        file.includes('sender-key-') || 
                        file.includes('app-state-') ||
                        file.includes('pre-key-') ||
                        (isBadMACError && file.includes('sender-key-memory'))) {
                        
                        const filePath = path.join(authPath, file);
                        try {
                            fs.unlinkSync(filePath);
                            console.log(`🗑️ Cleared session file: ${file}`);
                            clearedCount++;
                        } catch (err) {
                            console.log(`⚠️ Could not delete ${file}:`, err.message);
                        }
                    }
                });
                
                console.log(`✅ Cleared ${clearedCount} session files`);
                
                // For Bad MAC errors, also clear any corrupted pre-key files
                if (isBadMACError) {
                    console.log('🔧 Bad MAC detected - performing deep session cleanup...');
                    
                    // List remaining files for debugging
                    const remainingFiles = fs.readdirSync(authPath);
                    console.log('📋 Remaining auth files:', remainingFiles.filter(f => !f.includes('creds.json')));
                }
            }
            
            // Cleanup current connection before restart
            cleanupConnection();
            
            // Restart connection with longer delay for Bad MAC errors
            const restartDelay = isBadMACError ? 5000 : 3000;
            setTimeout(() => {
                console.log(`🔄 Restarting bot with cleared sessions... (${errorType})`);
                startBot();
            }, restartDelay);
            
        } catch (error) {
            console.error('❌ Error clearing sessions:', error.message);
            // Force restart even if cleanup fails
            setTimeout(() => {
                console.log('🔄 Force restarting due to cleanup error...');
                startBot();
            }, 5000);
        }
    } else {
        // For fewer errors, just cleanup and restart without clearing files
        console.log('🔄 Restarting connection due to session error...');
        cleanupConnection();
        setTimeout(() => {
            startBot();
        }, 2000); // Reduced delay
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

// Function to handle graceful shutdown with offline notification
async function gracefulShutdown(signal) {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    
    if (currentSocket && hasSetOnlineStatus) {
        try {
            console.log('📤 Sending offline notification...');
            await sendStatusNotification('offline', currentSocket);
            
            // Wait a moment for the message to be sent
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error('❌ Error sending offline notification:', error.message);
        }
    }
    
    isConnecting = false;
    hasSetOnlineStatus = false;
    cleanupConnection();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
}

// Global console overrides for session error detection
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('Decrypted message with closed session') ||
        message.includes('Bad MAC') ||
        message.includes('Failed to decrypt message with any known session') ||
        message.includes('Closing stale open session') ||
        message.includes('SessionEntry')) {
        originalConsoleLog.apply(console, args);
        if (message.includes('Closing stale open session') || message.includes('SessionEntry')) {
            originalConsoleLog('🔧 Detected stale session cleanup, monitoring for stability...');
            // If we see too many stale session closures, force a cleanup
            if (!global.staleSessionCount) {
                global.staleSessionCount = 0;
                global.staleSessionStartTime = Date.now();
            }
            global.staleSessionCount++;
            
            // If more than 5 stale sessions in 30 seconds, force cleanup
            if (global.staleSessionCount > 5 && (Date.now() - global.staleSessionStartTime) < 30000) {
                originalConsoleLog('🔧 Too many stale sessions detected, forcing cleanup...');
                global.staleSessionCount = 0;
                handleSessionError('excessive_stale_sessions');
            }
            
            // Reset counter every 60 seconds
            if ((Date.now() - global.staleSessionStartTime) > 60000) {
                global.staleSessionCount = 0;
                global.staleSessionStartTime = Date.now();
            }
        } else {
            originalConsoleLog('🔧 Detected session decryption error in console, handling...');
            const errorType = message.includes('Bad MAC') ? 'bad_mac' : 'decrypt_console_error';
            handleSessionError(errorType);
        }
        return;
    }
    originalConsoleLog.apply(console, args);
};

console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('Bad MAC') ||
        message.includes('Failed to decrypt message') ||
        message.includes('verifyMAC') ||
        message.includes('Session error:Error: Bad MAC')) {
        originalConsoleError.apply(console, args);
        originalConsoleLog('🔧 Detected Bad MAC error in console.error, handling...');
        handleSessionError('bad_mac_console_error');
        return;
    }
    originalConsoleError.apply(console, args);
};

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
            emitOwnEvents: false, // Don't emit events for own messages
            // Add session management options
            cachedGroupMetadata: async (jid) => null, // Don't cache group metadata
            patchMessageBeforeSending: (message) => message, // Don't modify messages
            shouldSyncHistoryMessage: () => false, // Disable history sync
            transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 }
        });

        // Store the current socket reference
        currentSocket = sock;

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
            try {
                if (qr) {
                    console.log('📱 Scan this QR code with your WhatsApp:');
                    qrcode.generate(qr, { small: true });
                }

                if (connection === 'close') {
                    isConnecting = false;
                    hasSetOnlineStatus = false; // Reset online status flag

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
                    
                    // Send online notification if not already sent
                    if (!hasSetOnlineStatus) {
                        hasSetOnlineStatus = true;
                        setTimeout(() => {
                            sendStatusNotification('online', sock);
                        }, 2000); // Wait 2 seconds to ensure connection is stable
                    }
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

                // Enhanced message validation
                if (!msg || !msg.key || (!msg.message && !msg.messageStubType)) {
                    console.log('⚠️ Skipping invalid message structure');
                    return; // Skip invalid messages
                }

                // Check for session-related errors early
                const errorMessage = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
                if (errorMessage.includes('Decrypted message with closed session') || 
                    errorMessage.includes('Bad MAC') ||
                    errorMessage.includes('decrypt') ||
                    errorMessage.includes('Failed to decrypt message')) {
                    console.log('🔧 Session error detected in message content, handling...');
                    const errorType = errorMessage.includes('Bad MAC') ? 'bad_mac' : 'decrypt_error';
                    handleSessionError(errorType);
                    return;
                }

                // Handle session errors - if message is corrupted, skip it but monitor frequency
                if (msg.messageStubType || msg.message?.protocolMessage) {
                    console.log('⚠️ Skipping protocol/stub message (likely session error)');
                    
                    // If we're getting too many protocol messages, it might indicate session issues
                    const now = Date.now();
                    if (!global.protocolMessageCount) {
                        global.protocolMessageCount = 0;
                        global.protocolMessageStartTime = now;
                    }
                    
                    global.protocolMessageCount++;
                    
                    // If we get more than 5 protocol messages in 30 seconds, handle as session error (reduced threshold)
                    if (global.protocolMessageCount > 5 && (now - global.protocolMessageStartTime) < 30000) {
                        console.log('🔧 Too many protocol messages detected, handling as session error...');
                        global.protocolMessageCount = 0; // Reset counter
                        handleSessionError('excessive_protocol_messages');
                        return;
                    }
                    
                    // Reset counter every 60 seconds
                    if ((now - global.protocolMessageStartTime) > 60000) {
                        global.protocolMessageCount = 0;
                        global.protocolMessageStartTime = now;
                    }
                    
                    return;
                }

                // Check for session decryption errors in message content
                const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
                if (messageText.includes('Decrypted message with closed session') ||
                    messageText.includes('Bad MAC') ||
                    messageText.includes('Failed to decrypt message')) {
                    console.log('🔧 Detected session decryption error in message, handling...');
                    const errorType = messageText.includes('Bad MAC') ? 'bad_mac' : 'decrypt_error';
                    handleSessionError(errorType);
                    return;
                }

                // Skip messages from self ONLY if they are bot responses (to prevent loops)
                // Allow self-messages that are commands or user input
                if (msg.key.fromMe) {
                    // Check if this is likely a bot response by looking for bot indicators
                    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
                    const isBotResponse = text.includes('MASTER-CHIEF') || 
                                        text.includes('✅') || 
                                        text.includes('❌') || 
                                        text.includes('🎨') || 
                                        text.includes('Creating sticker') ||
                                        text.includes('Hello!') ||
                                        text.includes('Commands:') ||
                                        text.includes('About') ||
                                        text.includes('Session Reset');
                    
                    if (isBotResponse) {
                        console.log('⚠️ Skipping bot response message to prevent loops');
                        return;
                    }
                    
                    console.log('✅ Processing self-message as it appears to be a user command');
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

                    // Check session stability before processing commands
                    const isSessionStable = () => {
                        const now = Date.now();
                        const protocolCount = global.protocolMessageCount || 0;
                        const staleCount = global.staleSessionCount || 0;
                        const protocolTime = global.protocolMessageStartTime || now;
                        const staleTime = global.staleSessionStartTime || now;
                        
                        // Consider session unstable if recent issues
                        if ((protocolCount > 2 && (now - protocolTime) < 30000) ||
                            (staleCount > 2 && (now - staleTime) < 30000)) {
                            return false;
                        }
                        return true;
                    };

                    // Get sender info for groups
                    const senderName = msg.pushName || 'Unknown';
                    const actualSender = isGroup ? msg.key.participant : sender;

                    console.log(`📩 Message from ${senderName} in ${isGroup ? 'group' : 'private'} (${sender}): ${text}`);
                    console.log(`🔍 Debug - isGroup: ${isGroup}, isPrivate: ${isPrivate}, command: ${text}`);

                    // Check session stability for command processing
                    if (!isSessionStable() && text.startsWith('!')) {
                        console.log('⚠️ Session unstable, deferring command processing...');
                        const warningText = isGroup
                            ? `@${actualSender.split('@')[0]} ⚠️ Bot is stabilizing, please try your command again in a moment.`
                            : '⚠️ Bot is stabilizing, please try your command again in a moment.';
                        
                        const warningOptions = isGroup
                            ? { text: warningText, mentions: [actualSender] }
                            : { text: warningText };
                            
                        await sock.sendMessage(sender, warningOptions);
                        return;
                    }

                    // Bot commands that work in both private and group chats
                    // Regex pattern to match greetings like "hi", "hello", "hi i'm pasindu", etc.
                    const greetingPattern = /^(!?)h(i|ello)(\s|$)/i;
                    
                    if (greetingPattern.test(text)) {
                        console.log(`👋 Greeting detected from ${senderName}`);
                        const greeting = isGroup 
                            ? `Hello @${actualSender.split('@')[0]}! My name is MASTER-CHIEF. How can I help you? I'm here to make a smile to u...😊`
                            : 'Hello! My name is MASTER-CHIEF. How can I help you?';
                        
                        const messageOptions = isGroup 
                            ? { text: greeting, mentions: [actualSender] }
                            : { text: greeting };
                            
                        await sock.sendMessage(sender, messageOptions);
                        console.log('✅ Reply sent successfully');
                    } 
                    else if (text === '!sticker') {
                        console.log(`🎨 Sticker help command from ${senderName}`);
                        console.log('⚠️ Skipping sticker help notification (silent command)');
                    }
                    else if (text === '!help' || text === '!commands') {
                        console.log(`ℹ️ Help command from ${senderName} in ${isGroup ? 'group' : 'private'}`);
                        const helpMessage = `🤖 *MASTER-CHIEF Commands:*\n\n` +
                            `• *Hi* or *Hello* - Get greeting (flexible patterns)\n` +
                            `• *!sticker* - Create sticker from image\n` +
                            `• *!help* or *!commands* - Show this help menu\n` +
                            `• *!about* - Bot info, features & developer details\n` +
                            `• *!status* - Check bot status and uptime\n` +
                            `${!isGroup ? `• *!reset* - Fix session errors (private only)\n` : ''}` +
                            `\n📱 *Sticker Creation:*\n` +
                            `1. Send image with "!sticker" caption\n` +
                            `2. Reply to image with "!sticker"\n\n` +
                            `${isGroup ? '💡 *Group Tip:* MASTER-CHIEF works in groups too!' : '💡 *Tip:* All MASTER-CHIEF commands work in private chat!'}`;
                            
                        await sock.sendMessage(sender, { text: helpMessage });
                        console.log('✅ Help message sent successfully');
                    }
                    else if (text === '!about') {
                        console.log(`ℹ️ About command from ${senderName}`);
                        
                        try {
                            // Import fs for reading the image file
                            const fs = await import('fs');
                            const path = await import('path');
                            
                            // Read the about image file
                            const imagePath = path.join(process.cwd(), 'src', 'chief3.jpg');
                            
                            if (!fs.existsSync(imagePath)) {
                                throw new Error('About image file not found');
                            }
                            
                            const imageBuffer = fs.readFileSync(imagePath);
                            
                            const aboutMessage = `🤖 *MASTER-CHIEF - About*\n\n` +
                                `*✨ Features:*\n` +
                                `• 🎨 Advanced sticker creation from any image\n` +
                                `• 🤖 Smart greeting detection with flexible patterns\n` +
                                `• 🛡️ Intelligent content filtering system\n` +
                                `• 🎥 Image responses for invalid commands\n` +
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
                            
                            // Send the image with about message as caption
                            const aboutOptions = {
                                image: imageBuffer,
                                caption: aboutMessage,
                                mimetype: 'image/jpeg'
                            };
                            
                            await sock.sendMessage(sender, aboutOptions);
                            console.log('✅ About message with image sent successfully');
                            
                        } catch (imageError) {
                            console.error('❌ Error sending about image:', imageError.message);
                            
                            // Fallback to text-only message if image fails
                            const aboutMessage = `🤖 *MASTER-CHIEF - About*\n\n` +
                                `*✨ Features:*\n` +
                                `• 🎨 Advanced sticker creation from any image\n` +
                                `• 🤖 Smart greeting detection with flexible patterns\n` +
                                `• 🛡️ Intelligent content filtering system\n` +
                                `• 🎥 Image responses for invalid commands\n` +
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
                            console.log('✅ Fallback about message sent successfully');
                        }
                    }
                    else if (text === '!status') {
                        console.log(`📊 Status command from ${senderName}`);
                        
                        const uptime = process.uptime();
                        const hours = Math.floor(uptime / 3600);
                        const minutes = Math.floor((uptime % 3600) / 60);
                        const seconds = Math.floor(uptime % 60);
                        
                        const timestamp = new Date().toLocaleString('en-US', {
                            timeZone: 'Asia/Colombo',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true
                        });

                        const statusMessage = `🤖 *MASTER-CHIEF Status Report*\n\n` +
                            `🟢 *Status:* Online & Active\n` +
                            `⏰ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n` +
                            `🕐 *Current Time:* ${timestamp}\n` +
                            `📊 *Session Errors:* ${sessionErrorCount}/${maxSessionErrors}\n` +
                            `🔄 *Reconnect Attempts:* ${reconnectAttempts}/${maxReconnectAttempts}\n` +
                            `📱 *Connection:* ${currentSocket ? 'Stable' : 'Unstable'}\n` +
                            `💾 *Memory Usage:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n\n` +
                            `✅ *All systems operational!*\n` +
                            `🔧 *Version:* 1.0.0 Enhanced\n` +
                            `👨‍💻 *Developer:* Pasindu Madhuwantha`;

                        await sock.sendMessage(sender, { text: statusMessage });
                        console.log('✅ Status message sent successfully');
                    }
                    else if (text === '!reset') {
                        if (isPrivate) {
                            console.log(`🔧 Manual session reset requested by ${senderName} in private chat`);
                            
                            await sock.sendMessage(sender, { 
                                text: '🔄 *MASTER-CHIEF Session Reset*\n\nClearing session data and reconnecting...\nThis may take a few moments.\n\n⚠️ The bot will restart automatically.' 
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
                    else if (text.startsWith('!') && text !== '!sticker' && text !== '!about' && text !== '!help' && text !== '!commands' && text !== '!reset' && text !== '!status') {
                        const senderName = msg.pushName || 'Unknown';
                        const actualSender = isGroup ? msg.key.participant : sender;
                        
                        console.log(`❌ Invalid command "${text}" from ${senderName}, sending video response...`);
                        
                        try {
                            // Import fs for reading the video file
                            const fs = await import('fs');
                            const path = await import('path');
                            
                            // Read the image file
                            const imagePath = path.join(process.cwd(), 'src', 'chief.jpg');
                            
                            if (!fs.existsSync(imagePath)) {
                                throw new Error('Image file not found');
                            }
                            
                            const imageBuffer = fs.readFileSync(imagePath);
                            
                            // Send the image with a caption
                            const imageCaption = isGroup 
                                ? `Attention 🛑! @${actualSender.split('@')[0]}! \n\n*This Message from Master Chief!*......... Try *!help* or *!commands* to see available commands!`
                                : `Attention 🛑! \n\n*This Message from Master Chief!*.......... Try *!help* or *!commands* to see available commands!`;
                                
                            const imageOptions = {
                                image: imageBuffer,
                                caption: imageCaption,
                                mimetype: 'image/jpeg'
                            };
                            
                            if (isGroup) {
                                imageOptions.mentions = [actualSender];
                            }
                            
                            await sock.sendMessage(sender, imageOptions);
                            console.log('✅ Invalid command image response sent successfully');
                            
                        } catch (imageError) {
                            console.error('❌ Error sending image for invalid command:', imageError.message);
                            
                            // Fallback to text message if image fails
                            const fallbackText = isGroup
                                ? `@${actualSender.split('@')[0]} *This Message from Master Chief!*......... \n\nTry *!help* or *!commands* to see available commands.`
                                : `*This Message from Master Chief!*......... \n\nTry *!help* or *!commands* to see available commands.`;
                                
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
                            
                            // Read the image file
                            const imagePath = path.join(process.cwd(), 'src', 'chief2.jpg');
                            
                            if (!fs.existsSync(imagePath)) {
                                throw new Error('Image file not found');
                            }
                            
                            const imageBuffer = fs.readFileSync(imagePath);
                            
                            // Send the image with a caption about language
                            const imageCaption = isGroup 
                                ? `Warning ⚠️! @${actualSender.split('@')[0]}! \n\n*This Message from Master Chief!*.........\n\nPlease use appropriate language! Let's keep our conversation respectful. 🙏`
                                : `Warning ⚠️! \n\n*This Message from Master Chief!*.........\n\nPlease use appropriate language! Let's keep our conversation respectful. 🙏`;
                                
                            const imageOptions = {
                                image: imageBuffer,
                                caption: imageCaption,
                                mimetype: 'image/jpeg'
                            };
                            
                            if (isGroup) {
                                imageOptions.mentions = [actualSender];
                            }
                            
                            await sock.sendMessage(sender, imageOptions);
                            console.log('✅ Bad words warning image sent successfully');
                            
                        } catch (imageError) {
                            console.error('❌ Error sending image for bad words:', imageError.message);
                            
                            // Fallback to text message if image fails
                            const fallbackText = isGroup
                                ? `@${actualSender.split('@')[0]} *This Message from Master Chief!*.........\n\nPlease use appropriate language! Let's keep our conversation respectful. 🙏`
                                : `*This Message from Master Chief!*.........\n\nPlease use appropriate language! Let's keep our conversation respectful. 🙏`;
                                
                            const fallbackOptions = isGroup
                                ? { text: fallbackText, mentions: [actualSender] }
                                : { text: fallbackText };
                                
                            await sock.sendMessage(sender, fallbackOptions);
                            console.log('✅ Fallback bad words warning sent');
                        }
                    }
                    // Enhanced regex pattern for developer info queries
                    // Matches: "who is pasindu", "who is madhuwantha", "who is og", "who is pasinduog",
                    // "tell me about pasindu", "about pasindu madhuwantha", "what about og", etc.
                    const developerInfoPattern = /(?:who\s+is|tell\s+me\s+about|about|what\s+about)\s+(?:pasindu(?:\s+madhuwantha)?|madhuwantha|og|pasinduog|the\s+developer|creator|owner|dev)/i;
                    
                    if (developerInfoPattern.test(text)) {
                        const senderName = msg.pushName || 'Unknown';
                        const actualSender = isGroup ? msg.key.participant : sender;
                        
                        console.log(`👨‍💻 Developer info requested by ${senderName}`);
                        
                        const developerInfo = `👨‍💻 *About Pasindu Madhuwantha (PasinduOG)*\n\n` +
                            `🌟 *Professional Background:*\n` +
                            `• Passionate Backend Developer & Technology Enthusiast\n` +
                            `• Remote Worker with expertise in modern web technologies\n` +
                            `• Self-taught programmer continuously learning new technologies\n` +
                            `• Specializes in Microservices and Backend Architecture\n\n` +
                            
                            `💻 *Technical Skills:*\n` +
                            `• Languages: JavaScript, Node.js, Python, HTML, CSS\n` +
                            `• Backend Development & API Design\n` +
                            `• Database Management (MySQL)\n` +
                            `• Modern Web Technologies & Frameworks\n` +
                            `• Microservices Architecture\n\n` +
                            
                            `🚀 *Notable Projects:*\n` +
                            `• MASTER-CHIEF - Advanced WhatsApp Sticker & Command Bot\n` +
                            `• YouTube Downloader - Web app for video/audio downloads\n` +
                            `• Express API Projects - Various REST APIs with validation\n` +
                            `• Facebook Video Downloader - Social media content tool\n\n` +
                            
                            `📊 *GitHub Activity:*\n` +
                            `• 425+ contributions in the last year\n` +
                            `• 18 public repositories\n` +
                            `• Active in open-source development\n` +
                            `• Achievements: Quickdraw, YOLO, Pull Shark\n\n` +
                            
                            `🌐 *Connect & Contact:*\n` +
                            `• GitHub: @PasinduOG\n` +
                            `• Email: pasinduogdev@gmail.com\n` +
                            `• Location: Kalutara, Sri Lanka\n` +
                            `• Social Media: Facebook, YouTube, Discord\n\n` +
                            
                            `⚡ *Fun Facts:*\n` +
                            `• Quote: "I hate frontends" (Backend developer at heart!)\n` +
                            `• Always exploring cutting-edge technologies\n` +
                            `• Believes in continuous learning and innovation\n` +
                            `• Member of @KreedXDevClub\n\n` +
                            
                            `💡 *Philosophy:*\n` +
                            `"Interest for Backend Programming with a deep passion for exploring and researching cutting-edge technologies"\n\n` +
                            
                            `🔗 *Support:*\n` +
                            `• Buy Me a Coffee: buymeacoffee.com/pasinduogdev\n` +
                            `• Open to collaborations and new opportunities!\n\n` +
                            
                            `*Built with ❤️ by Pasindu Madhuwantha*`;
                        
                        const messageOptions = isGroup 
                            ? { text: developerInfo, mentions: [actualSender] }
                            : { text: developerInfo };
                            
                        await sock.sendMessage(sender, messageOptions);
                        console.log('✅ Developer info sent successfully');
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
                                    
                                    // Add timeout to prevent hanging downloads
                                    const downloadPromise = Baileys.downloadMediaMessage(msg, 'buffer', {});
                                    const timeoutPromise = new Promise((_, reject) => 
                                        setTimeout(() => reject(new Error('Download timeout')), 30000)
                                    );
                                    
                                    imageBuffer = await Promise.race([downloadPromise, timeoutPromise]);
                                    
                                    // Validate downloaded buffer
                                    if (!imageBuffer || imageBuffer.length === 0) {
                                        throw new Error('Downloaded buffer is empty');
                                    }
                                    
                                    // Check if buffer contains valid image data
                                    if (imageBuffer.length < 1000) {
                                        throw new Error('Image buffer too small, likely corrupted');
                                    }
                                    
                                    console.log(`✅ Image downloaded successfully, size: ${imageBuffer.length} bytes`);
                                    break;
                                } catch (downloadError) {
                                    attempts++;
                                    console.error(`❌ Download attempt ${attempts} failed:`, downloadError.message);
                                    if (attempts >= maxAttempts) {
                                        throw new Error('Failed to download image after multiple attempts');
                                    }
                                    // Wait before retry
                                    await new Promise(resolve => setTimeout(resolve, 2000));
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
                    error.message.includes('decrypt') ||
                    error.message.includes('Failed to decrypt message')) {
                    console.log('🔧 Session decrypt error in message processing, handling...');
                    const errorType = error.message.includes('Bad MAC') ? 'bad_mac' : 'decrypt_error';
                    handleSessionError(errorType);
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
                    if (sendError.message.includes('session') || 
                        sendError.message.includes('decrypt') ||
                        sendError.message.includes('Bad MAC') ||
                        sendError.message.includes('Failed to decrypt message')) {
                        console.log('🔧 Session error while sending error message, handling...');
                        const errorType = sendError.message.includes('Bad MAC') ? 'bad_mac' : 'session_error';
                        handleSessionError(errorType);
                    }
                }
            }
        });

        // Handle socket errors
        sock.ev.on('error', (error) => {
            console.error('❌ Socket error:', error.message);
            
            // Handle session-related errors with specific typing
            if (error.message.includes('Bad MAC') || 
                error.message.includes('decrypt') || 
                error.message.includes('session') ||
                error.message.includes('Decrypted message with closed session') ||
                error.message.includes('Failed to decrypt message')) {
                console.log('🔧 Detected session error, handling...');
                const errorType = error.message.includes('Bad MAC') ? 'bad_mac' : 'session_error';
                handleSessionError(errorType);
            }
        });

        // Enhanced session error handling
        sock.ev.on('CB:message,type:text', (node) => {
            if (node && node.attrs && node.attrs.type === 'error') {
                console.log('⚠️ Message error node received:', JSON.stringify(node, null, 2));
                if (node.content && (node.content.toString().includes('decrypt') || 
                    node.content.toString().includes('Bad MAC'))) {
                    console.log('🔧 Decrypt error detected, handling session error...');
                    const errorType = node.content.toString().includes('Bad MAC') ? 'bad_mac' : 'decrypt_error';
                    handleSessionError(errorType);
                }
            }
        });

        // Handle session errors specifically
        sock.ev.on('CB:iq,type:error', (node) => {
            console.log('⚠️ IQ Error received:', JSON.stringify(node, null, 2));
            if (node && node.content && (node.content.toString().includes('session') ||
                node.content.toString().includes('Bad MAC'))) {
                console.log('🔧 Session IQ error detected, handling...');
                const errorType = node.content.toString().includes('Bad MAC') ? 'bad_mac' : 'iq_session_error';
                handleSessionError(errorType);
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
process.on('uncaughtException', async (error) => {
    console.error('💥 Uncaught Exception:', error.message);
    
    // Handle Bad MAC errors specifically
    if (error.message.includes('Bad MAC') || 
        error.message.includes('Failed to decrypt message') ||
        error.message.includes('verifyMAC')) {
        console.log('🔧 Bad MAC uncaught exception detected - forcing session cleanup...');
        // Force immediate session cleanup for Bad MAC errors
        sessionErrorCount = maxSessionErrors;
        handleSessionError('bad_mac_uncaught');
        return;
    }
    
    // Send offline notification before crashing
    if (currentSocket && hasSetOnlineStatus) {
        try {
            await sendStatusNotification('offline', currentSocket);
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (notifError) {
            console.error('❌ Error sending crash offline notification:', notifError.message);
        }
    }
    
    isConnecting = false; // Reset connection state
    hasSetOnlineStatus = false;
    console.log('🔄 Restarting bot in 5 seconds...');
    setTimeout(() => {
        main(); // Restart the bot instead of exiting
    }, 5000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    
    // Handle Bad MAC errors in promise rejections
    if (reason && reason.message && (reason.message.includes('Bad MAC') || 
        reason.message.includes('Failed to decrypt message') ||
        reason.message.includes('verifyMAC'))) {
        console.log('🔧 Bad MAC unhandled rejection detected - forcing session cleanup...');
        sessionErrorCount = maxSessionErrors;
        handleSessionError('bad_mac_rejection');
    }
});

// Handle graceful shutdown
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

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