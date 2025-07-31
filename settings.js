/**
 * Konoha LM Bot Configuration
 */
const fs = require('fs')
const chalk = require('chalk')

// Global settings
global.owner = ['919675893215']  // Replace with your WhatsApp number
global.ownernumber = '919675893215'
global.version = '1.3.1'
global.prefix = '.'
global.botname = 'Konoha LM Bot'
global.wm = 'Konoha LM Bot'
global.welcomeMessage = 'Welcome to the group!'
global.goodbyeMessage = 'Goodbye!'
global.autoAddStatus = true
global.logCommands = true  // Enable command logging in terminal

// Export the settings object
module.exports = {
    owner: global.owner,
    ownernumber: global.ownernumber,
    version: global.version,
    prefix: global.prefix,
    botname: global.botname,
    wm: global.wm,
    welcomeMessage: global.welcomeMessage,
    goodbyeMessage: global.goodbyeMessage,
    autoAddStatus: global.autoAddStatus,
    logCommands: global.logCommands
}

// Watch for file changes to reload settings
let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.yellowBright(`Updated settings: ${__filename}`))
    delete require.cache[file]
    require(file)
})