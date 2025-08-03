/**
 * Google Drive Monitor for Konoha LM Bot
 * Automatically monitors a Google Drive folder and downloads new Excel files
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const logger = require('./productionLogger');

class DriveMonitor {
    constructor() {
        this.drive = null;
        this.auth = null;
        this.monitorInterval = 60000; // Check every minute
        this.watchedFolder = null;
        this.targetGroup = null;
        this.processedFiles = new Set();
        this.isMonitoring = false;
        
        // Load processed files from storage
        this.loadProcessedFiles();
    }

    /**
     * Initialize Google Drive API with service account
     */
    async initialize() {
        try {
            // Check if credentials file exists
            const credentialsPath = path.join(__dirname, '..', 'google-credentials.json');
            if (!fs.existsSync(credentialsPath)) {
                logger.warn('Google credentials file not found. Drive monitoring disabled.');
                return false;
            }

            // Load service account credentials
            const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
            
            this.auth = new google.auth.GoogleAuth({
                credentials: credentials,
                scopes: ['https://www.googleapis.com/auth/drive.readonly']
            });

            this.drive = google.drive({ version: 'v3', auth: this.auth });
            
            logger.success('Google Drive API initialized successfully');
            return true;
        } catch (error) {
            logger.error('Failed to initialize Google Drive API:', error.message);
            return false;
        }
    }

    /**
     * Set the folder to monitor and target group
     */
    setWatchConfig(folderId, groupId) {
        this.watchedFolder = folderId;
        this.targetGroup = groupId;
        
        // Save configuration
        const config = {
            folderId: this.watchedFolder,
            groupId: this.targetGroup,
            lastCheck: Date.now()
        };
        
        fs.writeFileSync(
            path.join(__dirname, '..', 'data', 'drive-config.json'),
            JSON.stringify(config, null, 2)
        );
        
        logger.info(`Drive monitor configured: Folder ${folderId} -> Group ${groupId}`);
    }

    /**
     * Load configuration from file
     */
    loadConfig() {
        try {
            const configPath = path.join(__dirname, '..', 'data', 'drive-config.json');
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                this.watchedFolder = config.folderId;
                this.targetGroup = config.groupId;
                return config;
            }
        } catch (error) {
            logger.error('Error loading drive config:', error.message);
        }
        return null;
    }

    /**
     * Load processed files from storage
     */
    loadProcessedFiles() {
        try {
            const processedPath = path.join(__dirname, '..', 'data', 'processed-files.json');
            if (fs.existsSync(processedPath)) {
                const processed = JSON.parse(fs.readFileSync(processedPath, 'utf8'));
                this.processedFiles = new Set(processed);
            }
        } catch (error) {
            logger.error('Error loading processed files:', error.message);
        }
    }

    /**
     * Save processed files to storage
     */
    saveProcessedFiles() {
        try {
            const processedPath = path.join(__dirname, '..', 'data', 'processed-files.json');
            fs.writeFileSync(
                processedPath,
                JSON.stringify(Array.from(this.processedFiles), null, 2)
            );
        } catch (error) {
            logger.error('Error saving processed files:', error.message);
        }
    }

    /**
     * Check for new Excel files in the monitored folder
     */
    async checkForNewFiles() {
        if (!this.drive || !this.watchedFolder) {
            return [];
        }

        try {
            logger.debug('Checking for new Excel files...');
            
            // Search for Excel files in the folder
            const response = await this.drive.files.list({
                q: `'${this.watchedFolder}' in parents and (mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/vnd.ms-excel') and trashed=false`,
                fields: 'files(id,name,createdTime,modifiedTime,size)',
                orderBy: 'createdTime desc'
            });

            const files = response.data.files || [];
            const newFiles = [];

            for (const file of files) {
                if (!this.processedFiles.has(file.id)) {
                    newFiles.push(file);
                    logger.info(`New Excel file detected: ${file.name}`);
                }
            }

            return newFiles;
        } catch (error) {
            logger.error('Error checking for new files:', error.message);
            return [];
        }
    }

    /**
     * Download a file from Google Drive
     */
    async downloadFile(fileId, fileName) {
        try {
            const tempDir = path.join(__dirname, '..', 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const dest = path.join(tempDir, `drive_${Date.now()}_${fileName}`);
            const destStream = fs.createWriteStream(dest);

            const response = await this.drive.files.get({
                fileId: fileId,
                alt: 'media'
            }, { responseType: 'stream' });

            return new Promise((resolve, reject) => {
                response.data
                    .on('end', () => {
                        logger.success(`Downloaded: ${fileName}`);
                        resolve(dest);
                    })
                    .on('error', reject)
                    .pipe(destStream);
            });
        } catch (error) {
            logger.error(`Error downloading file ${fileName}:`, error.message);
            throw error;
        }
    }

    /**
     * Start monitoring the Drive folder
     */
    async startMonitoring(bot) {
        if (this.isMonitoring) {
            logger.warn('Drive monitoring is already running');
            return;
        }

        const config = this.loadConfig();
        if (!config) {
            logger.warn('No drive monitoring configuration found');
            return;
        }

        const initialized = await this.initialize();
        if (!initialized) {
            logger.error('Failed to initialize Drive monitoring');
            return;
        }

        this.isMonitoring = true;
        logger.success('Started Google Drive monitoring');

        // Start monitoring loop
        const monitorLoop = async () => {
            if (!this.isMonitoring) return;

            try {
                const newFiles = await this.checkForNewFiles();
                
                for (const file of newFiles) {
                    await this.processNewFile(bot, file);
                }
            } catch (error) {
                logger.error('Error in monitoring loop:', error.message);
            }

            // Schedule next check
            setTimeout(monitorLoop, this.monitorInterval);
        };

        // Start the monitoring loop
        setTimeout(monitorLoop, 5000); // Start after 5 seconds
    }

    /**
     * Process a new file
     */
    async processNewFile(bot, file) {
        try {
            logger.info(`Processing new file: ${file.name}`);

            // Download the file
            const filePath = await this.downloadFile(file.id, file.name);

            // Send to target group
            if (this.targetGroup) {
                const fileSize = (parseInt(file.size) / 1024 / 1024).toFixed(2);
                const message = `📊 *New Excel File Detected!*\n\n` +
                               `📁 *File:* ${file.name}\n` +
                               `📏 *Size:* ${fileSize} MB\n` +
                               `🕒 *Created:* ${new Date(file.createdTime).toLocaleString()}\n` +
                               `🔗 *Source:* Google Drive Monitor`;

                // Send the file
                await bot.sendMessage(this.targetGroup, {
                    document: { url: filePath },
                    fileName: file.name,
                    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    caption: message
                });

                logger.success(`Sent ${file.name} to group ${this.targetGroup}`);
            }

            // Mark as processed
            this.processedFiles.add(file.id);
            this.saveProcessedFiles();

            // Clean up downloaded file
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

        } catch (error) {
            logger.error(`Error processing file ${file.name}:`, error.message);
        }
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        this.isMonitoring = false;
        logger.info('Stopped Google Drive monitoring');
    }

    /**
     * Get monitoring status
     */
    getStatus() {
        return {
            isMonitoring: this.isMonitoring,
            watchedFolder: this.watchedFolder,
            targetGroup: this.targetGroup,
            processedFilesCount: this.processedFiles.size,
            monitorInterval: this.monitorInterval
        };
    }

    /**
     * Clear processed files history
     */
    clearProcessedFiles() {
        this.processedFiles.clear();
        this.saveProcessedFiles();
        logger.info('Cleared processed files history');
    }
}

module.exports = DriveMonitor;
