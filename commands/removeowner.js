/**
 * Remove Owner Command for Konoha LM Bot
 * Allows the bot provider to remove custom owners from groups
 * Strictly restricted to the provider only
 */

const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'removeowner',
    aliases: ['resetowner', 'delowner', 'unsetowner'],
    category: 'admin',
    description: 'Removes the custom owner of the current group (Provider Only)',
    
    /**
     * Command execution function
     * @param {Object} bot - The bot client instance
     * @param {Object} m - Message object containing information about the message
     * @param {Array} args - Command arguments
     * @param {String} text - Full command text
     */
    async execute(bot, m, args, text) {
        // Get the bot provider's number from global settings and owner.json
        const providerNumber = global.ownernumber;
        
        // Extra security - also check the owner.json file
        let mainOwners = [];
        try {
            const ownerData = fs.readFileSync('./data/owner.json', 'utf8');
            mainOwners = JSON.parse(ownerData);
        } catch (err) {
            console.error('Error reading owner file:', err);
            // Fall back to global setting if file can't be read
            mainOwners = [providerNumber];
        }
        
        // Get sender's number without the @s.whatsapp.net
        const senderNumber = m.sender.split('@')[0];
        
        // Check if the command sender is authorized
        const isAuthorized = mainOwners.includes(senderNumber) || senderNumber === providerNumber;
        
        if (!isAuthorized) {
            console.log(`⚠️ Unauthorized removeowner attempt by ${senderNumber}`);
            return m.reply('🔒 This command is restricted to the bot provider only.');
        }
        
        // Check if this is a group
        if (!m.isGroup) {
            return m.reply('⚠️ This command can only be used in groups!');
        }
        
        try {
            // Send initial message
            const initialMsg = await bot.sendMessage(m.chat, { text: '🔄 Processing request...' }, { quoted: m });
            
            // Path to the group owners file
            const groupOwnersPath = path.join(process.cwd(), 'data', 'groupowners.json');
            
            // Check if the group owners file exists
            if (!fs.existsSync(groupOwnersPath)) {
                return bot.sendMessage(m.chat, { 
                    text: 'ℹ️ No custom group owners have been set yet.',
                    edit: initialMsg.key
                });
            }
            
            // Read existing owners file
            let groupOwners = {};
            try {
                const fileContent = fs.readFileSync(groupOwnersPath, 'utf8');
                if (fileContent.trim()) {
                    groupOwners = JSON.parse(fileContent);
                }
            } catch (err) {
                console.error('Error reading group owners file:', err);
                return bot.sendMessage(m.chat, { 
                    text: '❌ Error reading group owners data. Please try again.',
                    edit: initialMsg.key
                });
            }
            
            // Check if this group has a custom owner set
            if (!groupOwners[m.chat]) {
                return bot.sendMessage(m.chat, { 
                    text: 'ℹ️ This group doesn\'t have a custom owner set.',
                    edit: initialMsg.key
                });
            }
            
            // Get the current owner info for the message
            const currentOwner = groupOwners[m.chat].split('@')[0];
            
            // Remove this group from the owners list
            delete groupOwners[m.chat];
            
            // Save updated data back to the file
            fs.writeFileSync(groupOwnersPath, JSON.stringify(groupOwners, null, 2));
            
            // Log this action
            console.log(`✓ Provider ${senderNumber} removed group owner from ${m.chat}`);
            
            // Send success message
            return bot.sendMessage(m.chat, { 
                text: `✅ Successfully removed @${currentOwner} as the custom owner of this group.\nThe group will use default ownership.`,
                mentions: [`${currentOwner}@s.whatsapp.net`],
                edit: initialMsg.key
            });
            
        } catch (error) {
            console.error('Error in removeowner command:', error);
            return m.reply('❌ An error occurred while removing group owner');
        }
    }
};