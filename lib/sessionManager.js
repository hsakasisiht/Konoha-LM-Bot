/**
 * Production-Optimized Session Manager for Konoha LM Bot
 * Handles session cleanup and prevents file accumulation
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class SessionManager {
    constructor(sessionPath = './session') {
        this.sessionPath = sessionPath;
        this.maxFiles = 800; // Keep files under 1000 to prevent crashes
        this.cleanupInterval = 30 * 60 * 1000; // 30 minutes
        this.lastCleanup = Date.now();
        
        // Ensure session directory exists
        if (!fs.existsSync(this.sessionPath)) {
            fs.mkdirSync(this.sessionPath, { recursive: true });
        }
        
        // Start periodic cleanup
        this.startPeriodicCleanup();
    }

    /**
     * Clean up old session files to prevent accumulation
     */
    async cleanupSessionFiles() {
        try {
            const files = fs.readdirSync(this.sessionPath);
            const sessionFiles = files.filter(file => 
                file.startsWith('pre-key-') || 
                file.startsWith('app-state-sync-key-') ||
                file.startsWith('sender-key-') ||
                file.startsWith('session-')
            );

            console.log(chalk.blue(`📁 Session cleanup: Found ${sessionFiles.length} session files`));

            if (sessionFiles.length > this.maxFiles) {
                // Sort files by modification time (oldest first)
                const fileStats = sessionFiles.map(file => {
                    const filePath = path.join(this.sessionPath, file);
                    const stats = fs.statSync(filePath);
                    return { file, mtime: stats.mtime, path: filePath };
                }).sort((a, b) => a.mtime - b.mtime);

                // Remove oldest files to get under the limit
                const filesToRemove = fileStats.slice(0, sessionFiles.length - this.maxFiles + 100);
                
                for (const fileInfo of filesToRemove) {
                    try {
                        fs.unlinkSync(fileInfo.path);
                        console.log(chalk.yellow(`🗑️  Removed old session file: ${fileInfo.file}`));
                    } catch (err) {
                        console.log(chalk.red(`❌ Failed to remove ${fileInfo.file}: ${err.message}`));
                    }
                }

                console.log(chalk.green(`✅ Session cleanup completed. Removed ${filesToRemove.length} old files`));
            } else {
                console.log(chalk.green(`✅ Session files under limit (${sessionFiles.length}/${this.maxFiles})`));
            }

            this.lastCleanup = Date.now();
        } catch (error) {
            console.error(chalk.red('❌ Error during session cleanup:'), error.message);
        }
    }

    /**
     * Start periodic cleanup process
     */
    startPeriodicCleanup() {
        setInterval(() => {
            this.cleanupSessionFiles();
        }, this.cleanupInterval);

        // Run initial cleanup after 5 minutes
        setTimeout(() => {
            this.cleanupSessionFiles();
        }, 5 * 60 * 1000);
    }

    /**
     * Get session file count for monitoring
     */
    getSessionFileCount() {
        try {
            const files = fs.readdirSync(this.sessionPath);
            return files.filter(file => 
                file.startsWith('pre-key-') || 
                file.startsWith('app-state-sync-key-') ||
                file.startsWith('sender-key-') ||
                file.startsWith('session-')
            ).length;
        } catch (error) {
            console.error('Error counting session files:', error.message);
            return 0;
        }
    }

    /**
     * Emergency cleanup if files exceed critical limit
     */
    async emergencyCleanup() {
        const fileCount = this.getSessionFileCount();
        if (fileCount > 950) {
            console.log(chalk.red(`🚨 EMERGENCY: ${fileCount} session files detected! Performing emergency cleanup...`));
            await this.cleanupSessionFiles();
            return true;
        }
        return false;
    }
}

module.exports = SessionManager;
