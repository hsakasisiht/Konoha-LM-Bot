/**
 * Ping Command for Konoha LM Bot
 * Checks the bot's response time
 */

module.exports = {
    name: 'ping',
    aliases: ['p', 'latency', 'speed'],
    category: 'utility',
    description: 'Check bot response time',
    
    /**
     * Command execution function
     * @param {Object} bot - The bot client instance
     * @param {Object} m - Message object containing information about the message
     * @param {Array} args - Command arguments
     * @param {String} text - Full command text
     */
    async execute(bot, m, args, text) {
        // Record start time
        const start = Date.now()
        
        // Send initial message
        const initialMsg = await bot.sendMessage(m.chat, { text: '🏓 Measuring ping...' }, { quoted: m })
        
        // Calculate latency
        const latency = Date.now() - start
        
        // Create ping response message
        const pingMsg = `*🏓 Pong!*\n\n` +
            `⏱️ *Response time:* ${latency}ms\n` +
            `🤖 *Bot Status:* Online\n` +
            `🕒 *Uptime:* ${formatUptime(process.uptime())}`
        
        // Edit the initial message with ping information
        await bot.sendMessage(m.chat, { text: pingMsg, edit: initialMsg.key })
    }
}

/**
 * Format uptime into readable string
 * @param {Number} seconds - Uptime in seconds
 * @returns {String} Formatted uptime string
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor(seconds % 86400 / 3600)
    const minutes = Math.floor(seconds % 3600 / 60)
    const secs = Math.floor(seconds % 60)
    
    const parts = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    if (secs > 0) parts.push(`${secs}s`)
    
    return parts.join(' ')
}