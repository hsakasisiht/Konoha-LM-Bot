const chalk = require('chalk');
const logger = require('../lib/productionLogger');

module.exports = {
    name: "drivestop",
    aliases: ["dstop"],
    category: "owner",
    description: "Stop Google Drive monitoring",
    
    async execute(bot, m, args, text) {
        try {
            const { chat: from, sender, isOwner } = m;
            
            // Check if user is owner
            if (!isOwner) {
                return await bot.sendMessage(from, {
                    text: "❌ *Access Denied*\n\nOnly bot owners can control Drive monitoring."
                });
            }

            // Check if monitor exists and is running
            if (!global.driveMonitor) {
                return await bot.sendMessage(from, {
                    text: "❌ *Not Running*\n\n" +
                          "Google Drive monitoring is not currently active."
                });
            }

            if (!global.driveMonitor.isMonitoring) {
                return await bot.sendMessage(from, {
                    text: "⚠️ *Already Stopped*\n\n" +
                          "Google Drive monitoring is not currently running.\n\n" +
                          "*Use `drivestart` to begin monitoring.*"
                });
            }

            // Get status before stopping
            const status = global.driveMonitor.getStatus();

            // Stop monitoring
            global.driveMonitor.stopMonitoring();

            const successMsg = `✅ *Drive Monitor Stopped!*\n\n` +
                             `📁 *Was Watching:* ${status.watchedFolder}\n` +
                             `📱 *Target Group:* ${status.targetGroup}\n` +
                             `📊 *Files Processed:* ${status.processedFilesCount}\n\n` +
                             `*Status:* 🔴 Monitoring Stopped\n\n` +
                             `*The bot will no longer:*\n` +
                             `• Check for new Excel files\n` +
                             `• Download files automatically\n` +
                             `• Send files to the target group\n\n` +
                             `*Note:* Configuration is saved. Use \`drivestart\` to resume monitoring.`;

            await bot.sendMessage(from, { text: successMsg });
            
            logger.info(`Drive monitoring stopped by ${sender}`);

        } catch (error) {
            logger.error('Error in drivestop command:', error);
            await bot.sendMessage(from, {
                text: `❌ *Stop Error*\n\nFailed to stop Drive monitoring: ${error.message}`
            });
        }
    }
};
