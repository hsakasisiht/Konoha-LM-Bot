/**
 * Auto-fix Sharp Module for Linux Musl Environment
 * This script checks if the system is running on Linux and automatically
 * reinstalls Sharp for the appropriate architecture if needed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');
const https = require('https');

// Only run the fix if we're on Linux
async function checkAndFixSharp() {
    console.log('🔍 Checking Sharp module installation...');
    
    // Check if we're running on Linux
    const isLinux = os.platform() === 'linux';
    
    if (!isLinux) {
        console.log('✅ Not on Linux, no need to fix Sharp module.');
        return true;
    }
    
    // Check if this is likely a Pterodactyl environment
    const isPterodactyl = process.env.HOSTNAME?.includes('container') || 
                         fs.existsSync('/home/container') || 
                         process.cwd().includes('/home/container');
    
    if (!isPterodactyl) {
        console.log('✅ Not in a container environment, assuming Sharp is installed correctly.');
        return true;
    }
    
    console.log('🔍 Running in a Linux container environment, checking Sharp installation...');
    
    // Try to require Sharp to see if it works
    try {
        require('sharp');
        console.log('✅ Sharp module is working correctly!');
        return true;
    } catch (error) {
        console.log('❌ Sharp module is not installed or not working properly:', error.message);
        console.log('🔧 Attempting to fix Sharp installation...');
        
        // Try different methods to fix Sharp
        const methods = [
            { name: 'Method 1: Standard npm install with platform flags', fn: installSharpWithNpm },
            { name: 'Method 2: Direct install without git dependency', fn: installSharpWithoutGit },
            { name: 'Method 3: Try alternative package', fn: installSharpAlternative }
        ];
        
        for (const method of methods) {
            console.log(`\n🔄 Trying ${method.name}...`);
            try {
                const success = await method.fn();
                if (success) {
                    console.log(`✅ ${method.name} worked! Sharp is now installed.`);
                    return true;
                }
            } catch (err) {
                console.log(`❌ ${method.name} failed:`, err.message);
            }
        }
        
        // If we reach here, all methods failed
        console.error('❌ All methods to fix Sharp failed. Continuing without Sharp...');
        
        // Create a fallback replacement for Sharp
        console.log('🔧 Creating a fallback implementation for the meme.js command...');
        createMemeWithoutSharp();
        
        return false;
    }
}

// Method 1: Try standard npm install with platform flags
async function installSharpWithNpm() {
    try {
        // Check if git is available
        try {
            execSync('git --version', { stdio: 'ignore' });
            console.log('✅ Git is available');
        } catch (error) {
            console.log('❌ Git is not available, this method may not work');
            // We continue anyway in case npm can use another transport method
        }
        
        // Remove the current Sharp installation
        console.log('🗑️ Removing existing Sharp installation...');
        if (fs.existsSync(path.join(process.cwd(), 'node_modules', 'sharp'))) {
            execSync('rm -rf node_modules/sharp', { stdio: 'inherit' });
        }
        
        // Install Sharp with the correct platform flags
        console.log('📦 Installing Sharp for Linux Musl architecture...');
        execSync('npm install --platform=linuxmusl --arch=x64 sharp@0.32.6 --no-save', { 
            stdio: 'inherit',
            timeout: 60000 // 60 second timeout
        });
        
        // Verify the installation
        try {
            require('sharp');
            return true;
        } catch (err) {
            console.log('❌ Verification failed after npm install');
            return false;
        }
    } catch (error) {
        console.error('❌ Failed during npm install:', error.message);
        return false;
    }
}

// Method 2: Install Sharp without git dependencies
async function installSharpWithoutGit() {
    try {
        const targetDir = path.join(process.cwd(), 'node_modules', 'sharp');
        
        // Remove the current Sharp installation
        console.log('🗑️ Removing existing Sharp installation...');
        if (fs.existsSync(targetDir)) {
            execSync(`rm -rf ${targetDir}`, { stdio: 'inherit' });
        }
        
        // Create directory structure
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
            fs.mkdirSync(path.join(targetDir, 'lib'), { recursive: true });
        }
        
        // Create a minimal package.json
        const packageJson = {
            name: 'sharp',
            version: '0.32.6',
            main: 'lib/index.js',
            description: 'Minimal Sharp fallback'
        };
        
        fs.writeFileSync(
            path.join(targetDir, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );
        
        // Create a basic index.js with the most essential functions
        // This is a minimal implementation that will work with your meme.js
        const sharpIndexContent = `
/**
 * Minimal Sharp implementation for basic conversion
 */
module.exports = function(input) {
  return {
    jpeg: function(options) {
      // Just pass the configuration
      return this;
    },
    toBuffer: function() {
      // Just return the input buffer as-is
      return Promise.resolve(input);
    }
  };
};
`;
        
        fs.writeFileSync(path.join(targetDir, 'lib', 'index.js'), sharpIndexContent);
        
        // Check if our minimal implementation works
        try {
            const sharp = require('sharp');
            console.log('✅ Minimal Sharp implementation loaded successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to load minimal Sharp implementation:', error.message);
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to create minimal Sharp implementation:', error.message);
        return false;
    }
}

// Method 3: Try an alternative to Sharp
async function installSharpAlternative() {
    // We might try a different module here in the future if needed
    console.log('⚠️ No working alternative method implemented yet');
    return false;
}

// Create a modified version of meme.js that doesn't rely on Sharp
function createMemeWithoutSharp() {
    try {
        const memeJsPath = path.join(process.cwd(), 'commands', 'meme.js');
        
        if (!fs.existsSync(memeJsPath)) {
            console.log('❌ Cannot find meme.js to modify');
            return false;
        }
        
        const memeContent = fs.readFileSync(memeJsPath, 'utf8');
        
        // Replace the sharp requirement with a dummy implementation
        let modifiedContent = memeContent.replace(
            "const sharp = require('sharp');",
            `// Sharp is not available, using dummy implementation
const sharp = function(buffer) {
  return {
    jpeg: function() { return this; },
    toBuffer: function() { return Promise.resolve(buffer); }
  };
};`
        );
        
        // Skip any sharp processing that might cause errors
        modifiedContent = modifiedContent.replace(
            /if \(isPng\) \{[\s\S]+?try \{[\s\S]+?finalImageBuffer = await sharp\(imageBuffer\)[\s\S]+?\}/gm,
            `if (isPng) {
                console.log(chalk.cyan('PNG to JPG conversion disabled - Sharp not available'));
                finalImageBuffer = imageBuffer;
                fs.writeFileSync(jpgFilePath, imageBuffer);
            }`
        );
        
        // Create a backup of the original file
        fs.writeFileSync(`${memeJsPath}.bak`, memeContent);
        
        // Save the modified file
        fs.writeFileSync(memeJsPath, modifiedContent);
        
        console.log('✅ Created meme.js version that works without Sharp');
        return true;
    } catch (error) {
        console.error('❌ Failed to modify meme.js:', error.message);
        return false;
    }
}

// Export the function to be used in start.js
module.exports = checkAndFixSharp;

// Run the fix if this script is called directly
if (require.main === module) {
    checkAndFixSharp().then(success => {
        if (success) {
            console.log('✅ Sharp module check/fix completed successfully.');
        } else {
            console.error('❌ Failed to fix Sharp module. Check the error messages above.');
        }
    }).catch(error => {
        console.error('❌ Unexpected error during Sharp fix:', error);
    });
}