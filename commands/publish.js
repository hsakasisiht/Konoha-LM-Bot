/**
 * Publish Command for Konoha LM Bot
 * Allows the provider to send a changelog message to all groups
 */
const fs = require('fs');
const path = require('path');

const changelog = `🚀 *Konoha LM Bot v1.3.1 - Major Update!*

✨ *New Features:*
• 📊 Excel File Automation - Smart file processing
• 📱 Private Chat Support - All commands also work in DMs
• 🆔 Chat ID Utilities - Easy group/chat ID commands
• 🐉 Monster Hunting Reports - Get detailed hunting analytics via DM or group
• ⚡ Production Optimized - 24/7 stable operation

🎯 *Enhanced Commands:*
• 🛡️ Group Management - Ban, kick, freeze controls
• ⚠️ Warning System - Track user violations
• 👑 Owner Controls - Manage group ownership
• 🎉 Fun Features - Memes, jokes, entertainment
• 🔧 Utilities - Ping, help, tag all members
• 📈 Analytics - Monster hunting reports and statistics

🛠️ *Technical Improvements:*
• Session Management - Prevents crashes
• Error Recovery - Auto-restart on failures
• Memory Optimization - Better performance
• Professional Logging - Enhanced monitoring

📈 *Performance Boosts:*
• Faster command processing
• Better connection stability
• Reduced memory usage
• Improved response times

🎮 *25+ Commands Available!*
Use !help to see all commands and !help [command] for usage details.

🐉 *Monster Hunting Reports:*
Get comprehensive hunting analytics delivered directly to your WhatsApp! Track your progress, view statistics, and receive detailed reports in both groups and private messages.

*Bot is now production-ready with enterprise-grade reliability!*`;

module.exports = {
    name: 'publish',
    category: 'owner',
    description: 'Publish changelog to all groups (Provider Only, Private Chat Only)',
    async execute(bot, m, args, text) {
        // Only allow in private chat
        if (m.isGroup) return m.reply('⚠️ This command can only be used in private chat with the bot!');
        // Only allow bot provider (global.ownernumber)
        const providerNumber = (global.ownernumber || '').replace(/[^0-9]/g, '');
        const senderNumber = m.sender.split('@')[0].replace(/[^0-9]/g, '');
        if (!providerNumber || senderNumber !== providerNumber) {
            return m.reply('❌ Only the bot provider can use this command.');
        }
        // Get all groups
        let groups = [];
        if (bot.groupFetchAllParticipating) {
            groups = Object.keys(await bot.groupFetchAllParticipating());
        } else if (bot.chats) {
            groups = Object.keys(bot.chats).filter(jid => jid.endsWith('@g.us'));
        }
        if (!groups.length) return m.reply('❌ No groups found to publish changelog.');
        // For each group, send the three messages with 5s delay between each
        let sent = 0;
        for (const groupId of groups) {
            try {
                await bot.sendMessage(groupId, { text: '🚀 Updating Konoha LM Bot to v1.3.1...' });
                await new Promise(res => setTimeout(res, 5000));
                await bot.sendMessage(groupId, { text: '✅ Update complete! New features ready!' });
                await new Promise(res => setTimeout(res, 5000));
                await bot.sendMessage(groupId, { text: changelog });
                sent++;
            } catch (err) {
                // Ignore errors for individual groups
            }
        }
        await bot.sendMessage(m.chat, { text: `✅ Update and changelog published to ${sent} group(s).` });
    }
}; 