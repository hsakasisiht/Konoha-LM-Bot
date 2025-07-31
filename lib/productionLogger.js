/**
 * Production Logger for Konoha LM Bot
 * Optimized logging for production environments
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class ProductionLogger {
    constructor() {
        this.logDir = path.join(__dirname, '..', 'logs');
        this.ensureLogDirectory();
        this.maxLogSize = 10 * 1024 * 1024; // 10MB
        this.maxLogFiles = 5;
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    getCurrentLogFile(type = 'general') {
        const today = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `${type}-${today}.log`);
    }

    rotateLogIfNeeded(logFile) {
        if (fs.existsSync(logFile)) {
            const stats = fs.statSync(logFile);
            if (stats.size > this.maxLogSize) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const rotatedFile = logFile.replace('.log', `-${timestamp}.log`);
                fs.renameSync(logFile, rotatedFile);
                this.cleanOldLogs(path.dirname(logFile));
            }
        }
    }

    cleanOldLogs(dir) {
        try {
            const files = fs.readdirSync(dir)
                .filter(file => file.endsWith('.log'))
                .map(file => ({
                    name: file,
                    path: path.join(dir, file),
                    mtime: fs.statSync(path.join(dir, file)).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime);

            if (files.length > this.maxLogFiles) {
                files.slice(this.maxLogFiles).forEach(file => {
                    fs.unlinkSync(file.path);
                });
            }
        } catch (error) {
            console.error('Error cleaning old logs:', error.message);
        }
    }

    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...(data && { data })
        };

        // Console output with colors
        const colorMap = {
            'info': chalk.blue,
            'warn': chalk.yellow,
            'error': chalk.red,
            'success': chalk.green,
            'debug': chalk.gray
        };

        const colorFn = colorMap[level] || chalk.white;
        if (level !== 'debug' || process.env.NODE_ENV === 'development') {
            console.log(colorFn(`[${timestamp}] ${level.toUpperCase()}: ${message}`));
        }

        // File logging (only for important levels in production)
        if (['error', 'warn', 'info'].includes(level)) {
            const logFile = this.getCurrentLogFile(level);
            this.rotateLogIfNeeded(logFile);
            
            try {
                fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
            } catch (error) {
                console.error('Failed to write to log file:', error.message);
            }
        }
    }

    info(message, data) { this.log('info', message, data); }
    warn(message, data) { this.log('warn', message, data); }
    error(message, data) { this.log('error', message, data); }
    success(message, data) { this.log('success', message, data); }
    debug(message, data) { this.log('debug', message, data); }
}

module.exports = new ProductionLogger();
