#!/bin/bash

# Production Startup Script for Konoha LM Bot
# This script ensures proper environment setup and monitoring

echo "🚀 Starting Konoha LM Bot in Production Mode..."

# Set production environment
export NODE_ENV=production

# Create necessary directories
mkdir -p logs
mkdir -p data
mkdir -p temp
mkdir -p session

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi

# Stop any existing instance
pm2 stop konoha-bot 2>/dev/null || true
pm2 delete konoha-bot 2>/dev/null || true

# Clear old logs
rm -f logs/pm2-*.log

# Start the bot with PM2
pm2 start ecosystem.config.js --env production

# Display status
pm2 status

echo "✅ Konoha LM Bot started in production mode!"
echo "📊 Monitor with: pm2 monit"
echo "📝 View logs with: pm2 logs konoha-bot"
echo "🔄 Restart with: pm2 restart konoha-bot"
echo "🛑 Stop with: pm2 stop konoha-bot"
