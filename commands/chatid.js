const chalk = require('chalk');
const logger = require('../lib/productionLogger');

module.exports = {
    name: "chatid",
    aliases: ["cid", "id"],
    category: "utility", 
    description: "Get the current chat ID (works in groups and private chats)",
    
    async execute(bot, m, args, text) {
        try {
            const { chat: from, sender, isGroup } = m;
            
            let chatInfo = `🆔 *Chat ID Information*\n\n`;
            
            if (isGroup) {
                // Get group metadata for additional info
                try {
                    const groupMetadata = await bot.groupMetadata(from);
                    chatInfo += `*📱 Chat Type:* Group\n`;
                    chatInfo += `*📋 Group Name:* ${groupMetadata.subject || 'Unknown'}\n`;
                    chatInfo += `*🆔 Chat ID:* \`${from}\`\n`;
                    chatInfo += `*👥 Participants:* ${groupMetadata.participants?.length || 0}\n\n`;
                    chatInfo += `*🔄 For Drive Setup:*\n`;
                    chatInfo += `\`!drivesetup <folder_id> ${from}\``;
                } catch (error) {
                    chatInfo += `*📱 Chat Type:* Group\n`;
                    chatInfo += `*🆔 Chat ID:* \`${from}\`\n`;
                    chatInfo += `*⚠️ Note:* Could not fetch additional group info`;
                }
            } else {
                chatInfo += `*📱 Chat Type:* Private Chat\n`;
                chatInfo += `*🆔 Chat ID:* \`${from}\`\n`;
                chatInfo += `*👤 User:* @${sender.split('@')[0]}\n\n`;
                chatInfo += `*💡 Note:* This is a private chat ID. For Drive monitoring, you'll need a group ID instead.`;
            }
            
            chatInfo += `\n\n*👤 Requested by:* @${sender.split('@')[0]}`;

            await bot.sendMessage(from, {
                text: chatInfo,
                mentions: [sender]
            });
            
            logger.info(`Chat ID requested by ${sender} in ${isGroup ? 'group' : 'private'} chat (${from})`);

        } catch (error) {
            logger.error('Error in chatid command:', error);
            await bot.sendMessage(from, {
                text: `❌ *Command Error*\n\nFailed to get chat information: ${error.message}`
            });
        }
    }
};
