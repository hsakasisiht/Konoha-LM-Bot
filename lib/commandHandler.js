/**
 * Command Handler for Konoha LM Bot
 * Manages loading and handling commands
 */

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')

class CommandHandler {
    constructor() {
        this.commands = new Map()
        this.aliases = new Map()
        this.cooldowns = new Map()
    }

    /**
     * Load all command files from the commands directory
     * @param {String} dir - Directory path for commands
     */
    loadCommands(dir = 'commands') {
        const commandFiles = this.getFiles(dir)
        console.log(chalk.yellow(`Loading ${commandFiles.length} commands...`))
        
        for (const file of commandFiles) {
            try {
                const command = require(path.resolve(file))
                
                // Skip files that don't export a valid command object
                if (!command.name || !command.execute) continue
                
                // Add command to collection
                this.commands.set(command.name, command)
                
                // Register command aliases
                if (command.aliases && Array.isArray(command.aliases)) {
                    command.aliases.forEach(alias => {
                        this.aliases.set(alias, command.name)
                    })
                }
                
                console.log(chalk.green(`✅ Loaded command: ${command.name}`))
            } catch (error) {
                console.error(chalk.red(`❌ Error loading command from ${file}:`), error)
            }
        }
        
        console.log(chalk.green(`Successfully loaded ${this.commands.size} commands with ${this.aliases.size} aliases`))
    }
    
    /**
     * Get all JS files recursively from directory
     * @param {String} dir - Directory to search
     * @param {Array} files - Array to store found files
     * @returns {Array} Array of file paths
     */
    getFiles(dir, files = []) {
        const fileList = fs.readdirSync(path.resolve(dir))
        
        for (const file of fileList) {
            const filePath = path.join(dir, file)
            const stat = fs.statSync(path.resolve(filePath))
            
            if (stat.isDirectory()) {
                this.getFiles(filePath, files)
            } else if (file.endsWith('.js')) {
                files.push(filePath)
            }
        }
        
        return files
    }
    
    /**
     * Handle a command from a message
     * @param {Object} bot - The bot client instance
     * @param {Object} m - Message object
     * @param {String} prefix - Command prefix
     * @returns {Boolean} Whether a command was handled
     */
    async handleCommand(bot, m, prefix) {
        // Ignore if message doesn't start with prefix
        if (!m.body.startsWith(prefix)) return false
        
        // Freeze check (for groups)
        if (m.isGroup) {
            try {
                const freezePath = path.resolve(__dirname, '../data/groupfreezes.json')
                if (fs.existsSync(freezePath)) {
                    const freezes = JSON.parse(fs.readFileSync(freezePath, 'utf-8'))
                    const freezeUntil = freezes[m.chat]
                    if (freezeUntil && Date.now() < freezeUntil) {
                        // Allow only freeze, unban, and unfreeze commands
                        const args = m.body.slice(prefix.length).trim().split(/ +/)
                        const commandName = args[0]?.toLowerCase()
                        if (commandName !== 'freeze' && commandName !== 'unban' && commandName !== 'unfreeze') {
                            return false
                        }
                    }
                }
            } catch (err) {
                // Ignore freeze check errors
            }
        }
        
        // Extract command name and arguments
        const args = m.body.slice(prefix.length).trim().split(/ +/)
        const commandName = args.shift().toLowerCase()
        
        // Get command by name or alias
        const command = this.commands.get(commandName) || 
                        this.commands.get(this.aliases.get(commandName))
        
        if (!command) return false
        
        // Log the command to terminal if enabled
        if (global.logCommands) {
            const currentTime = new Date().toLocaleTimeString()
            const chatType = m.isGroup ? 'group' : 'private'
            const chatName = m.isGroup ? m.groupMetadata?.subject || 'Unknown Group' : m.pushName || 'Private Chat'
            
            console.log(chalk.magenta('┌─────────────────────────────────────'))
            console.log(chalk.magenta('│') + chalk.blueBright(` [${currentTime}] Command detected!`))
            console.log(chalk.magenta('│') + chalk.yellow(` • User: ${m.pushName || m.sender.split('@')[0]}`))
            console.log(chalk.magenta('│') + chalk.yellow(` • Command: ${prefix}${command.name} ${args.join(' ')}`))
            console.log(chalk.magenta('│') + chalk.yellow(` • Chat: ${chatName} (${chatType})`))
            console.log(chalk.magenta('└─────────────────────────────────────'))
        }
        
        // Handle command cooldowns
        if (!this.handleCooldown(m.sender, command)) {
            const cooldownTime = (command.cooldown || 3)
            m.reply(`Please wait ${cooldownTime} seconds before using the ${command.name} command again.`)
            return true
        }
        
        // Execute command
        try {
            await command.execute(bot, m, args, args.join(' '))
            return true
        } catch (error) {
            console.error(chalk.red(`Error executing command ${command.name}:`), error)
            m.reply('❌ There was an error executing that command.')
            return true
        }
    }
    
    /**
     * Check and handle command cooldowns
     * @param {String} userId - User ID
     * @param {Object} command - Command object
     * @returns {Boolean} Whether command should proceed
     */
    handleCooldown(userId, command) {
        if (!this.cooldowns.has(command.name)) {
            this.cooldowns.set(command.name, new Map())
        }
        
        const now = Date.now()
        const timestamps = this.cooldowns.get(command.name)
        const cooldownAmount = (command.cooldown || 3) * 1000
        
        if (timestamps.has(userId)) {
            const expirationTime = timestamps.get(userId) + cooldownAmount
            
            if (now < expirationTime) {
                return false
            }
        }
        
        timestamps.set(userId, now)
        setTimeout(() => timestamps.delete(userId), cooldownAmount)
        
        return true
    }
}

module.exports = new CommandHandler()