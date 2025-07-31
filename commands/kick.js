/**
 * Kick Command for Konoha LM Bot
 * Allows group admins to remove members from the group
 */

module.exports = {
    name: 'kick',
    aliases: ['remove', 'ban'],
    category: 'admin',
    description: 'Kicks a user from the group (Admin Only)',
    
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
            
            console.log(`Bot ID formats - Original: ${botId}, Processed: ${botNumber}`);
            console.log(`Bot admin status: ${isBotAdmin ? 'YES' : 'NO'}`);
            console.log(`Group participants:`, groupMetadata.participants.map(p => p.id));
            
            if (!isAdmin) {
                return m.reply('⚠️ This command can only be used by group admins!');
            }
            
            if (!isBotAdmin) {
                return m.reply('⚠️ I need to be an admin to kick users!');
            }
            
            // Get target user to kick
            let targetJid = '';
            
            // If replying to a message, kick that user
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
                return m.reply('⚠️ Please mention a user or reply to their message to kick them.');
            }
            
            // Make sure target JID is valid
            if (!targetJid || !targetJid.includes('@')) {
                return m.reply('❌ Invalid user specified. Please try again.');
            }
            
            // Don't allow kicking admins
            const targetIsAdmin = groupMetadata.participants.find(p => p.id === targetJid)?.admin;
            if (targetIsAdmin) {
                return m.reply('❌ Cannot kick another admin!');
            }
            
            // Don't allow kicking the bot itself
            if (targetJid === botNumber || targetJid === botId) {
                return m.reply('❌ I cannot kick myself!');
            }
            
            // Send initial message
            const initialMsg = await bot.sendMessage(m.chat, { text: '🔄 Processing kick request...' }, { quoted: m });
            
            // Get user name for message
            const targetUser = targetJid.split('@')[0];
            
            console.log(`Attempting to kick: ${targetJid}`);
            
            // Kick the user
            await bot.groupParticipantsUpdate(
                m.chat, 
                [targetJid], 
                'remove'
            );
            
            // Edit message to success
            await bot.sendMessage(m.chat, { 
                text: `✅ Successfully kicked @${targetUser} from the group.`,
                mentions: [targetJid],
                edit: initialMsg.key
            });
            
        } catch (error) {
            console.error('Error in kick command:', error);
            return m.reply('❌ Failed to kick user. Please check if I have sufficient permissions.');
        }
    }
};