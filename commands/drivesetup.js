const chalk = require('chalk');
const logger = require('../lib/productionLogger');

module.exports = {
    name: "drivesetup",
    aliases: ["dsetup"],
    category: "owner",
    description: "Setup Google Drive monitoring for automatic Excel file downloads",
    
    async execute(bot, m, args, text) {
        try {
            const { chat: from, sender, isOwner } = m;
            
            // Check if user is owner
            if (!isOwner) {
                return await bot.sendMessage(from, {
                    text: "❌ *Access Denied*\n\nOnly bot owners can setup Drive monitoring."
                });
            }

            // Check arguments
            if (args.length < 2) {
                return await bot.sendMessage(from, {
                    text: `❌ *Invalid Usage*\n\n*Usage:* ${this.config.usage}\n\n` +
                          `*Parameters:*\n` +
                          `• folder_id: Google Drive folder ID to monitor\n` +
                          `• group_id: WhatsApp group ID to send files to\n\n` +
                          `*Example:* drivesetup 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs87 120363123456789012@g.us\n\n` +
                          `*How to get Drive folder ID:*\n` +
                          `1. Open Google Drive folder in browser\n` +
                          `2. Copy the ID from URL after /folders/\n` +
                          `3. Example: drive.google.com/drive/folders/[FOLDER_ID]\n\n` +
                          `*How to get Group ID:*\n` +
                          `Use this command in the target group to get its ID.`
                });
            }

            const folderId = args[0];
            const groupId = args[1];

            // Validate folder ID format
            if (!/^[a-zA-Z0-9_-]{25,}$/.test(folderId)) {
                return await bot.sendMessage(from, {
                    text: "❌ *Invalid Folder ID*\n\nPlease provide a valid Google Drive folder ID."
                });
            }

            // Validate group ID format
            if (!/^\d+@g\.us$/.test(groupId) && !/^\d+@s\.whatsapp\.net$/.test(groupId)) {
                return await bot.sendMessage(from, {
                    text: "❌ *Invalid Group ID*\n\nPlease provide a valid WhatsApp group ID.\n\n" +
                          "*Format:* 120363123456789012@g.us"
                });
            }

            // Initialize Drive Monitor
            const DriveMonitor = require('../lib/driveMonitor');
            const driveMonitor = new DriveMonitor();
            
            // Test Drive API connection
            const initialized = await driveMonitor.initialize();
            if (!initialized) {
                return await bot.sendMessage(from, {
                    text: "❌ *Google Drive API Error*\n\n" +
                          "Could not initialize Google Drive API.\n\n" +
                          "*Possible issues:*\n" +
                          "• Missing google-credentials.json file\n" +
                          "• Invalid service account credentials\n" +
                          "• API not enabled in Google Cloud Console\n\n" +
                          "*Setup Instructions:*\n" +
                          "1. Create a Google Cloud Project\n" +
                          "2. Enable Google Drive API\n" +
                          "3. Create Service Account\n" +
                          "4. Download credentials as google-credentials.json\n" +
                          "5. Place file in bot root directory"
                });
            }

            // Try to verify folder access
            try {
                const { google } = require('googleapis');
                const drive = google.drive({ version: 'v3', auth: driveMonitor.auth });
                
                await drive.files.get({
                    fileId: folderId,
                    fields: 'id,name,mimeType'
                });
            } catch (error) {
                let errorMsg = "❌ *Folder Access Error*\n\n";
                
                if (error.code === 404) {
                    errorMsg += "Folder not found or not accessible.\n\n" +
                               "*Please ensure:*\n" +
                               "• Folder ID is correct\n" +
                               "• Service account has access to the folder\n" +
                               "• Folder is shared with service account email";
                } else if (error.code === 403) {
                    errorMsg += "Access denied to the folder.\n\n" +
                               "*Please share the folder with the service account email.*";
                } else {
                    errorMsg += `API Error: ${error.message}`;
                }
                
                return await bot.sendMessage(from, { text: errorMsg });
            }

            // Configure the monitoring
            driveMonitor.setWatchConfig(folderId, groupId);

            // Store the monitor instance globally for access by other commands
            global.driveMonitor = driveMonitor;

            const successMsg = `✅ *Drive Monitor Configured!*\n\n` +
                             `📁 *Folder ID:* ${folderId}\n` +
                             `📱 *Target Group:* ${groupId}\n` +
                             `⏱️ *Check Interval:* 1 minute\n\n` +
                             `*Status:* Ready to start monitoring\n\n` +
                             `*Next Steps:*\n` +
                             `• Use \`drivestart\` to begin monitoring\n` +
                             `• Use \`drivestatus\` to check status\n` +
                             `• Use \`drivestop\` to stop monitoring\n\n` +
                             `*Note:* Bot will automatically download new Excel files from the specified folder and send them to the target group.`;

            await bot.sendMessage(from, { text: successMsg });
            
            logger.success(`Drive monitoring configured by ${sender} - Folder: ${folderId}, Group: ${groupId}`);

        } catch (error) {
            logger.error('Error in drivesetup command:', error);
            await bot.sendMessage(from, {
                text: `❌ *Setup Error*\n\nFailed to configure Drive monitoring: ${error.message}`
            });
        }
    }
};
