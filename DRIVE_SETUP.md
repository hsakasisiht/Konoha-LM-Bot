# Google Drive Integration Setup Guide

This guide will help you set up automatic Google Drive monitoring for your Konoha LM Bot.

## Prerequisites

1. **Google Cloud Project**: You need a Google Cloud Project with Drive API enabled
2. **Service Account**: A service account with credentials for API access
3. **Google Drive Folder**: A shared folder that the bot will monitor
4. **WhatsApp Destination**: A target group or private chat where files will be sent

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click on it and press "Enable"

## Step 2: Create Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details:
   - Name: `konoha-bot-drive`
   - Description: `Service account for Konoha LM Bot Drive monitoring`
4. Click "Create and Continue"
5. Skip role assignment (click "Continue")
6. Click "Done"

## Step 3: Generate Credentials

1. In the Credentials page, find your service account
2. Click on the service account email
3. Go to the "Keys" tab
4. Click "Add Key" > "Create New Key"
5. Select "JSON" format
6. Click "Create"
7. Download the JSON file
8. Rename it to `google-credentials.json`
9. Place it in your bot's root directory (same folder as index.js)

## Step 4: Setup Google Drive Folder

1. Create or choose a folder in Google Drive
2. Right-click the folder and select "Share"
3. Add the service account email (found in the credentials JSON file)
4. Give it "Viewer" permissions
5. Copy the folder ID from the URL:
   - URL format: `https://drive.google.com/drive/folders/[FOLDER_ID]`
   - Copy the part after `/folders/`

## Step 5: Configure Bot

1. Start your bot and ensure it's connected to WhatsApp
2. Use the bot owner commands to configure Drive monitoring:

```
!drivesetup <folder_id> <destination_id>
```

**Examples:**

*For WhatsApp Group:*
```
!drivesetup 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs87 120363123456789012@g.us
```

*For Private Chat:*
```
!drivesetup 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs87 919675893215@s.whatsapp.net
```

## Getting Chat IDs

### For WhatsApp Groups:

**Option 1: Use the getgroupid command (recommended)**
1. Go to the target group where you want to receive Drive files
2. Send the command: `!getgroupid`
3. The bot will display the group information including the Group ID
4. Copy the Group ID for use in the drivesetup command

**Option 2: Use the chatid command**
1. In the group, send: `!chatid`
2. This will show the current group ID
3. Copy the Group ID for use in the drivesetup command

**Option 3: Manual method**
1. Go to the target group
2. Send any message with the bot owner account
3. Use the `!groupinfo` command to see the group ID

### For Private Chats:

1. In your private chat with the bot, send: `!chatid`
2. Bot will respond with your private chat ID
3. Copy the Chat ID for use in the drivesetup command

**Chat ID Formats:**
- **Group ID:** `120363123456789012@g.us`
- **Private Chat ID:** `919675893215@s.whatsapp.net`

## Step 6: Start Monitoring

After configuration, start the monitoring:

```
!drivestart
```

## Available Commands

### Drive Monitoring Commands
- `!drivesetup <folder_id> <destination_id>` - Configure monitoring (groups or private chats)
- `!drivestart` - Start monitoring
- `!drivestop` - Stop monitoring
- `!drivestatus` - Check status and statistics
- `!driveclear confirm` - Clear processed files history

### Utility Commands
- `!getgroupid` - Get current group ID and information (group only)
- `!chatid` - Get current chat ID (works in groups and private chats)
- `!groupinfo` - Get detailed group information (owner only)

## How It Works

1. **Monitoring**: Bot checks the Google Drive folder every minute
2. **Detection**: Identifies new Excel files (.xlsx, .xls)
3. **Download**: Downloads new files to temporary storage
4. **Notification**: Sends file to configured WhatsApp group with details
5. **Cleanup**: Removes temporary files and tracks processed files

## File Types Supported

- Microsoft Excel (.xlsx)
- Excel 97-2003 (.xls)
- OpenDocument Spreadsheet (.ods) - if added to filter

## Security Notes

1. **Credentials**: Keep `google-credentials.json` secure and never share it
2. **Permissions**: Service account only needs "Viewer" access to Drive folders
3. **Exclusions**: The credentials file is automatically excluded from git
4. **Isolation**: Each bot instance uses separate processed file tracking

## Troubleshooting

### "API Error" or "Connection Failed"
- Check if Google Drive API is enabled
- Verify credentials file exists and is valid
- Ensure service account has access to the folder

### "Folder Access Error"
- Verify folder ID is correct
- Check if folder is shared with service account email
- Ensure folder exists and is not deleted

### "No New Files Detected"
- Check if files are actually new (not processed before)
- Verify file types are Excel (.xlsx, .xls)
- Use `!driveclear confirm` to reset processed files if needed

### "Bot Not Sending Files"
- Verify target group ID is correct
- Check if bot has permission to send files in the group
- Monitor logs for specific error messages

## Advanced Configuration

### Change Check Interval
Edit `lib/driveMonitor.js` and modify:
```javascript
this.monitorInterval = 60000; // 60 seconds (default)
```

### Add More File Types
Modify the MIME type filter in `checkForNewFiles()` method:
```javascript
q: `'${this.watchedFolder}' in parents and (mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/vnd.ms-excel' or mimeType='application/vnd.oasis.opendocument.spreadsheet') and trashed=false`
```

### Multiple Folders
Currently supports one folder per bot instance. For multiple folders, deploy separate bot instances or modify the code to handle multiple configurations.

## Support

If you encounter issues:
1. Check bot logs for detailed error messages
2. Verify all setup steps are completed correctly
3. Test with a simple Excel file upload to the monitored folder
4. Use `!drivestatus` to check current configuration and API connectivity

---

**Note**: This feature requires active internet connection and proper Google Cloud API setup. Monitor your Google Cloud usage to avoid unexpected charges.
