const chalk = require('chalk');
const logger = require('../lib/productionLogger');

module.exports = {
    name: "getgroupid",
    aliases: ["groupid", "gid"],
    category: "utility",
    description: "Get the current group's WhatsApp ID for Drive monitoring setup",
    
    async execute(bot, m, args, text) {
        try {
            const { chat: from, sender, isGroup } = m;
            
            // Check if command is used in a group
            if (!isGroup) {
                return await bot.sendMessage(from, {
                    text: "❌ *Group Only Command*\n\n" +
                          "This command can only be used in WhatsApp groups.\n\n" +
                          "*Purpose:* Get group ID for Google Drive monitoring setup\n" +
                          "*Usage:* Send this command in the target group where you want to receive Drive files."
                });
            }

            // Get group metadata
            let groupMetadata;
            try {
                groupMetadata = await bot.groupMetadata(from);
            } catch (error) {
                logger.error('Error fetching group metadata:', error.message);
                return await bot.sendMessage(from, {
                    text: "❌ *Error*\n\nCould not fetch group information. Please try again."
                });
            }

            // Format group information
            const groupInfo = `📱 *Group Information*\n\n` +
                             `*📋 Group Name:* ${groupMetadata.subject || 'Unknown'}\n` +
                             `*🆔 Group ID:* \`${from}\`\n` +
                             `*👥 Participants:* ${groupMetadata.participants?.length || 0}\n` +
                             `*📅 Created:* ${groupMetadata.creation ? new Date(groupMetadata.creation * 1000).toLocaleDateString() : 'Unknown'}\n` +
                             `*👤 Requested by:* @${sender.split('@')[0]}\n\n` +
                             `*🔄 For Drive Monitoring:*\n` +
                             `Use this Group ID in the drivesetup command:\n` +
                             `\`!drivesetup <folder_id> ${from}\`\n\n` +
                             `*💡 Tip:* Copy the Group ID from above and use it when configuring Google Drive monitoring.`;

            await bot.sendMessage(from, {
                text: groupInfo,
                mentions: [sender]
            });
            
            logger.info(`Group ID requested by ${sender} in group ${groupMetadata.subject} (${from})`);

        } catch (error) {
            logger.error('Error in getgroupid command:', error);
            await bot.sendMessage(from, {
                text: `❌ *Command Error*\n\nFailed to get group information: ${error.message}`
            });
        }
    }
};
