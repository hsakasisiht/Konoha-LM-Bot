# Konoha LM Bot

A production-ready WhatsApp bot built with Baileys Pro, featuring advanced session management, Excel analysis capabilities, Google Drive integration, and comprehensive group administration tools.

## 🚀 Features

- **Google Drive Integration** - Automatic monitoring and downloading of Excel files from shared folders
- **Advanced Session Management** - Prevents crashes from session file accumulation
- **Excel Analysis** - Smart Excel file processing with target score analysis
- **Group Administration** - Ban, warn, kick, freeze features with admin controls
- **Production Ready** - PM2 integration, logging, and monitoring
- **Auto-cleanup** - Automatic maintenance of session files and memory
- **Command System** - Modular command structure with cooldowns and aliases
- **Real-time Monitoring** - Automatic file detection and forwarding to WhatsApp groups

## 📋 Requirements

- Node.js 16+ 
- NPM or Yarn
- WhatsApp account for linking
- Google Cloud Project (for Drive integration)

## 🛠️ Installation

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd konoha-bot-lm
   npm install
   ```

2. **Configuration**
   - Edit `settings.js` with your phone number
   - Update bot name and prefix as needed

3. **Google Drive Setup (Optional)**
   - Follow the detailed setup guide in `DRIVE_SETUP.md`
   - Create Google Cloud Project and Service Account
   - Place `google-credentials.json` in the root directory

4. **Test Installation**
   ```bash
   node test-bot.js
   ```

## 🚀 Running the Bot

### Development Mode
```bash
npm start
```

### Production Mode
```bash
# Windows
start-production.bat

# Linux/Mac  
bash start-production.sh

# Manual PM2
npm install -g pm2
pm2 start ecosystem.config.js --env production
```

## 📊 Commands

### Admin Commands
- `.ban` - Ban users from group (auto-kick on rejoin)
- `.warn` - Warning system (3 strikes = kick)
- `.kick` - Remove users from group
- `.freeze` - Temporarily disable bot in group
- `.analyze` - Excel file analysis with target scores
- `.tagall` - Mention all group members

### Utility Commands
- `.ping` - Check bot response time
- `.help` - Show command list
- `.groupinfo` - Display group statistics
- `.joke` - Random jokes
- `.meme` - Meme generation

## 🔧 Production Features

### Session Management
- **Automatic cleanup** of old session files
- **Emergency protection** prevents crashes at high file counts
- **Real-time monitoring** of session file accumulation

### Performance Optimization
- **Memory management** with automatic cache clearing
- **Reduced event emissions** for better performance
- **Smart reconnection** with exponential backoff
- **Resource monitoring** and alerts

### Logging & Monitoring
- **Professional logging** with file rotation
- **PM2 integration** for process management
- **Error tracking** and performance metrics
- **Real-time monitoring** capabilities

## 📁 Project Structure

```
konoha-bot-lm/
├── commands/           # Bot commands
│   ├── drivesetup.js   # Google Drive configuration
│   ├── drivestart.js   # Start Drive monitoring
│   ├── drivestop.js    # Stop Drive monitoring
│   ├── drivestatus.js  # Check Drive status
│   └── driveclear.js   # Clear processed files
├── data/              # Bot data storage
├── lib/               # Core libraries
│   ├── sessionManager.js
│   ├── productionLogger.js
│   ├── commandHandler.js
│   └── driveMonitor.js # Google Drive monitoring
├── logs/              # Application logs
├── session/           # WhatsApp session files
├── temp/              # Temporary files
├── index.js           # Main bot file
├── settings.js        # Configuration
├── ecosystem.config.js # PM2 configuration
├── DRIVE_SETUP.md     # Google Drive setup guide
└── google-credentials.json.template # Credentials template
```

## 🔄 Google Drive Integration

### Features
- **Automatic monitoring** of shared Google Drive folders
- **Excel file detection** (.xlsx, .xls formats)
- **Real-time downloading** and forwarding to WhatsApp groups
- **Duplicate prevention** with processed file tracking
- **Configurable intervals** (default: 1 minute checks)

### Commands
- `!drivesetup <folder_id> <group_id>` - Configure monitoring
- `!drivestart` - Start monitoring
- `!drivestop` - Stop monitoring  
- `!drivestatus` - Check status and statistics
- `!driveclear confirm` - Reset processed files
- `!getgroupid` - Get current group ID (for Drive setup)
- `!chatid` - Get current chat ID (works in groups and private chats)

### Setup Guide
See `DRIVE_SETUP.md` for detailed Google Cloud and service account configuration instructions.

## 🔒 Security Features

- **Admin validation** for sensitive commands
- **Permission checks** before command execution
- **Input sanitization** and validation
- **Session protection** and cleanup

## 📈 Monitoring

### PM2 Commands
```bash
pm2 status              # Check bot status
pm2 logs konoha-bot     # View logs
pm2 monit               # Real-time monitoring
pm2 restart konoha-bot  # Restart bot
pm2 stop konoha-bot     # Stop bot
```

### Health Checks
```bash
node test-bot.js        # Run component tests
```

## 🛡️ Troubleshooting

### Session File Issues
The bot automatically manages session files, but if needed:
- Files are cleaned when count exceeds 800
- Emergency cleanup triggers at 950 files
- Manual cleanup: delete old files in `session/` folder

### Memory Issues
- Bot automatically clears cache when memory > 200MB
- Check memory usage: `pm2 show konoha-bot`
- Restart if needed: `pm2 restart konoha-bot`

### Connection Problems
- Check internet connection
- Verify WhatsApp account status
- Review logs: `pm2 logs konoha-bot`

## 📝 Configuration

### Environment Variables
Create `.env` file:
```env
NODE_ENV=production
BOT_PREFIX=.
MAX_SESSION_FILES=800
MEMORY_LIMIT=200
```

### Settings
Edit `settings.js`:
- `global.owner` - Your WhatsApp number
- `global.prefix` - Command prefix
- `global.botname` - Bot display name

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Support

For issues and support:
- Check logs: `pm2 logs konoha-bot`
- Run tests: `node test-bot.js`
- Review documentation in `PRODUCTION_GUIDE.md`

---

**Built with ❤️ for reliable WhatsApp automation**
