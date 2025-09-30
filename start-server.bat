@echo off
echo Stopping any existing Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

echo Waiting for port to be released...
timeout /t 3 /nobreak >nul

echo Starting Yatri Portal server...
node server.js

pause

