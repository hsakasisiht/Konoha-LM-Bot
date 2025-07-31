/**
 * Konoha LM Bot v1.3.1
 * Entry point for containerized environments
 * 
 * This file acts as a bridge to the main index.js file
 * Useful for deployments on hosting platforms
 */

console.log('Starting Konoha LM Bot via start.js...');

// Import the auto-fix Sharp module function
const checkAndFixSharp = require('./auto-fix-sharp');

// Run the Sharp module fix and then start the bot
(async () => {
    try {
        console.log('🔧 Pre-startup check: Verifying Sharp module installation...');
        await checkAndFixSharp();
        
        console.log('🚀 Starting Konoha LM Bot...');
        // Start the bot by requiring the main index.js file
        require('./index.js');
    } catch (error) {
        console.error('❌ Error during startup:', error);
        process.exit(1);
    }
})();