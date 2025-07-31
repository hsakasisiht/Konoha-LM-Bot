/**
 * Reset Warnings Command for Konoha LM Bot
 * Allows group admins to reset warnings for a specific user
 */

const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'resetwarns',
    aliases: ['clearwarns', 'resetwarn', 'clearwarn'],
    category: 'admin',
    description: 'Resets all warnings for a user in the group (Admin Only)',
    
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
            
            if (!isAdmin) {
                return m.reply('⚠️ This command can only be used by group admins!');
            }
            
            // Get target user to reset warnings
            let targetJid = '';
            
            // If replying to a message, reset that user's warnings
            if (m.quoted) {
                targetJid = m.quoted.sender;
            } 
            // If mentioning someone
            else if (m.mentionedJid && Array.isArray(m.mentionedJid) && m.mentionedJid.length > 0) {
                targetJid = m.mentionedJid[0];
            }
            // Check if message text contains a mention pattern (@xxxxxxxxx)
            else if (m.body && m.body.match(/@(\d+)/)) {
                // Extract the number from the @mention
                const mentionedNumber = m.body.match(/@(\d+)/)[1];
                targetJid = `${mentionedNumber}@s.whatsapp.net`;
            }
            // Invalid usage
            else {
                return m.reply('⚠️ Please mention a user or reply to their message to reset warnings.');
            }
            
            // Extra validation for JID format
            if (!targetJid.includes('@')) {
                return m.reply('❌ Invalid user mention format. Please try again.');
            }
            
            // Send initial message
            const initialMsg = await bot.sendMessage(m.chat, { text: '🔄 Resetting warnings...' }, { quoted: m });
            
            // Load warnings data
            const warningsPath = path.join(process.cwd(), 'data', 'warnings.json');
            let warningsData = {};
            
            if (fs.existsSync(warningsPath)) {
                try {
                    const fileContent = fs.readFileSync(warningsPath, 'utf8');
                    if (fileContent && fileContent.trim()) {
                        warningsData = JSON.parse(fileContent);
                    }
                } catch (error) {
                    console.error('Error reading warnings file:', error);
                    return bot.sendMessage(m.chat, { 
                        text: '❌ Error reading warnings data.',
                        edit: initialMsg.key
                    });
                }
            } else {
                // No warnings file exists
                return bot.sendMessage(m.chat, { 
                    text: '✓ No warnings have been issued yet.',
                    edit: initialMsg.key
                });
            }
            
            // Get user name for message
            const targetUser = targetJid.split('@')[0];
            
            // Check if the group has any warnings
            if (!warningsData[m.chat]) {
                return bot.sendMessage(m.chat, { 
                    text: '✓ No warnings have been issued in this group.',
                    edit: initialMsg.key
                });
            }
            
            // Check if the user has any warnings
            if (!warningsData[m.chat][targetJid] || warningsData[m.chat][targetJid].count === 0) {
                return bot.sendMessage(m.chat, { 
                    text: `✓ @${targetUser} has no warnings to reset.`,
                    mentions: [targetJid],
                    edit: initialMsg.key
                });
            }
            
            // Get the current warning count for the notification
            const previousWarnings = warningsData[m.chat][targetJid].count;
            
            // Reset warnings
            warningsData[m.chat][targetJid] = {
                count: 0,
                reasons: []
            };
            
            // Save updated warnings
            fs.writeFileSync(warningsPath, JSON.stringify(warningsData, null, 2));
            
            // Send success message
            return bot.sendMessage(m.chat, { 
                text: `✅ Successfully reset warnings for @${targetUser}.\n*Previous warnings:* ${previousWarnings}`,
                mentions: [targetJid],
                edit: initialMsg.key
            });
            
        } catch (error) {
            console.error('Error in resetwarns command:', error);
            return m.reply('❌ Failed to reset warnings.');
        }
    }
};