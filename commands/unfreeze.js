/**
 * Unfreeze Command for Konoha LM Bot
 * Allows group admins to immediately unfreeze the bot in the group
 */
const fs = require('fs');
const path = require('path');
const freezePath = path.resolve(__dirname, '../data/groupfreezes.json');

function loadFreezes() {
    if (!fs.existsSync(freezePath)) return {};
    return JSON.parse(fs.readFileSync(freezePath, 'utf-8'));
}
function saveFreezes(freezes) {
    fs.writeFileSync(freezePath, JSON.stringify(freezes, null, 2));
}

module.exports = {
    name: 'unfreeze',
    category: 'admin',
    description: 'Unfreeze the bot in this group immediately (Admin Only)',
    async execute(bot, m, args, text) {
        if (!m.isGroup) return m.reply('⚠️ This command can only be used in groups!');
        const groupMetadata = await bot.groupMetadata(m.chat);
        const isAdmin = groupMetadata.participants.find(p => p.id === m.sender)?.admin;
        if (!isAdmin) return m.reply('⚠️ This command can only be used by group admins!');
        const freezes = loadFreezes();
        if (!freezes[m.chat]) return m.reply('❄️ Bot is not currently frozen in this group.');
        delete freezes[m.chat];
        saveFreezes(freezes);
        m.reply('✅ Bot has been unfrozen and will now respond to commands in this group.');
    }
}; 