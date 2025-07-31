@echo off
REM Production Startup Script for Konoha LM Bot (Windows)
REM This script ensures proper environment setup and monitoring

echo 🚀 Starting Konoha LM Bot in Production Mode...

REM Set production environment
set NODE_ENV=production

REM Create necessary directories
if not exist "logs" mkdir logs
if not exist "data" mkdir data
if not exist "temp" mkdir temp
if not exist "session" mkdir session

REM Check if PM2 is installed
npm list -g pm2 >nul 2>&1
if errorlevel 1 (
    echo ❌ PM2 is not installed. Installing PM2...
    npm install -g pm2
)

REM Stop any existing instance
pm2 stop konoha-bot >nul 2>&1
pm2 delete konoha-bot >nul 2>&1

REM Clear old logs
if exist "logs\pm2-*.log" del "logs\pm2-*.log"

REM Start the bot with PM2
pm2 start ecosystem.config.js --env production

REM Display status
pm2 status

echo ✅ Konoha LM Bot started in production mode!
echo 📊 Monitor with: pm2 monit
echo 📝 View logs with: pm2 logs konoha-bot
echo 🔄 Restart with: pm2 restart konoha-bot
echo 🛑 Stop with: pm2 stop konoha-bot

pause
