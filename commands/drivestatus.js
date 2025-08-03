const chalk = require('chalk');
const logger = require('../lib/productionLogger');

module.exports = {
    name: "drivestatus",
    aliases: ["dstatus"],
    category: "owner",
    description: "Check Google Drive monitoring status and statistics",
    
    async execute(bot, m, args, text) {
        try {
            const { chat: from, sender, isOwner } = m;
            
            // Check if user is owner
            if (!isOwner) {
                return await bot.sendMessage(from, {
                    text: "❌ *Access Denied*\n\nOnly bot owners can view Drive monitoring status."
                });
            }

            // Check if monitor exists
            if (!global.driveMonitor) {
                const DriveMonitor = require('../lib/driveMonitor');
                global.driveMonitor = new DriveMonitor();
                
                // Try to load existing configuration
                const config = global.driveMonitor.loadConfig();
                if (!config) {
                    return await bot.sendMessage(from, {
                        text: "❌ *Not Configured*\n\n" +
                              "Google Drive monitoring is not configured.\n\n" +
                              "*Setup Instructions:*\n" +
                              "1. Use `drivesetup <folder_id> <group_id>` to configure\n" +
                              "2. Use `drivestart` to begin monitoring\n\n" +
                              "*Requirements:*\n" +
                              "• Google Cloud Project with Drive API enabled\n" +
                              "• Service Account credentials (google-credentials.json)\n" +
                              "• Shared Drive folder with service account"
                    });
                }
            }

            // Get current status
            const status = global.driveMonitor.getStatus();
            
            // Check if API is accessible
            let apiStatus = "❓ Unknown";
            let apiDetails = "";
            
            try {
                const initialized = await global.driveMonitor.initialize();
                if (initialized) {
                    apiStatus = "✅ Connected";
                    apiDetails = "Google Drive API is accessible";
                } else {
                    apiStatus = "❌ Failed";
                    apiDetails = "Could not connect to Google Drive API";
                }
            } catch (error) {
                apiStatus = "❌ Error";
                apiDetails = error.message;
            }

            // Format monitoring status
            const monitorStatus = status.isMonitoring ? "🟢 Active" : "🔴 Stopped";
            const nextCheck = status.isMonitoring ? 
                `Next check in ~${Math.ceil(status.monitorInterval / 1000)} seconds` : 
                "Not scheduled";

            // Get configuration details
            const config = global.driveMonitor.loadConfig();
            const folderInfo = status.watchedFolder || "Not configured";
            const groupInfo = status.targetGroup || "Not configured";

            const statusMsg = `📊 *Google Drive Monitor Status*\n\n` +
                            `*🔌 API Connection:* ${apiStatus}\n` +
                            `${apiDetails ? `_${apiDetails}_\n` : ''}` +
                            `*🔄 Monitoring Status:* ${monitorStatus}\n` +
                            `*⏱️ Check Interval:* ${status.monitorInterval / 1000} seconds\n` +
                            `*⏰ Next Check:* ${nextCheck}\n\n` +
                            `*📁 Configuration:*\n` +
                            `• Folder ID: \`${folderInfo}\`\n` +
                            `• Target Group: \`${groupInfo}\`\n\n` +
                            `*📈 Statistics:*\n` +
                            `• Processed Files: ${status.processedFilesCount}\n` +
                            `• Configuration Date: ${config ? new Date(config.lastCheck).toLocaleString() : 'Unknown'}\n\n` +
                            `*🎛️ Available Commands:*\n` +
                            `• \`drivestart\` - Start monitoring\n` +
                            `• \`drivestop\` - Stop monitoring\n` +
                            `• \`driveclear\` - Clear file history\n` +
                            `• \`drivesetup\` - Reconfigure settings`;

            await bot.sendMessage(from, { text: statusMsg });
            
            logger.debug(`Drive status checked by ${sender}`);

        } catch (error) {
            logger.error('Error in drivestatus command:', error);
            await bot.sendMessage(from, {
                text: `❌ *Status Error*\n\nFailed to get Drive monitoring status: ${error.message}`
            });
        }
    }
};
