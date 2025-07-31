/**
 * Group Info Command for Konoha LM Bot
 * Shows detailed information about the current group
 */

const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'groupinfo',
    aliases: ['ginfo', 'group', 'infogroup'],
    category: 'group',
    description: 'Shows detailed information about the current group',
    
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
        
        // First message - will be edited later
        await m.reply('🔍 Fetching group information...');
        
        try {
            // Get the group information with a timeout
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 10000)
            );
            
            // Try to get the group metadata
            let groupMetadata;
            try {
                groupMetadata = await Promise.race([
                    bot.groupMetadata(m.chat),
                    timeoutPromise
                ]);
            } catch (err) {
                console.error('Failed to fetch group metadata:', err);
                return m.reply('❌ Failed to fetch group information. Please try again later.');
            }
            
            // Basic group information
            let infoMsg = `*📊 GROUP INFORMATION*\n\n`;
            infoMsg += `*📝 Name:* ${groupMetadata.subject || 'Unknown'}\n`;
            infoMsg += `*🆔 ID:* ${m.chat}\n`;
            
            // Group owner
            if (groupMetadata.owner) {
                const formattedOwner = `@${groupMetadata.owner.split('@')[0]}`;
                infoMsg += `*👑 Created by:* ${formattedOwner}\n`;
            } else {
                infoMsg += `*👑 Created by:* Unknown\n`;
            }
            
            // Check for custom owners
            try {
                const ownersPath = path.join(process.cwd(), 'data', 'groupowners.json');
                if (fs.existsSync(ownersPath)) {
                    const ownersRaw = fs.readFileSync(ownersPath, 'utf8');
                    if (ownersRaw && ownersRaw.trim()) {
                        const owners = JSON.parse(ownersRaw);
                        if (owners[m.chat]) {
                            const formattedCustomOwner = `@${owners[m.chat].split('@')[0]}`;
                            infoMsg += `*👤 Custom owner:* ${formattedCustomOwner}\n`;
                        }
                    }
                }
            } catch (err) {
                console.log('Could not fetch custom owners:', err.message);
                // Continue without custom owner info
            }
            
            // Group statistics
            const participants = groupMetadata.participants || [];
            const participantCount = participants.length;
            const adminCount = participants.filter(p => p.admin).length;
            
            infoMsg += `*👥 Participants:* ${participantCount}\n`;
            infoMsg += `*👮 Admins:* ${adminCount}\n`;
            
            // Creation date if available
            if (groupMetadata.creation) {
                const creationDate = new Date(groupMetadata.creation * 1000);
                infoMsg += `*📅 Created on:* ${creationDate.toLocaleString()}\n`;
            }
            
            // Group description
            if (groupMetadata.desc) {
                infoMsg += `\n*📜 Description:*\n${groupMetadata.desc}\n`;
            }
            
            // List admins with mentions
            const mentions = [];
            if (participants.length > 0) {
                infoMsg += `\n*👮 GROUP ADMINS:*\n`;
                const adminList = participants
                    .filter(p => p.admin)
                    .map(admin => {
                        const jid = admin.id;
                        mentions.push(jid);
                        return `• @${jid.split('@')[0]}`;
                    });
                
                if (adminList.length > 0) {
                    infoMsg += adminList.join('\n');
                } else {
                    infoMsg += 'No admins found';
                }
            }
            
            // Add group creator to mentions if available
            if (groupMetadata.owner) {
                mentions.push(groupMetadata.owner);
            }
            
            // Add custom owner to mentions if available
            try {
                const ownersPath = path.join(process.cwd(), 'data', 'groupowners.json');
                if (fs.existsSync(ownersPath)) {
                    const ownersRaw = fs.readFileSync(ownersPath, 'utf8');
                    if (ownersRaw && ownersRaw.trim()) {
                        const owners = JSON.parse(ownersRaw);
                        if (owners[m.chat]) {
                            mentions.push(owners[m.chat]);
                        }
                    }
                }
            } catch (err) {
                // Ignore errors here
            }
            
            // Send the final message - no image to avoid extra potential failures
            await bot.sendMessage(m.chat, {
                text: infoMsg,
                mentions: [...new Set(mentions)] // Remove duplicates
            });
            
        } catch (error) {
            console.error('Error in groupinfo command:', error);
            await m.reply('❌ An error occurred while processing group information.');
        }
    }
};