/**
 * Ban Command for Konoha LM Bot
 * Allows group admins to ban users from the group (auto-kick on join)
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
    name: 'ban',
    aliases: ['permban'],
    category: 'admin',
    description: 'Ban a user from the group (Admin Only)',
    async execute(bot, m, args, text) {
        if (!m.isGroup) return m.reply('⚠️ This command can only be used in groups!');
        const groupMetadata = await bot.groupMetadata(m.chat);
        const isAdmin = groupMetadata.participants.find(p => p.id === m.sender)?.admin;
        const botId = bot.user.id;
        const botNumber = botId.includes(':') ? botId.split(':')[0] + '@s.whatsapp.net' : botId;
        const isBotAdmin = groupMetadata.participants.some(p => (p.id === botNumber || p.id === botId || p.id === bot.user.jid) && p.admin);
        if (!isAdmin) return m.reply('⚠️ This command can only be used by group admins!');
        if (!isBotAdmin) return m.reply('⚠️ I need to be an admin to ban users!');
        let targetJid = '';
        if (m.quoted) targetJid = m.quoted.sender;
        else if (m.mentionedJid && Array.isArray(m.mentionedJid) && m.mentionedJid.length > 0) targetJid = m.mentionedJid[0];
        else if (m.body && m.body.match(/@(\d+)/)) {
            const mentionedNumber = m.body.match(/@(\d+)/)[1];
            targetJid = `${mentionedNumber}@s.whatsapp.net`;
        } else {
            return m.reply('⚠️ Please mention a user or reply to their message to ban them.');
        }
        if (!targetJid || !targetJid.includes('@')) return m.reply('❌ Invalid user specified.');
        const targetIsAdmin = groupMetadata.participants.find(p => p.id === targetJid)?.admin;
        if (targetIsAdmin) return m.reply('❌ Cannot ban another admin!');
        if (targetJid === botNumber || targetJid === botId) return m.reply('❌ I cannot ban myself!');
        // Load and update ban list
        const bans = loadBans();
        if (!bans[m.chat]) bans[m.chat] = [];
        if (bans[m.chat].includes(targetJid)) return m.reply('🚫 User is already banned from this group.');
        bans[m.chat].push(targetJid);
        saveBans(bans);
        // Kick the user
        try {
            await bot.groupParticipantsUpdate(m.chat, [targetJid], 'remove');
            await bot.sendMessage(m.chat, { text: `🚫 @${targetJid.split('@')[0]} has been banned and kicked from the group.`, mentions: [targetJid] });
        } catch (err) {
            return m.reply('❌ Failed to kick user. Please check if I have sufficient permissions.');
        }
    }
}; 