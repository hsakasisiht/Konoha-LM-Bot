/**
 * Meme Command for Konoha LM Bot
 * Fetches and sends random memes from reliable APIs
 * Converts PNG images to JPG for better compatibility
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const sharp = require('sharp'); // Image processing library

module.exports = {
    name: 'meme',
    aliases: ['memes', 'funny'],
    category: 'fun',
    description: 'Sends a random meme',
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
            console.log(chalk.green('🎭 MEME COMMAND EXECUTED'));
            
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
            
            // Function to download image as buffer
            const downloadAsBuffer = (url) => {
                return new Promise((resolve, reject) => {
                    https.get(url, (res) => {
                        if (res.statusCode !== 200) {
                            return reject(new Error(`Failed to download: status ${res.statusCode}`));
                        }
                        
                        const chunks = [];
                        res.on('data', chunk => chunks.push(chunk));
                        res.on('end', () => resolve(Buffer.concat(chunks)));
                        res.on('error', e => reject(e));
                    }).on('error', e => reject(e));
                });
            };
            
            // Try up to 5 times to get a proper meme
            let success = false;
            let attempts = 0;
            
            while (!success && attempts < 5) {
                attempts++;
                console.log(chalk.yellow(`Attempt #${attempts} to get a meme...`));
                
                try {
                    // Use one of these reliable subreddits for memes
                    const subreddits = ['memes', 'wholesomememes', 'dankmemes', 'funny'];
                    const randomSubreddit = subreddits[Math.floor(Math.random() * subreddits.length)];
                    
                    // Use meme API with specified subreddit for better results
                    const apiUrl = `https://meme-api.com/gimme/${randomSubreddit}`;
                    
                    console.log(chalk.cyan(`Fetching from subreddit: r/${randomSubreddit}`));
                    const memeData = await fetchJSON(apiUrl);
                    
                    // Validate meme data
                    if (!memeData || !memeData.url) {
                        console.log(chalk.red(`No valid meme URL found in API response`));
                        continue; // Try again
                    }
                    
                    const memeUrl = memeData.url;
                    const title = memeData.title || 'Random Meme';
                    const subreddit = memeData.subreddit || randomSubreddit;
                    
                    // Allow both JPG and PNG formats
                    if (!/\.(jpg|jpeg|png)$/i.test(memeUrl)) {
                        console.log(chalk.yellow(`Skipping non-image file: ${memeUrl}`));
                        continue; // Try again
                    }
                    
                    console.log(chalk.green(`✅ Found valid meme: ${memeUrl}`));
                    
                    // Download meme directly as buffer
                    console.log(chalk.cyan(`Downloading meme...`));
                    const imageBuffer = await downloadAsBuffer(memeUrl);
                    
                    if (!imageBuffer || imageBuffer.length < 1000) {
                        console.log(chalk.red(`Downloaded image is too small or empty: ${imageBuffer?.length || 0} bytes`));
                        continue; // Try again
                    }
                    
                    console.log(chalk.green(`✅ Downloaded meme: ${imageBuffer.length} bytes`));
                    
                    // Create temp directory if it doesn't exist
                    const tempDir = path.join(__dirname, '..', 'temp');
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                    }
                    
                    // Check if the image is PNG
                    const isPng = memeUrl.toLowerCase().endsWith('png');
                    const jpgFilePath = path.join(tempDir, `meme_${Date.now()}.jpg`);
                    
                    let finalImageBuffer;
                    
                    if (isPng) {
                        console.log(chalk.cyan('Converting PNG image to JPG format...'));
                        try {
                            // Convert PNG to JPG using sharp
                            finalImageBuffer = await sharp(imageBuffer)
                                .jpeg({ quality: 90 })
                                .toBuffer();
                            
                            // Save the converted JPG
                            fs.writeFileSync(jpgFilePath, finalImageBuffer);
                            console.log(chalk.green('✅ Successfully converted PNG to JPG'));
                        } catch (conversionError) {
                            console.error(chalk.red(`PNG conversion error: ${conversionError.message}`));
                            // If conversion fails, use original image as fallback
                            fs.writeFileSync(jpgFilePath, imageBuffer);
                            finalImageBuffer = imageBuffer;
                        }
                    } else {
                        // It's already a JPG, no conversion needed
                        fs.writeFileSync(jpgFilePath, imageBuffer);
                        finalImageBuffer = imageBuffer;
                    }
                    
                    // Send the meme directly (not editing any previous message)
                    const caption = `*${title}*`;
                    
                    await bot.sendMessage(m.chat, {
                        image: { url: jpgFilePath },
                        caption: caption,
                        mimetype: 'image/jpeg'
                    }, { quoted: m });
                    
                    console.log(chalk.green('✅ Meme sent successfully!'));
                    
                    // Clean up after 5 seconds
                    setTimeout(() => {
                        try {
                            if (fs.existsSync(jpgFilePath)) {
                                fs.unlinkSync(jpgFilePath);
                                console.log(chalk.green(`Cleaned up temporary file: ${jpgFilePath}`));
                            }
                        } catch (err) {
                            console.error(chalk.red(`Failed to delete temp file: ${err.message}`));
                        }
                    }, 5000);
                    
                    success = true;
                    
                } catch (error) {
                    console.log(chalk.red(`Error in attempt #${attempts}: ${error.message}`));
                    // Continue to next attempt
                }
            }
            
            if (!success) {
                console.log(chalk.red(`Failed to find a suitable meme after ${attempts} attempts`));
                await m.reply('❌ Sorry, I had trouble finding a meme. Please try again later.');
            }
            
        } catch (error) {
            console.error(chalk.red(`❌ MEME COMMAND ERROR: ${error.message}`));
            await m.reply('❌ Something went wrong while sending the meme. Please try again.');
        }
    }
};