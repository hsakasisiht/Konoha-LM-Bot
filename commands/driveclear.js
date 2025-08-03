const chalk = require('chalk');
const logger = require('../lib/productionLogger');

module.exports = {
    name: "driveclear", 
    aliases: ["dclear"],
    category: "owner",
    description: "Clear Google Drive processed files history",
    
    async execute(bot, m, args, text) {
        try {
            const { chat: from, sender, isOwner } = m;
            
            // Check if user is owner
            if (!isOwner) {
                return await bot.sendMessage(from, {
                    text: "❌ *Access Denied*\n\nOnly bot owners can clear Drive monitoring history."
                });
            }

            // Check if monitor exists
            if (!global.driveMonitor) {
                const DriveMonitor = require('../lib/driveMonitor');
                global.driveMonitor = new DriveMonitor();
            }

            // Get current status
            const status = global.driveMonitor.getStatus();

            // Check if confirmation provided
            if (args.length === 0 || args[0].toLowerCase() !== 'confirm') {
                const warningMsg = `⚠️ *Clear File History?*\n\n` +
                                 `*Current Statistics:*\n` +
                                 `• Processed Files: ${status.processedFilesCount}\n` +
                                 `• Monitoring Status: ${status.isMonitoring ? '🟢 Active' : '🔴 Stopped'}\n\n` +
                                 `*⚠️ Warning:*\n` +
                                 `This will clear the history of all processed files. After clearing:\n` +
                                 `• All previously processed files will be treated as new\n` +
                                 `• Files already in the Drive folder may be downloaded again\n` +
                                 `• This could result in duplicate file sends\n\n` +
                                 `*To confirm clearing, use:*\n` +
                                 `\`driveclear confirm\`\n\n` +
                                 `*Recommendation:*\n` +
                                 `Only clear if you want to reprocess existing files or if there are issues with the file tracking.`;

                return await bot.sendMessage(from, { text: warningMsg });
            }

            // Clear the processed files
            global.driveMonitor.clearProcessedFiles();

            const successMsg = `✅ *File History Cleared!*\n\n` +
                             `*Previous Statistics:*\n` +
                             `• Processed Files: ${status.processedFilesCount} → 0\n\n` +
                             `*Result:*\n` +
                             `• All file processing history has been cleared\n` +
                             `• Bot will treat all files in Drive folder as new\n` +
                             `• Monitoring continues normally\n\n` +
                             `*Note:*\n` +
                             `If monitoring is active, existing files in the Drive folder may be downloaded and sent again on the next check cycle.`;

            await bot.sendMessage(from, { text: successMsg });
            
            logger.info(`Drive file history cleared by ${sender} - Previous count: ${status.processedFilesCount}`);

        } catch (error) {
            logger.error('Error in driveclear command:', error);
            await bot.sendMessage(from, {
                text: `❌ *Clear Error*\n\nFailed to clear Drive monitoring history: ${error.message}`
            });
        }
    }
};
