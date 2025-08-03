/**
 * Konoha LM Bot v1.3.1
 * WhatsApp Multi-Device Bot - Production Optimized
 * 
 * Using @fizzxydev/baileys-pro for enhanced features
 */
require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const PhoneNumber = require('awesome-phonenumber')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia } = require('./lib/myfunc')
const commandHandler = require('./lib/commandHandler')
const SessionManager = require('./lib/sessionManager')
const logger = require('./lib/productionLogger')
const { 
    default: makeWASocket,
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    downloadContentFromMessage,
    makeCacheableSignalKeyStore,
    jidNormalizedUser,
    jidDecode,
    delay
} = require("@fizzxydev/baileys-pro")
const { makeInMemoryStore } = require("@fizzxydev/baileys-pro")
const NodeCache = require("node-cache")
const pino = require("pino")
const readline = require("readline")

// Configure pino logger with production settings
const isProduction = process.env.NODE_ENV === 'production'
const pinoLogger = pino({ 
    level: isProduction ? 'error' : 'warn'
})

// Initialize session manager
const sessionManager = new SessionManager('./session')

// Override console.log to filter out verbose session messages
const originalConsoleLog = console.log
console.log = function() {
    // Convert argument to string if possible for checking
    const logMessage = arguments[0]?.toString() || ''
    
    // List of patterns to filter out in production
    const filterPatterns = [
        'Closing stale open session',
        'SessionEntry',
        '_chains',
        'chainKey',
        'chainType',
        'messageKeys',
        'registrationId',
        'currentRatchet',
        'ephemeralKeyPair',
        'lastRemoteEphemeralKey',
        'rootKey',
        'baseKey',
        'preKeyId'
    ]
    
    // In production, filter more aggressively
    const shouldFilter = isProduction && filterPatterns.some(pattern => logMessage.includes(pattern))
    
    // Only log if the message doesn't match our filter patterns
    if (!shouldFilter) {
        originalConsoleLog.apply(console, arguments)
    }
}

// Ensure session directory exists
if (!fs.existsSync('./session')) {
    logger.info('Creating new session directory...')
    fs.mkdirSync('./session', { recursive: true })
}

// Add connection state tracking
let isReconnecting = false
let connectionAttempts = 0
const maxReconnectAttempts = 5
const reconnectDelay = 10000 // 10 seconds between reconnection attempts

// Create directory for storing owner information if it doesn't exist
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data')
}

// Create owner.json if it doesn't exist
if (!fs.existsSync('./data/owner.json')) {
    fs.writeFileSync('./data/owner.json', JSON.stringify([global.ownernumber], null, 2))
}

// Create memory store for caching with production optimizations
const store = makeInMemoryStore({
    logger: pino().child({
        level: 'silent',
        stream: 'store'
    })
})

// Optimize store for production
if (isProduction) {
    // Clear store periodically to prevent memory leaks
    setInterval(() => {
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed > 200 * 1024 * 1024) { // 200MB
            logger.warn('High memory usage detected, clearing store cache');
            store.contacts = {};
            store.chats = {};
            store.messages = {};
        }
    }, 30 * 60 * 1000); // Check every 30 minutes
}

// Always use pairing code for authentication
const pairingCode = true
const useMobile = process.argv.includes("--mobile")

// Create readline interface for user input
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))
         
