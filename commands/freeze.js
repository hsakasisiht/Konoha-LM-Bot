/**
 * Freeze Command for Konoha LM Bot
 * Allows group admins to freeze the bot in a group for a specified time (in seconds)
 */
const fs = require('fs');
const path = require('path');
const freezePath = path.resolve(__dirname, '../data/groupfreezes.json');
const bansPath = path.resolve(__dirname, '../data/groupbans.json');

function loadFreezes() {
    if (!fs.existsSync(freezePath)) return {};
    return JSON.parse(fs.readFileSync(freezePath, 'utf-8'));
}
function saveFreezes(freezes) {
    fs.writeFileSync(freezePath, JSON.stringify(freezes, null, 2));
}
function loadBans() {
    if (!fs.existsSync(bansPath)) return {};
    return JSON.parse(fs.readFileSync(bansPath, 'utf-8'));
}

module.exports = {
    name: 'freeze',
    category: 'admin',
    description: 'Freeze the bot in this group for N seconds (Admin Only)',
    async execute(bot, m, args, text) {
        if (!m.isGroup) return m.reply('⚠️ This command can only be used in groups!');
        const groupMetadata = await bot.groupMetadata(m.chat);
        const isAdmin = groupMetadata.participants.find(p => p.id === m.sender)?.admin;
        if (!isAdmin) return m.reply('⚠️ This command can only be used by group admins!');
        const seconds = parseInt(args[0], 10);
        if (isNaN(seconds) || seconds < 1) return m.reply('❌ Please provide a valid freeze time in seconds.');
        const freezes = loadFreezes();
        const now = Date.now();
        freezes[m.chat] = now + seconds * 1000;
        saveFreezes(freezes);
        m.reply(`❄️ Bot is frozen in this group for ${seconds} seconds. No commands will be processed during this time.`);

        // Set a timer to auto-unfreeze and check for banned users
        setTimeout(async () => {
            const currentFreezes = loadFreezes();
            if (currentFreezes[m.chat] && Date.now() >= currentFreezes[m.chat]) {
                delete currentFreezes[m.chat];
                saveFreezes(currentFreezes);
                try {
                    const bans = loadBans();
                    if (bans[m.chat] && bans[m.chat].length > 0) {
                        const groupMeta = await bot.groupMetadata(m.chat);
                        const members = groupMeta.participants.map(p => p.id);
                        for (const userJid of members) {
                            if (bans[m.chat].includes(userJid)) {
                                try {
                                    await bot.groupParticipantsUpdate(m.chat, [userJid], 'remove');
                                    await bot.sendMessage(m.chat, { text: `🚫 @${userJid.split('@')[0]} is banned and was auto-kicked after freeze.`, mentions: [userJid] });
                                } catch (err) {
                                    await bot.sendMessage(m.chat, { text: `❌ Failed to auto-kick banned user @${userJid.split('@')[0]} after freeze. Please check my admin permissions.`, mentions: [userJid] });
                                }
                            }
                        }
                    }
                    await bot.sendMessage(m.chat, { text: '✅ Freeze period ended. Bot is now active in this group.' });
                } catch (err) {
                    await bot.sendMessage(m.chat, { text: '⚠️ Freeze ended, but there was an error checking for banned users.' });
                }
            }
        }, seconds * 1000);
    }
}; 