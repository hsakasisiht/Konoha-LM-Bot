/**
 * Analyze Command for Konoha LM Bot
 * Analyzes Excel files to check member performance against targets
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { downloadContentFromMessage } = require('@fizzxydev/baileys-pro');

module.exports = {
    name: 'analyze',
    aliases: ['excel', 'check', 'targets'],
    category: 'admin',
    description: 'Analyzes an Excel file and reports members who did not meet target scores',
    usage: '<reply to Excel file> or attach Excel file with command',
    example: '<reply to Excel file with target=50> or send Excel with caption ".analyze 50"',
    
    /**
     * Command execution function
     * @param {Object} bot - The bot client instance
     * @param {Object} m - Message object containing information about the message
     * @param {Array} args - Command arguments
     * @param {String} text - Full command text
     */
    async execute(bot, m, args, text) {
        try {
            // Start logging the process
            console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
            console.log(chalk.green('📊 EXCEL ANALYSIS PROCESS STARTED'));
            console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
            console.log(chalk.yellow(`User: ${m.pushName || m.sender.split('@')[0]}`));
            console.log(chalk.yellow(`Command: analyze ${args.join(' ')}`));
            console.log(chalk.yellow(`Time: ${new Date().toLocaleString()}`));
            console.log(chalk.blue('───────────────────────────────────────'));

            // Send initial processing message
            const processingMsg = await m.reply('⏳ Processing your request...');

            // Check if current message has a document or if it's a reply
            const isCurrentMessageExcel = m.mtype === 'documentMessage' && 
                ((m.msg.mimetype && m.msg.mimetype.includes('spreadsheetml')) ||
                 (m.msg.fileName && (m.msg.fileName.endsWith('.xlsx') || m.msg.fileName.endsWith('.xls'))));
            
            const isReply = !!(
                m.quoted || 
                (m.message && m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo) ||
                (m.msg && m.msg.contextInfo && m.msg.contextInfo.quotedMessage)
            );
            
            // Check if we have an Excel file to process
            if (!isCurrentMessageExcel && !isReply) {
                await bot.sendMessage(m.chat, { 
                    text: '❌ *Error: No Excel file found*\n\nPlease either:\n1. Reply to an Excel file with `.analyze [target]`\n2. Attach an Excel file with `.analyze [target]` in the caption',
                    edit: processingMsg.key 
                });
                return;
            }

            // Get target score from arguments
            const targetScore = parseInt(args[0]) || 0;
            console.log(chalk.cyan(`Target score set to: ${targetScore}`));

            // Update processing message
            await bot.sendMessage(m.chat, { 
                text: '📥 Downloading Excel file...',
                edit: processingMsg.key 
            });

            // Function to download media
            async function downloadMedia(message) {
                try {
                    const stream = await downloadContentFromMessage(message, 'document');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    return buffer;
                } catch (err) {
                    console.error(chalk.red(`Error downloading media: ${err.message}`));
                    return null;
                }
            }

            // Try to download the Excel file
            let buffer = null;
            
            if (isCurrentMessageExcel) {
                buffer = await downloadMedia(m.msg);
            } else if (isReply && m.quoted) {
                if (m.quoted.mtype === 'documentMessage' && m.quoted.msg) {
                    buffer = await downloadMedia(m.quoted.msg);
                }
            }

            if (!buffer) {
                await bot.sendMessage(m.chat, { 
                    text: '❌ *Error: Could not download Excel file*\n\nPlease make sure the file is accessible and try again.',
                    edit: processingMsg.key 
                });
                return;
            }

            // Update processing message
            await bot.sendMessage(m.chat, { 
                text: '📊 Analyzing Excel data...',
                edit: processingMsg.key 
            });

            // Save temporarily and read Excel file
            const tempDir = path.join(__dirname, '..', 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            const tempPath = path.join(tempDir, `temp_excel_${Date.now()}.xlsx`);
            fs.writeFileSync(tempPath, buffer);

            let workbook;
            try {
                workbook = XLSX.readFile(tempPath, { cellDates: true });
            } catch (error) {
                // Clean up temp file on error
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
                await bot.sendMessage(m.chat, { 
                    text: '❌ *Error: Invalid Excel file*\n\nPlease provide a valid .xlsx or .xls file.',
                    edit: processingMsg.key 
                });
                return;
            }

            // Clean up temp file
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }

            // Get first sheet
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                await bot.sendMessage(m.chat, { 
                    text: '❌ *Error: No sheets found in Excel file*\n\nPlease provide a valid Excel file with data.',
                    edit: processingMsg.key 
                });
                return;
            }
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            if (!worksheet) {
                await bot.sendMessage(m.chat, { 
                    text: '❌ *Error: Could not read worksheet*\n\nPlease provide a valid Excel file.',
                    edit: processingMsg.key 
                });
                return;
            }
            
            const data = XLSX.utils.sheet_to_json(worksheet);

            if (!data || data.length === 0) {
                await bot.sendMessage(m.chat, { 
                    text: '❌ *Error: Empty Excel file*\n\nPlease provide an Excel file with data.',
                    edit: processingMsg.key 
                });
                return;
            }

            // Detect columns
            const columns = Object.keys(data[0] || {});
            if (columns.length === 0) {
                await bot.sendMessage(m.chat, { 
                    text: '❌ *Error: No columns found in Excel file*\n\nPlease check your Excel file format.',
                    edit: processingMsg.key 
                });
                return;
            }
            
            const nameColumn = columns.find(col => 
                col.toLowerCase().includes('name') || 
                col.toLowerCase().includes('member') || 
                col.toLowerCase().includes('participant')
            ) || columns[0];

            const scoreColumn = columns.find(col => 
                col.toLowerCase().includes('score') || 
                col.toLowerCase().includes('points') || 
                col.toLowerCase().includes('marks') ||
                col.toLowerCase().includes('target') ||
                col.toLowerCase().includes('performance')
            ) || columns[1] || columns[0];

            // Find members below target
            const belowTarget = data.filter(row => {
                const score = parseFloat(row[scoreColumn]) || 0;
                return score < targetScore && row[nameColumn];
            });

            // Prepare response message
            let resultMsg = `📊 *TARGET ANALYSIS RESULTS*\n\n`;
            resultMsg += `📌 *Target Score:* ${targetScore}\n`;
            resultMsg += `👥 *Total Members:* ${data.length}\n`;
            resultMsg += `⚠️ *Members Below Target:* ${belowTarget.length}\n\n`;

            if (belowTarget.length === 0) {
                resultMsg += `✅ *Great! All members have met or exceeded the target score.*`;
            } else {
                resultMsg += `*Members who did not meet the target:*\n`;
                belowTarget.forEach((member, index) => {
                    const name = member[nameColumn];
                    const score = parseFloat(member[scoreColumn]) || 0;
                    resultMsg += `${index + 1}. ${name} - ${score}\n`;
                });
            }

            // Send results
            await bot.sendMessage(m.chat, { 
                text: resultMsg,
                edit: processingMsg.key 
            });

            console.log(chalk.green('✅ Analysis completed successfully'));
            console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

        } catch (error) {
            console.error(chalk.red('❌ ERROR IN ANALYZE COMMAND:'));
            console.error(chalk.red(error.stack || error.message));
            
            await m.reply('❌ An error occurred while analyzing the Excel file. Please try again.');
        }
    }
}; 