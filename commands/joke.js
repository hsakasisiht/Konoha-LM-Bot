/**
 * Joke Command for Konoha LM Bot
 * Fetches and sends random jokes from reliable APIs
 */

const https = require('https');
const chalk = require('chalk');

module.exports = {
    name: 'joke',
    aliases: ['jokes', 'funny-joke'],
    category: 'fun',
    description: 'Sends a random joke',
    cooldown: 5, // 5 seconds cooldown to prevent spamming
    
    /**
     * Command execution function
     * @param {Object} bot - The bot client instance
     * @param {Object} m - Message object containing information about the message
     * @param {Array} args - Command arguments
     * @param {String} text - Full command text
     */
    async execute(bot, m, args, text) {
        try {
            // Log command execution
            console.log(chalk.green('😂 JOKE COMMAND EXECUTED'));
            
            // Send initial message and store the message object for editing later
            const sentMsg = await bot.sendMessage(m.chat, { text: '🔍 Finding a funny joke for you...' }, { quoted: m });
            
            // Function to fetch JSON data from API
            const fetchJSON = (url) => {
                return new Promise((resolve, reject) => {
                    https.get(url, (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            try { resolve(JSON.parse(data)); } 
                            catch (e) { reject(e); }
                        });
                        res.on('error', e => reject(e));
                    }).on('error', e => reject(e));
                });
            };
            
            // Try different joke APIs in case one fails
            let jokeText = '';
            let success = false;
            
            // List of joke APIs to try
            const jokeAPIs = [
                {
                    url: 'https://v2.jokeapi.dev/joke/Miscellaneous,Pun,Spooky?blacklistFlags=nsfw,religious,political,racist,sexist,explicit&type=single',
                    parser: (data) => data.joke
                },
                {
                    url: 'https://official-joke-api.appspot.com/random_joke',
                    parser: (data) => `${data.setup}\n\n${data.punchline}`
                },
                {
                    url: 'https://icanhazdadjoke.com/',
                    parser: (data) => data.joke,
                    headers: { 'Accept': 'application/json' }
                }
            ];
            
            // Try each API until we get a successful joke
            for (const api of jokeAPIs) {
                if (success) break;
                
                try {
                    console.log(chalk.cyan(`Trying joke API: ${api.url}`));
                    
                    let data;
                    if (api.headers) {
                        // Special handling for APIs with custom headers
                        data = await new Promise((resolve, reject) => {
                            const options = {
                                headers: api.headers
                            };
                            
                            https.get(api.url, options, (res) => {
                                let rawData = '';
                                res.on('data', chunk => rawData += chunk);
                                res.on('end', () => {
                                    try { resolve(JSON.parse(rawData)); } 
                                    catch (e) { reject(e); }
                                });
                                res.on('error', e => reject(e));
                            }).on('error', e => reject(e));
                        });
                    } else {
                        // Standard API call
                        data = await fetchJSON(api.url);
                    }
                    
                    // Parse the joke from the response
                    jokeText = api.parser(data);
                    
                    if (jokeText && jokeText.length > 0) {
                        console.log(chalk.green('✅ Successfully fetched a joke!'));
                        success = true;
                    }
                } catch (error) {
                    console.log(chalk.yellow(`Failed with this API: ${error.message}`));
                    // Continue to next API
                }
            }
            
            if (success) {
                // Format the joke text
                const formattedJoke = `*Random Joke*\n\n${jokeText}`;
                
                // Edit the initial message with the joke
                await bot.sendMessage(m.chat, { text: formattedJoke, edit: sentMsg.key });
                console.log(chalk.green('✅ Joke sent successfully!'));
            } else {
                console.log(chalk.red('❌ Failed to fetch a joke from any API'));
                // Edit the initial message with error message
                await bot.sendMessage(m.chat, { 
                    text: '❌ Sorry, I couldn\'t find a joke right now. Please try again later!',
                    edit: sentMsg.key 
                });
            }
        } catch (error) {
            console.error(chalk.red(`❌ JOKE COMMAND ERROR: ${error.message}`));
            await m.reply('❌ Something went wrong while sending the joke. Please try again.');
        }
    }
};