/**
 * Publish Command for Konoha LM Bot
 * Allows the provider to send a changelog message to all groups
 */
const fs = require('fs');
const path = require('path');

const changelog = `*Konoha LM Bot v1.3.5 Changelog:*

- Group freeze/unfreeze feature
- Ban/unban system improvements
- Auto-kick logic enhancements
- Bug fixes and performance improvements

Use .help to see all commands. and .help [command_name] to see how to use a command.
`;

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
                await bot.sendMessage(groupId, { text: 'Updating bot to latest version 1.3.5...' });
                await new Promise(res => setTimeout(res, 5000));
                await bot.sendMessage(groupId, { text: '✅ Update successful!' });
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