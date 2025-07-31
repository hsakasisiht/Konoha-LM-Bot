/**
 * Help Command for Konoha LM Bot
 * Shows all available commands and their usage
 */

module.exports = {
    name: 'help',
    aliases: ['menu', 'commands', 'cmd', 'h'],
    category: 'general',
    description: 'Shows all available commands or info about a specific command',
    
    /**
     * Command execution function
     * @param {Object} bot - The bot client instance
     * @param {Object} m - Message object containing information about the message
     * @param {Array} args - Command arguments
     * @param {String} text - Full command text
     */
    async execute(bot, m, args, text) {
        const commandHandler = require('../lib/commandHandler');
        const { prefix, botname, version } = require('../settings');
        
        // If no arguments provided, show all commands
        if (args.length === 0) {
            // Group commands by category
            const categories = new Map();
            
            for (const [name, cmd] of commandHandler.commands) {
                const category = cmd.category || 'uncategorized';
                
                if (!categories.has(category)) {
                    categories.set(category, []);
                }
                
                categories.get(category).push(cmd);
            }
            
            // Create the help message
            let helpMessage = `*╔═══✪ ${botname} ✪═══╗*\n`;
            helpMessage += `*║ Version: ${version}*\n`;
            helpMessage += `*║ Prefix: ${prefix}*\n`;
            helpMessage += `*╚════════════════╝*\n\n`;
            helpMessage += `*📚 COMMAND LIST*\n\n`;
            
            // Add commands by category
            for (const [category, commands] of categories) {
                if (category.toLowerCase() === 'owner') continue; // Skip owner commands in general help
                const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
                helpMessage += `*╭─「 ${categoryName} 」*\n`;
                
                for (const cmd of commands) {
                    helpMessage += `*│ ❒ ${prefix}${cmd.name}*`;
                    if (cmd.name === 'freeze');
                    if (cmd.name === 'unfreeze');
                    helpMessage += '\n';
                }
                
                helpMessage += `*╰───────────*\n\n`;
            }
            
            // Add usage instructions
            helpMessage += `*ℹ️ USAGE INFO*\n`;
            helpMessage += `To get detailed info about a command, use:\n`;
            helpMessage += `*${prefix}help [command name]*\n\n`;
            helpMessage += `Example: *${prefix}help ping*\n\n`;
            helpMessage += `*📌 Developed by Konoha LM*`;
            
            // Send the help message
            await bot.sendMessage(m.chat, { text: helpMessage }, { quoted: m });
        } else {
            // Show help for a specific command
            const commandName = args[0].toLowerCase();
            const command = commandHandler.commands.get(commandName) || 
                           commandHandler.commands.get(commandHandler.aliases.get(commandName));
            
            if (!command) {
                return m.reply(`⚠️ Command *${commandName}* not found.`);
            }
            
            // Create the command help message
            let cmdHelpMsg = `*╭─「 COMMAND INFO 」*\n`;
            cmdHelpMsg += `*│ Name:* ${command.name}\n`;
            
            if (command.aliases && command.aliases.length) {
                cmdHelpMsg += `*│ Aliases:* ${command.aliases.join(', ')}\n`;
            }
            
            cmdHelpMsg += `*│ Category:* ${command.category || 'Uncategorized'}\n`;
            cmdHelpMsg += `*│ Description:* ${command.description || 'No description'}\n`;
            
            if (command.usage) {
                cmdHelpMsg += `*│ Usage:* ${prefix}${command.name} ${command.usage}\n`;
                cmdHelpMsg += `*│ Example:* ${prefix}${command.name} ${command.example || command.usage}\n`;
            }
            
            cmdHelpMsg += `*╰───────────*`;
            
            // Send the command help message
            await bot.sendMessage(m.chat, { text: cmdHelpMsg }, { quoted: m });
        }
    }
}