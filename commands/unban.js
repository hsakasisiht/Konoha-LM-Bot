/**
 * Unban Command for Konoha LM Bot
 * Allows group admins to unban users from the group
 */
const fs = require('fs');
const path = require('path');
const bansPath = path.resolve(__dirname, '../data/groupbans.json');

function loadBans() {
    if (!fs.existsSync(bansPath)) return {};
    return JSON.parse(fs.readFileSync(bansPath, 'utf-8'));
}
function saveBans(bans) {
    fs.writeFileSync(bansPath, JSON.stringify(bans, null, 2));
}

module.exports = {
    name: 'unban',
    aliases: ['pardon'],
    category: 'admin',
    description: 'Unban a user from the group (Admin Only)',
    async execute(bot, m, args, text) {
        if (!m.isGroup) return m.reply('⚠️ This command can only be used in groups!');
        const groupMetadata = await bot.groupMetadata(m.chat);
        const isAdmin = groupMetadata.participants.find(p => p.id === m.sender)?.admin;
        if (!isAdmin) return m.reply('⚠️ This command can only be used by group admins!');
        let targetJid = '';
        if (m.quoted) targetJid = m.quoted.sender;
        else if (m.mentionedJid && Array.isArray(m.mentionedJid) && m.mentionedJid.length > 0) targetJid = m.mentionedJid[0];
        else if (m.body && m.body.match(/@(\d+)/)) {
            const mentionedNumber = m.body.match(/@(\d+)/)[1];
            targetJid = `${mentionedNumber}@s.whatsapp.net`;
        } else {
            return m.reply('⚠️ Please mention a user or reply to their message to unban them.');
        }
        if (!targetJid || !targetJid.includes('@')) return m.reply('❌ Invalid user specified.');
        // Load and update ban list
        const bans = loadBans();
        if (!bans[m.chat] || !bans[m.chat].includes(targetJid)) return m.reply('❌ User is not banned from this group.');
        bans[m.chat] = bans[m.chat].filter(jid => jid !== targetJid);
        saveBans(bans);
        await bot.sendMessage(m.chat, { text: `✅ @${targetJid.split('@')[0]} has been unbanned from the group.`, mentions: [targetJid] });
    }
}; 