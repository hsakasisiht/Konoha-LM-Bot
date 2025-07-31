/**
 * Set Owner Command for Konoha LM Bot
 * Allows the bot provider to set different owners for different groups
 * Strictly restricted to the provider only
 */

const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'setowner',
    aliases: ['owner', 'setadmin', 'makeowner'],
    category: 'admin',
    description: 'Sets a user as the owner of a specific group (Provider Only)',
    
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
            console.log(`⚠️ Unauthorized setowner attempt by ${senderNumber}`);
            return m.reply('🔒 This command is restricted to the bot provider only.');
        }
        
        // Check if this is a group
        if (!m.isGroup) {
            return m.reply('⚠️ This command can only be used in groups!');
        }
        
        // Check if user is mentioned or replied to
        let targetJid = '';
        
        // If replying to a message, get that user
        if (m.quoted) {
            targetJid = m.quoted.sender;
        }
        // If mentioning someone
        else if (m.mentionedJid && m.mentionedJid.length > 0) {
            targetJid = m.mentionedJid[0];
        }
        // If providing a number
        else if (args.length > 0) {
            // Check for removal keywords first
            if (['none', 'remove', 'delete', 'reset'].includes(args[0]?.toLowerCase())) {
                const groupOwnersPath = path.join(process.cwd(), 'data', 'groupowners.json');
                
                // Read existing owners or create empty object
                let groupOwners = {};
                if (fs.existsSync(groupOwnersPath)) {
                    try {
                        const fileContent = fs.readFileSync(groupOwnersPath, 'utf8');
                        if (fileContent.trim()) {
                            groupOwners = JSON.parse(fileContent);
                        }
                    } catch (err) {
                        console.error('Error reading group owners file:', err);
                        return m.reply('❌ Error reading group owners data. Please try again.');
                    }
                }
                
                // Remove this group from the owners list
                if (groupOwners[m.chat]) {
                    delete groupOwners[m.chat];
                    fs.writeFileSync(groupOwnersPath, JSON.stringify(groupOwners, null, 2));
                    return m.reply('✅ Group owner has been removed. The group will use default ownership.');
                } else {
                    return m.reply('ℹ️ This group doesn\'t have a custom owner set.');
                }
            }
            
            // Clean the phone number format
            let phoneNumber = args[0].replace(/[^0-9]/g, '');
            if (phoneNumber.startsWith('0')) {
                phoneNumber = phoneNumber.substring(1);
            }
            
            if (phoneNumber.length < 10 || phoneNumber.length > 15) {
                return m.reply('⚠️ Invalid phone number format! Please use a valid international format.');
            }
            targetJid = phoneNumber + '@s.whatsapp.net';
        } else {
            return m.reply('⚠️ Please mention a user, reply to their message, or provide their phone number to set as owner.');
        }
        
        try {
            // Path to the group owners file
            const groupOwnersPath = path.join(process.cwd(), 'data', 'groupowners.json');
            
            // Read existing owners or create empty object
            let groupOwners = {};
            if (fs.existsSync(groupOwnersPath)) {
                try {
                    const fileContent = fs.readFileSync(groupOwnersPath, 'utf8');
                    if (fileContent.trim()) {
                        groupOwners = JSON.parse(fileContent);
                    }
                } catch (err) {
                    console.error('Error reading group owners file:', err);
                    return m.reply('❌ Error reading group owners data. Please try again.');
                }
            }
            
            // Create data directory if it doesn't exist
            const dataDir = path.join(process.cwd(), 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            // Set this user as the group owner
            groupOwners[m.chat] = targetJid;
            
            // Save to file
            fs.writeFileSync(groupOwnersPath, JSON.stringify(groupOwners, null, 2));
            
            // Log this action securely
            console.log(`✓ Provider ${senderNumber} set ${targetJid.split('@')[0]} as owner of group ${m.chat}`);
            
            // Send success message
            const targetUser = targetJid.split('@')[0];
            await bot.sendMessage(m.chat, { 
                text: `✅ Successfully set @${targetUser} as the owner of this group.`,
                mentions: [targetJid]
            }, { quoted: m });
            
        } catch (error) {
            console.error('Error in setowner command:', error);
            return m.reply('❌ An error occurred while setting group owner');
        }
    }
};