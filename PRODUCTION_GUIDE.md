# Production Configuration for Konoha LM Bot

## Environment Variables

Create a `.env` file in your project root:

```env
NODE_ENV=production
BOT_PREFIX=.
BOT_VERSION=1.3.1
LOG_LEVEL=info
MAX_SESSION_FILES=800
SESSION_CLEANUP_INTERVAL=1800000
MEMORY_LIMIT=200
```

## Production Optimizations Implemented

### 1. Session File Management
- **Automatic cleanup**: Removes old session files when count exceeds 800
- **Emergency cleanup**: Triggers at 950 files to prevent crashes
- **Periodic maintenance**: Runs every 30 minutes
- **File rotation**: Keeps only necessary session files

### 2. Memory Management
- **Store optimization**: Periodic cache clearing when memory exceeds 200MB
- **TTL caching**: 10-minute TTL for message retry cache
- **Limited cache size**: Maximum 1000 keys in retry cache
- **History sync disabled**: Prevents memory bloat from old messages

### 3. Logging System
- **Production logger**: Separate log files for different levels
- **Log rotation**: Automatic rotation when files exceed 10MB
- **Console filtering**: Reduced verbose output in production
- **Error tracking**: Comprehensive error logging

### 4. Performance Optimizations
- **Reduced events**: Disabled unnecessary event emissions
- **Optimized reconnection**: Smart reconnection with exponential backoff
- **Resource monitoring**: Memory usage alerts and cleanup
- **Efficient message parsing**: Streamlined message processing

## Production Deployment Steps

### 1. Environment Setup
```bash
# Set production environment
export NODE_ENV=production

# Install PM2 for process management
npm install -g pm2
```

### 2. PM2 Configuration
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'konoha-bot',
    script: 'start.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true
  }]
}
```

### 3. Start Production Bot
```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit

# View logs
pm2 logs konoha-bot
```

## Monitoring Commands

### Session File Monitoring
```bash
# Check session file count
ls -la session/ | wc -l

# Monitor session files in real-time
watch -n 10 'ls -la session/ | wc -l'
```

### Memory Monitoring
```bash
# Check memory usage
pm2 show konoha-bot

# Monitor memory in real-time
watch -n 5 'pm2 show konoha-bot | grep memory'
```

### Log Monitoring
```bash
# View error logs
tail -f logs/error-*.log

# View general logs
tail -f logs/general-*.log

# View PM2 logs
pm2 logs konoha-bot --lines 100
```

## Troubleshooting

### Session File Accumulation
If session files still accumulate rapidly:
1. Check `MAX_SESSION_FILES` in environment
2. Reduce `SESSION_CLEANUP_INTERVAL`
3. Monitor WhatsApp connection stability

### Memory Issues
If memory usage is high:
1. Reduce `MEMORY_LIMIT` threshold
2. Increase cleanup frequency
3. Check for memory leaks in custom commands

### Connection Problems
For frequent disconnections:
1. Check internet stability
2. Verify WhatsApp account status
3. Monitor connection logs

## Performance Metrics

The production optimizations should achieve:
- **Session files**: < 800 files maintained automatically
- **Memory usage**: < 200MB average, < 500MB peak
- **Response time**: < 2 seconds for commands
- **Uptime**: > 99% with proper monitoring

## Security Considerations

1. **File permissions**: Ensure session files are protected
2. **Log security**: Rotate and secure log files
3. **Environment variables**: Use `.env` for sensitive data
4. **Process isolation**: Run bot in isolated environment
