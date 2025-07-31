/**
 * Check Warnings Command for Konoha LM Bot
 * Displays warnings for a specific user in the group
 */

const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'checkwarns',
    aliases: ['warnings', 'warns', 'warninfo'],
    category: 'group',
    description: 'Check warnings for yourself or a mentioned user',
    
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
            
            // Get target user to check warnings
            let targetJid = '';
            
            // If replying to a message, check that user
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
            // If no user specified, return the command sender's warnings
            else {
                targetJid = m.sender;
            }
            
            // If not checking own warnings and not an admin, deny access
            if (targetJid !== m.sender && !isAdmin) {
                return m.reply('⚠️ Only admins can check other users\' warnings. You can check your own warnings though.');
            }
            
            // Send initial message
            const initialMsg = await bot.sendMessage(m.chat, { text: '🔍 Checking warnings...' }, { quoted: m });
            
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
                    text: `✓ @${targetUser} has no warnings in this group.`,
                    mentions: [targetJid],
                    edit: initialMsg.key
                });
            }
            
            // Get the user's warnings
            const userWarnings = warningsData[m.chat][targetJid];
            const warningCount = userWarnings.count;
            const reasons = userWarnings.reasons || [];
            
            // Create response message
            let warningsMsg = `⚠️ *WARNINGS FOR @${targetUser}* ⚠️\n\n`;
            warningsMsg += `*Current Warning Count:* ${warningCount}/3\n\n`;
            
            if (reasons.length > 0) {
                warningsMsg += `*Warning History:*\n`;
                
                reasons.forEach((warning, index) => {
                    const warnDate = new Date(warning.time).toLocaleString();
                    const adminName = warning.by.split('@')[0];
                    
                    warningsMsg += `${index + 1}. ${warning.reason}\n`;
                    warningsMsg += `   By: ${adminName} on ${warnDate}\n`;
                });
            }
            
            // Send the warnings info
            await bot.sendMessage(m.chat, { 
                text: warningsMsg,
                mentions: [targetJid],
                edit: initialMsg.key
            });
            
        } catch (error) {
            console.error('Error in checkwarns command:', error);
            return m.reply('❌ Failed to check warnings.');
        }
    }
};