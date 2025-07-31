/**
 * Bot Testing Script
 * This script tests various components of the bot for potential issues
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.cyan('🧪 Starting Bot Component Tests...\n'));

// Test 1: Check required modules
console.log(chalk.yellow('Test 1: Checking required modules...'));
try {
    require('./settings');
    require('./lib/commandHandler');
    require('./lib/myfunc');
    console.log(chalk.green('✅ All core modules loaded successfully'));
} catch (error) {
    console.log(chalk.red('❌ Module loading failed:'), error.message);
}

// Test 2: Check data directory structure
console.log(chalk.yellow('\nTest 2: Checking data directory structure...'));
const dataDir = path.join(__dirname, 'data');
const requiredFiles = ['owner.json', 'groupbans.json', 'groupfreezes.json', 'warnings.json', 'groupowners.json'];

if (!fs.existsSync(dataDir)) {
    console.log(chalk.red('❌ Data directory does not exist'));
    fs.mkdirSync(dataDir);
    console.log(chalk.green('✅ Created data directory'));
}

requiredFiles.forEach(file => {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
        console.log(chalk.yellow(`⚠️  ${file} does not exist, creating...`));
        fs.writeFileSync(filePath, JSON.stringify(file === 'owner.json' ? [] : {}, null, 2));
        console.log(chalk.green(`✅ Created ${file}`));
    } else {
        console.log(chalk.green(`✅ ${file} exists`));
    }
});

// Test 3: Check commands directory
console.log(chalk.yellow('\nTest 3: Checking commands directory...'));
const commandsDir = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsDir)) {
    console.log(chalk.red('❌ Commands directory does not exist'));
} else {
    const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
    console.log(chalk.green(`✅ Found ${commandFiles.length} command files`));
    
    // Test each command file for syntax errors
    let validCommands = 0;
    commandFiles.forEach(file => {
        try {
            const command = require(path.join(commandsDir, file));
            if (command.name && command.execute) {
                validCommands++;
            } else {
                console.log(chalk.yellow(`⚠️  ${file} is missing name or execute function`));
            }
        } catch (error) {
            console.log(chalk.red(`❌ Error loading ${file}:`, error.message));
        }
    });
    console.log(chalk.green(`✅ ${validCommands} valid commands found`));
}

// Test 4: Check temp directory
console.log(chalk.yellow('\nTest 4: Checking temp directory...'));
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
    console.log(chalk.green('✅ Created temp directory'));
} else {
    console.log(chalk.green('✅ Temp directory exists'));
}

// Test 5: Check package.json dependencies
console.log(chalk.yellow('\nTest 5: Checking package.json...'));
try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const requiredDeps = [
        '@fizzxydev/baileys-pro',
        'axios',
        'chalk',
        'xlsx',
        'awesome-phonenumber',
        'pino'
    ];
    
    requiredDeps.forEach(dep => {
        if (packageJson.dependencies[dep]) {
            console.log(chalk.green(`✅ ${dep} is listed as dependency`));
        } else {
            console.log(chalk.red(`❌ ${dep} is missing from dependencies`));
        }
    });
} catch (error) {
    console.log(chalk.red('❌ Error reading package.json:', error.message));
}

// Test 6: Check session files count
console.log(chalk.yellow('\nTest 6: Checking session files...'));
const sessionDir = path.join(__dirname, 'session');
if (fs.existsSync(sessionDir)) {
    const sessionFiles = fs.readdirSync(sessionDir).filter(file => 
        file.startsWith('pre-key-') || 
        file.startsWith('app-state-sync-key-') ||
        file.startsWith('sender-key-') ||
        file.startsWith('session-')
    );
    
    console.log(chalk.blue(`📁 Found ${sessionFiles.length} session files`));
    
    if (sessionFiles.length > 800) {
        console.log(chalk.red(`⚠️  WARNING: ${sessionFiles.length} session files detected! Consider cleanup.`));
    } else if (sessionFiles.length > 500) {
        console.log(chalk.yellow(`⚠️  ${sessionFiles.length} session files - approaching limit`));
    } else {
        console.log(chalk.green(`✅ Session file count is healthy (${sessionFiles.length}/800)`));
    }
} else {
    console.log(chalk.green('✅ No session directory (clean start)'));
}

// Test 7: Production readiness check
console.log(chalk.yellow('\nTest 7: Production readiness check...'));
const productionFiles = [
    'lib/sessionManager.js',
    'lib/productionLogger.js',
    'ecosystem.config.js',
    'PRODUCTION_GUIDE.md'
];

productionFiles.forEach(file => {
    if (fs.existsSync(path.join(__dirname, file))) {
        console.log(chalk.green(`✅ ${file} exists`));
    } else {
        console.log(chalk.red(`❌ ${file} is missing`));
    }
});

console.log(chalk.cyan('\n🏁 Bot Component Tests Completed!'));
console.log(chalk.green('If all tests passed, your bot should run without issues.'));

// Performance recommendations
console.log(chalk.cyan('\n💡 Production Recommendations:'));
console.log(chalk.yellow('• Set NODE_ENV=production for optimal performance'));
console.log(chalk.yellow('• Use PM2 for process management: pm2 start ecosystem.config.js'));
console.log(chalk.yellow('• Monitor session files regularly'));
console.log(chalk.yellow('• Set up log rotation for production deployment'));