async function startBot() {
    // Emergency session cleanup check
    await sessionManager.emergencyCleanup()
    
    // Get the latest Baileys version
    let { version, isLatest } = await fetchLatestBaileysVersion()
    logger.info(`Using Baileys version: ${version}, Latest: ${isLatest}`)
    
    // Set up authentication state
    const { state, saveCreds } = await useMultiFileAuthState(`./session`)
    const msgRetryCounterCache = new NodeCache({
        stdTTL: 600, // 10 minutes TTL
        checkperiod: 120, // Check every 2 minutes
        maxKeys: 1000 // Limit cache size
    })

    // Check if there are existing credentials
    const hasExistingSession = state.creds.registered

    // Create WhatsApp connection with production optimizations
    const bot = makeWASocket({
        version,
        logger: pino({ level: isProduction ? 'silent' : 'fatal' }),
        printQRInTerminal: false, // Always use pairing code instead of QR
        browser: ["Ubuntu", "Chrome", "20.0.04"], // Browser identification
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: !isProduction, // Disable in production for performance
        getMessage: async (key) => {
            let jid = jidNormalizedUser(key.remoteJid)
            let msg = await store.loadMessage(jid, key.id)
            return msg?.message || ""
        },
        msgRetryCounterCache,
        defaultQueryTimeoutMs: undefined,
        // Enhanced features from baileys-pro
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        // Optimized for production
        syncFullHistory: false, // Don't sync full history to save resources
        shouldSyncHistoryMessage: () => false, // Skip history sync
        // Event emissions - reduce in production
        emitOwnEvents: !isProduction,
        emitPresenceEvents: false, // Disable presence for performance
        emitReadEvents: false,
        emitReactionEvents: true,
        emitTypingEvents: false, // Disable typing for performance
        emitGroupEvents: true,
        emitCallEvents: true,
        emitStatusEvents: false, // Disable status for performance
        emitMessageEvents: true,
        emitContactEvents: false, // Disable contact events for performance
        emitChatEvents: true,
        // Enhanced security features
        fireInitQueries: true,
    })

    // Bind memory store to connection events
    store.bind(bot.ev)

    // Additional helper method
    bot.decodeJid = (jid) => {
        if (!jid) return jid
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {}
            return decode.user && decode.server && decode.user + '@' + decode.server || jid
        } else return jid
    }

    // Helper to get name from JID
    bot.getName = (jid, withoutContact = false) => {
        const id = bot.decodeJid(jid)
        withoutContact = bot.withoutContact || withoutContact 
        let v
        if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
            v = store.contacts[id] || {}
            if (!(v.name || v.subject)) v = await bot.groupMetadata(id) || {}
            resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
        })
        else v = id === '0@s.whatsapp.net' ? {
            id,
            name: 'WhatsApp'
        } : id === bot.decodeJid(bot.user.id) ? 
            bot.user :
            (store.contacts[id] || {})
        return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
    }

    // Set public mode
    bot.public = true

    // Message serializer
    bot.serializeM = (m) => smsg(bot, m, store)

    // Handle pairing code for authentication
    if (!hasExistingSession) {
        if (useMobile) throw new Error('Cannot use pairing code with mobile api')
        
        console.log(chalk.cyan('='.repeat(50)))
        console.log(chalk.yellow('🔄 No WhatsApp session found or session expired'))
        console.log(chalk.yellow('📱 Please link your WhatsApp account using a pairing code'))
        console.log(chalk.cyan('='.repeat(50)))
        
        // Always ask for phone number regardless of settings
        const phoneNumber = await question(chalk.bgBlack(chalk.greenBright(`📱 Please enter your full WhatsApp number:\n(include country code, e.g., +1234567890): `)))
        
        // Clean the phone number (remove non-numeric characters except the + at beginning)
        const cleanedNumber = phoneNumber.startsWith('+') 
            ? phoneNumber.substring(1).replace(/[^0-9]/g, '') 
            : phoneNumber.replace(/[^0-9]/g, '')
        
        if (cleanedNumber.length < 10) {
            console.log(chalk.red('❌ Invalid phone number format. Please restart the bot and try again.'))
            process.exit(1)
        }

        console.log(chalk.yellow(`\n⏳ Generating pairing code for: +${cleanedNumber}\n`))
        
        // Add enhanced error handling for requestPairingCode
        setTimeout(async () => {
            try {
                let code = await bot.requestPairingCode(cleanedNumber)
                code = code?.match(/.{1,4}/g)?.join("-") || code
                
                console.log(chalk.cyan('='.repeat(50)))
                console.log(chalk.greenBright(`✅ YOUR WHATSAPP PAIRING CODE: ${code}`))
                console.log(chalk.yellow(`\n📋 Instructions:
1. Open WhatsApp on your phone
2. Go to Settings > Linked Devices > Link a Device
3. When prompted, enter the code above
4. Keep this window open until connection is established`))
                console.log(chalk.cyan('='.repeat(50)))
                
                // Update owner.json with the new number
                fs.writeFileSync('./data/owner.json', JSON.stringify([cleanedNumber], null, 2))
                
            } catch (error) {
                console.error("Error while requesting pairing code:", error)
                console.log(chalk.red("❌ Failed to generate pairing code. Please check your connection or phone number format."))
                process.exit(1)
            }
        }, 3000)
    } else {
        console.log(chalk.green('✅ Existing session found, reconnecting...'))
    }

    // Load commands
    commandHandler.loadCommands('./commands')

    // Auto-kick banned users on join or add
    bot.ev.on('group-participants.update', async (update) => {
        const bansPath = path.resolve(__dirname, './data/groupbans.json');
        const freezePath = path.resolve(__dirname, './data/groupfreezes.json');
        if (!fs.existsSync(bansPath)) return;
        const bans = JSON.parse(fs.readFileSync(bansPath, 'utf-8'));
        const groupId = update.id;
        if (!bans[groupId] || bans[groupId].length === 0) return;
        // Check freeze state
        let isFrozen = false;
        if (fs.existsSync(freezePath)) {
            const freezes = JSON.parse(fs.readFileSync(freezePath, 'utf-8'));
            const freezeUntil = freezes[groupId];
            if (freezeUntil && Date.now() < freezeUntil) {
                isFrozen = true;
            }
        }
        if ((update.action === 'add' || update.action === 'join') && !isFrozen) {
            try {
                const groupMetadata = await bot.groupMetadata(groupId);
                const members = groupMetadata.participants.map(p => p.id);
                for (const userJid of members) {
                    if (bans[groupId].includes(userJid)) {
                        try {
                            await bot.groupParticipantsUpdate(groupId, [userJid], 'remove');
                            await bot.sendMessage(groupId, { text: `🚫 @${userJid.split('@')[0]} is banned and was auto-kicked.`, mentions: [userJid] });
                        } catch (err) {
                            await bot.sendMessage(groupId, { text: `❌ Failed to auto-kick banned user @${userJid.split('@')[0]}. Please check my admin permissions.`, mentions: [userJid] });
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching group metadata or kicking:', err);
            }
        }
    });

    // Connection handling
    bot.ev.on('connection.update', async (s) => {
        const { connection, lastDisconnect } = s
        
        if (connection === "open") {
            // Reset reconnection tracking since connection is successful
            isReconnecting = false;
            connectionAttempts = 0;
            
            logger.success(`Connected to WhatsApp as: ${bot.user.name} (${bot.user.id})`);
            
            // Session monitoring
            const sessionFileCount = sessionManager.getSessionFileCount();
            logger.info(`Session files count: ${sessionFileCount}`);
            
            // Initialize Google Drive monitoring if configured
            try {
                const DriveMonitor = require('./lib/driveMonitor');
                global.driveMonitor = new DriveMonitor();
                
                const config = global.driveMonitor.loadConfig();
                if (config) {
                    logger.info('Drive monitoring configuration found, starting automatic monitoring...');
                    // Auto-start monitoring if previously configured
                    setTimeout(() => {
                        global.driveMonitor.startMonitoring(bot).catch(err => {
                            logger.error('Failed to auto-start Drive monitoring:', err.message);
                        });
                    }, 10000); // Start after 10 seconds to ensure bot is fully ready
                }
            } catch (error) {
                logger.debug('Drive monitoring not available:', error.message);
            }
            
            // Send message to bot's own number (only in development)
            if (!isProduction) {
                const botNumber = bot.user.id.split(':')[0] + '@s.whatsapp.net'
                
                const startupMessages = [
                    "✨ *Konoha LM Bot is now online!* ✨",
                    "🤖 Ready to assist you with advanced LM capabilities.",
                    `🌟 Version ${global.version}`,
                    `📁 Session files: ${sessionFileCount}`,
                    `🔄 Drive monitoring: ${global.driveMonitor && global.driveMonitor.loadConfig() ? 'Configured' : 'Not configured'}`
                ]
                
                try {
                    await bot.sendMessage(botNumber, { text: startupMessages.join("\n\n") })
                } catch (err) {
                    logger.debug("Could not send startup message to self")
                }
            }
            
            // Console startup info
            console.log(chalk.green('╔═══════════════════════════════════════════╗'))
            console.log(chalk.green('║         KONOHA LM BOT IS RUNNING         ║'))
            console.log(chalk.green('╟───────────────────────────────────────────╢'))
            console.log(chalk.green('║') + chalk.yellow(` • Version: ${global.version}                     `) + chalk.green('║'))
            console.log(chalk.green('║') + chalk.yellow(` • Prefix: ${global.prefix}                          `) + chalk.green('║'))
            console.log(chalk.green('║') + chalk.yellow(` • Environment: ${isProduction ? 'Production' : 'Development'}              `) + chalk.green('║'))
            console.log(chalk.green('║') + chalk.yellow(` • Session Files: ${sessionFileCount}                    `) + chalk.green('║'))
            console.log(chalk.green('╚═══════════════════════════════════════════╝'))
            
            // Close readline interface once connected
            if (rl && rl.listening) {
                rl.close();
            }
        } else if (connection === "close") {
            // Handle disconnections properly
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            
            logger.warn(`Connection closed: ${lastDisconnect?.error?.output?.payload?.message || 'Unknown reason'}`);
            
            // If not already reconnecting and should reconnect
            if (!isReconnecting && shouldReconnect && connectionAttempts < maxReconnectAttempts) {
                isReconnecting = true;
                connectionAttempts += 1;
                
                logger.info(`Reconnection attempt ${connectionAttempts}/${maxReconnectAttempts} in ${reconnectDelay/1000}s...`);
                
                // Wait before attempting to reconnect
                setTimeout(() => {
                    logger.info('Attempting to reconnect...');
                    isReconnecting = false;
                    startBot();
                }, reconnectDelay);
                
            } else if (connectionAttempts >= maxReconnectAttempts) {
                logger.error(`Too many reconnection attempts (${connectionAttempts}). Manual restart required.`);
                process.exit(1);
            } else if (!shouldReconnect) {
                logger.error('Connection closed permanently. Re-authentication required.');
                // Delete session files if logged out
                if (lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
                    logger.warn('Logged out from WhatsApp, cleaning up session...');
                    try {
                        // Remove session directory
                        if (fs.existsSync('./session')) {
                            fs.rmSync('./session', { recursive: true, force: true });
                            logger.success('Session files removed. Please restart to re-authenticate.');
                        }
                    } catch (err) {
                        logger.error('Failed to clean up session:', err.message);
                    }
                }
                process.exit(0);
            }
        } else if (connection === "connecting") {
            logger.info('Connecting to WhatsApp...');
        }
    })

    // Update credentials when they change
    bot.ev.on('creds.update', saveCreds)
    
    // Basic message handling
    bot.ev.on('messages.upsert', async chatUpdate => {
        try {
            const mek = chatUpdate.messages[0]
            if (!mek.message) return
            
            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? 
                mek.message.ephemeralMessage.message : mek.message
                
            if (mek.key && mek.key.remoteJid === 'status@broadcast') return
            
            if (!bot.public && !mek.key.fromMe && chatUpdate.type === 'notify') return
            
            const m = smsg(bot, mek, store)
            
            // Enhanced Excel file detection
            const isDocumentMessage = m.mtype === 'documentMessage';
            const hasExcelExtension = isDocumentMessage && (
                m.msg.fileName?.toLowerCase().endsWith('.xlsx') ||
                m.msg.fileName?.toLowerCase().endsWith('.xls')
            );
            const isExcelMimeType = isDocumentMessage && 
                m.msg.mimetype && 
                (m.msg.mimetype.includes('spreadsheetml') ||
                 m.msg.mimetype.includes('excel') ||
                 m.msg.mimetype.includes('sheet'));
                
            // Check if there's a direct command in the caption
            const hasDirectCommand = m.body && m.body.trim().startsWith(global.prefix);
            
            // Handle Excel files with commands
            if (isDocumentMessage && (hasExcelExtension || isExcelMimeType)) {
                console.log(chalk.green(`📊 Excel file detected: ${m.msg.fileName}`));
                
                // If it has a direct command, handle it normally
                if (hasDirectCommand) {
                    console.log(chalk.cyan(`Command in caption: ${m.body}`));
                    const wasHandled = await commandHandler.handleCommand(bot, m, global.prefix);
                    if (wasHandled) return;
                }
                // If it has analyze-related keywords but no direct command
                else if (m.body && (
                    m.body.toLowerCase().includes('analyze') || 
                    m.body.toLowerCase().includes('excel') || 
                    m.body.toLowerCase().includes('check')
                )) {
                    console.log(chalk.green(`📊 Excel file with analyze keyword in caption: ${m.msg.fileName}`));
                    
                    // Extract target score if present in the caption
                    let targetScore = 0;
                    const scoreMatch = m.body.match(/\b(\d+)\b/);
                    if (scoreMatch) {
                        targetScore = parseInt(scoreMatch[1]);
                        console.log(chalk.cyan(`Found target score in caption: ${targetScore}`));
                    }
                    
                    // Create a custom message with the analyze command
                    const analyzeCommand = `${global.prefix}analyze ${targetScore}`;
                    console.log(chalk.cyan(`Auto-converting to command: ${analyzeCommand}`));
                    
                    // Make a copy of the message with the analyze command in body
                    const analyzeMessage = {...m};
                    analyzeMessage.body = analyzeCommand;
                    
                    // Execute the analyze command with the message
                    const analyzeCommandExecution = await commandHandler.handleCommand(bot, analyzeMessage, global.prefix);
                    if (analyzeCommandExecution) return;
                }
            }
            
            // Normal command handling
            if (m.body && m.body.startsWith(global.prefix)) {
                const wasHandled = await commandHandler.handleCommand(bot, m, global.prefix)
                if (wasHandled) return
            }
            
        } catch (err) {
            console.error("Error in message handler:", err)
        }
    })

    return bot
}

// Start the bot with error handling
startBot().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
})

// Better error handling
process.on('uncaughtException', (err) => {
    console.log(chalk.red('Uncaught Exception:'), err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.log(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
    // Don't exit here as it might be recoverable
});