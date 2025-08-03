const chalk = require('chalk');
const logger = require('../lib/productionLogger');

module.exports = {
    name: "drivestart",
    aliases: ["dstart"],
    category: "owner", 
    description: "Start Google Drive monitoring for automatic Excel file downloads",
    
    async execute(bot, m, args, text) {
        try {
            const { chat: from, sender, isOwner } = m;
            
            // Check if user is owner
            if (!isOwner) {
                return await bot.sendMessage(from, {
                    text: "❌ *Access Denied*\n\nOnly bot owners can control Drive monitoring."
                });
            }

            // Check if monitor is configured
            if (!global.driveMonitor) {
                const DriveMonitor = require('../lib/driveMonitor');
                global.driveMonitor = new DriveMonitor();
                
                // Try to load existing configuration
                const config = global.driveMonitor.loadConfig();
                if (!config) {
                    return await bot.sendMessage(from, {
                        text: "❌ *Not Configured*\n\n" +
                              "Drive monitoring is not configured yet.\n\n" +
                              "*Setup first using:* `drivesetup <folder_id> <group_id>`"
                    });
                }
            }

            // Check if already running
            if (global.driveMonitor.isMonitoring) {
                return await bot.sendMessage(from, {
                    text: "⚠️ *Already Running*\n\n" +
                          "Google Drive monitoring is already active.\n\n" +
                          "*Use `drivestatus` to check current status.*"
                });
            }

            // Send starting message
            await bot.sendMessage(from, {
                text: "🔄 *Starting Drive Monitor...*\n\nInitializing Google Drive API and starting monitoring..."
            });

            // Start monitoring
            await global.driveMonitor.startMonitoring(bot);

            // Get status for confirmation
            const status = global.driveMonitor.getStatus();

            const successMsg = `✅ *Drive Monitor Started!*\n\n` +
                             `📁 *Watching Folder:* ${status.watchedFolder}\n` +
                             `📱 *Target Group:* ${status.targetGroup}\n` +
                             `⏱️ *Check Interval:* ${status.monitorInterval / 1000} seconds\n` +
                             `📊 *Processed Files:* ${status.processedFilesCount}\n\n` +
                             `*Status:* 🟢 Active Monitoring\n\n` +
                             `*Bot will now automatically:*\n` +
                             `• Monitor the Drive folder every minute\n` +
                             `• Download new Excel files\n` +
                             `• Send them to the target group\n` +
                             `• Track processed files to avoid duplicates\n\n` +
                             `*Management Commands:*\n` +
                             `• \`drivestatus\` - Check status\n` +
                             `• \`drivestop\` - Stop monitoring\n` +
                             `• \`driveclear\` - Clear file history`;

            await bot.sendMessage(from, { text: successMsg });
            
            logger.success(`Drive monitoring started by ${sender}`);

        } catch (error) {
            logger.error('Error in drivestart command:', error);
            await bot.sendMessage(from, {
                text: `❌ *Start Error*\n\nFailed to start Drive monitoring: ${error.message}`
            });
        }
    }
};
