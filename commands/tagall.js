/**
 * Tagall Command for Konoha LM Bot
 * Tags all members in a group
 */

module.exports = {
    name: 'tagall',
    aliases: ['everyone', 'all', 'mentionall'],
    category: 'group',
    description: 'Tags all members in a group',
    
    /**
     * Command execution function
     * @param {Object} bot - The bot client instance
     * @param {Object} m - Message object containing information about the message
     * @param {Array} args - Command arguments
     * @param {String} text - Full command text
     */
    async execute(bot, m, args, text) {
        // Check if command is used in a group
        if (!m.isGroup) {
            return m.reply('⚠️ This command can only be used in groups!')
        }
        
        try {
            // Get message to send with the mentions (optional)
            const message = args.length > 0 ? args.join(' ') : '📢 *Group Announcement*'
            
            // Fetch group metadata to get participants
            const groupMetadata = m.isGroup ? await bot.groupMetadata(m.chat) : {}
            const participants = m.isGroup ? groupMetadata.participants : []
            
            // Create text with mentions
            let mentionText = `${message}\n\n`
            
            // Add mentions for each participant
            const mentions = []
            
            // Send initial message
            const initialMsg = await bot.sendMessage(m.chat, { text: '🔄 Tagging all members...' }, { quoted: m })
            
            participants.forEach((participant, i) => {
                const jid = participant.id
                mentions.push(jid)
                mentionText += `@${jid.split('@')[0]} `
                
                // Add line break every 5 mentions for better formatting
                if ((i + 1) % 5 === 0) {
                    mentionText += "\n"
                }
            })
            
            // Edit the message with mentions
            await bot.sendMessage(m.chat, { 
                text: mentionText, 
                mentions: mentions,
                edit: initialMsg.key
            })
            
        } catch (error) {
            console.error('Error in tagall command:', error)
            return m.reply('❌ An error occurred while tagging members')
        }
    }
}