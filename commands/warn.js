/**
 * Warn Command for Konoha LM Bot
 * Allows group admins to warn users, auto-kicks after 3 warnings
 */

const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'warn',
    aliases: ['warning', 'addwarn'],
    category: 'admin',
    description: 'Warns a user. After 3 warnings, user is kicked (Admin Only)',
    
    /**
     * Command execution function
     * @param {Object} bot - The bot client instance
     * @param {Object} m - Message object containing information about the message
     * @param {Array} args - Command arguments
     * @param {String} text - Full command text
     */
    async execute(bot, m, args, text) {
        // Check if command is used in a group
        if (!m.isGroup) {
            return m.reply('⚠️ This command can only be used in groups!');
        }
        
        try {
            // Check if user is admin
            const groupMetadata = await bot.groupMetadata(m.chat);
            const isAdmin = groupMetadata.participants.find(p => p.id === m.sender)?.admin;
            
            // Improved bot admin detection
            const botId = bot.user.id;
            const botNumber = botId.includes(':') ? botId.split(':')[0] + '@s.whatsapp.net' : botId;
            
            // Try multiple possible formats of the bot's ID
            const isBotAdmin = groupMetadata.participants.some(p => 
                (p.id === botNumber || p.id === botId || p.id === bot.user.jid) && p.admin
            );
            
            console.log(`[WARN] Bot ID formats - Original: ${botId}, Processed: ${botNumber}`);
            console.log(`[WARN] Bot admin status: ${isBotAdmin ? 'YES' : 'NO'}`);
            
            if (!isAdmin) {
                return m.reply('⚠️ This command can only be used by group admins!');
            }
            
            // Get target user to warn
            let targetJid = '';
            
            // If replying to a message, warn that user
            if (m.quoted) {
                targetJid = m.quoted.sender;
            } 
            // If mentioning someone - improved mention detection
            else if (m.mentionedJid && Array.isArray(m.mentionedJid) && m.mentionedJid.length > 0) {
                targetJid = m.mentionedJid[0];
                console.log(`Mention detected: ${targetJid}`);
            }
            // Check if message text contains a mention pattern (@xxxxxxxxx)
            else if (m.body && m.body.match(/@(\d+)/)) {
                // Extract the number from the @mention
                const mentionedNumber = m.body.match(/@(\d+)/)[1];
                targetJid = `${mentionedNumber}@s.whatsapp.net`;
                console.log(`Manual mention extraction: ${targetJid}`);
            }
            // Invalid usage
            else {
                console.log('No mention detected. Message:', m.body);
                console.log('mentionedJid property:', m.mentionedJid);
                return m.reply('⚠️ Please mention a user or reply to their message to warn them.');
            }
            
            // Debug log for troubleshooting
            console.log(`Target user JID: ${targetJid}`);
            
            // Extra validation for JID format
            if (!targetJid.includes('@')) {
                return m.reply('❌ Invalid user mention format. Please try again.');
            }
            
            // Don't allow warning admins
            const targetIsAdmin = groupMetadata.participants.find(p => p.id === targetJid)?.admin;
            if (targetIsAdmin) {
                return m.reply('❌ Cannot warn another admin!');
            }
            
            // Don't allow warning the bot itself
            if (targetJid === botNumber || targetJid === botId) {
                return m.reply('❌ You cannot warn me!');
            }
            
            // Get warning reason - exclude the mention part if present
            let reason;
            if (args.length > 0) {
                // Filter out any @mention from the args
                reason = args.filter(arg => !arg.startsWith('@')).join(' ');
                if (!reason.trim()) reason = 'No reason provided';
            } else {
                reason = 'No reason provided';
            }
            
            // Send initial message
            const initialMsg = await bot.sendMessage(m.chat, { text: '🔄 Processing warning...' }, { quoted: m });
            
            // Load warnings data
            const warningsPath = path.join(process.cwd(), 'data', 'warnings.json');
            let warningsData = {};
            
            if (fs.existsSync(warningsPath)) {
                try {
                    const fileContent = fs.readFileSync(warningsPath, 'utf8');
                    if (fileContent.trim()) {
                        warningsData = JSON.parse(fileContent);
                    }
                } catch (error) {
                    console.error('Error reading warnings file:', error);
                }
            }
            
            // Initialize group warnings if not exist
            if (!warningsData[m.chat]) {
                warningsData[m.chat] = {};
            }
            
            // Initialize user warnings if not exist
            if (!warningsData[m.chat][targetJid]) {
                warningsData[m.chat][targetJid] = {
                    count: 0,
                    reasons: []
                };
            }
            
            // Add warning
            warningsData[m.chat][targetJid].count += 1;
            warningsData[m.chat][targetJid].reasons.push({
                reason: reason,
                by: m.sender,
                time: Date.now()
            });
            
            // Get current warning count
            const warningCount = warningsData[m.chat][targetJid].count;
            
            // Save updated warnings
            fs.writeFileSync(warningsPath, JSON.stringify(warningsData, null, 2));
            
            // Get user name for message
            const targetUser = targetJid.split('@')[0];
            
            // Create warning message
            let warnMsg = `⚠️ *WARNING NOTICE* ⚠️\n\n`;
            warnMsg += `@${targetUser} has been warned by admin.\n`;
            warnMsg += `*Reason:* ${reason}\n`;
            warnMsg += `*Warning Count:* ${warningCount}/3\n\n`;
            
            if (warningCount >= 3) {
                warnMsg += `‼️ Maximum warnings reached. User will be removed from the group.`;
                
                // Check bot admin status before kicking
                if (isBotAdmin) {
                    // Edit message to show warning
                    await bot.sendMessage(m.chat, { 
                        text: warnMsg,
                        mentions: [targetJid],
                        edit: initialMsg.key
                    });
                    
                    // Wait a moment before kicking
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    console.log(`[WARN] Attempting to kick ${targetJid} after max warnings`);
                    
                    try {
                        // Kick the user
                        await bot.groupParticipantsUpdate(
                            m.chat, 
                            [targetJid], 
                            'remove'
                        );
                        
                        // Reset warnings after kick
                        warningsData[m.chat][targetJid].count = 0;
                        warningsData[m.chat][targetJid].reasons = [];
                        fs.writeFileSync(warningsPath, JSON.stringify(warningsData, null, 2));
                        
                        // Send kick message
                        await bot.sendMessage(m.chat, { 
                            text: `🚫 @${targetUser} has been kicked from the group after receiving 3 warnings.`,
                            mentions: [targetJid]
                        });
                    } catch (kickError) {
                        console.error('[WARN] Failed to kick user:', kickError);
                        await bot.sendMessage(m.chat, { 
                            text: `❌ Failed to kick @${targetUser}: ${kickError.message}. Please try manual kick.`,
                            mentions: [targetJid]
                        });
                    }
                } else {
                    warnMsg += `\n\n⚠️ Unable to remove user, please make me an admin!`;
                    console.log(`[WARN] Bot is not detected as admin. ID formats - Original: ${botId}, Processed: ${botNumber}`);
                    console.log(`[WARN] Group participants:`, groupMetadata.participants.map(p => ({id: p.id, admin: p.admin})));
                    
                    // Edit message to show warning
                    await bot.sendMessage(m.chat, { 
                        text: warnMsg,
                        mentions: [targetJid],
                        edit: initialMsg.key
                    });
                }
            } else {
                // Edit message to show warning
                await bot.sendMessage(m.chat, { 
                    text: warnMsg,
                    mentions: [targetJid],
                    edit: initialMsg.key
                });
            }
            
        } catch (error) {
            console.error('Error in warn command:', error);
            return m.reply('❌ Failed to warn user.');
        }
    }
};