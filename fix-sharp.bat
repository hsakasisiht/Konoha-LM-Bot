@echo off
echo ========================================
echo Konoha LM Bot - Sharp Module Fix Utility
echo ========================================
echo This script will create a fix-sharp.sh file that you need to run in your Pterodactyl panel.
echo.

echo Creating fix-sharp.sh file...
(
echo #!/bin/bash
echo echo "=========================================="
echo echo "Konoha LM Bot - Installing Sharp for Linux"
echo echo "=========================================="
echo echo ""
echo.
echo # Remove existing sharp module
echo echo "Removing existing sharp installation..."
echo rm -rf node_modules/sharp
echo.
echo # Install sharp with specific platform settings
echo echo "Installing sharp specifically for Linux Musl architecture..."
echo npm install --platform=linuxmusl --arch=x64 sharp@0.32.6
echo.
echo echo ""
echo echo "Installation complete! Try starting your bot now."
echo echo ""
) > fix-sharp.sh

echo.
echo File "fix-sharp.sh" created successfully!
echo.
echo INSTRUCTIONS:
echo 1. Upload this "fix-sharp.sh" file to your Pterodactyl server
echo 2. In your Pterodactyl panel, run these commands:
echo    chmod +x fix-sharp.sh
echo    ./fix-sharp.sh
echo.
echo This will reinstall the sharp module specifically for your Linux environment.
echo.
pause